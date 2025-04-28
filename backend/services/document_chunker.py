# backend/services/document_chunker.py 
# 文档分块器
from typing import List, Optional, Generator, Iterator, AsyncGenerator, Tuple
import re
from math import ceil
import io
from dataclasses import dataclass
import time
from .document_processor import DocumentProcessor
import asyncio

@dataclass
class ProcessingStats:
    total_size: int
    processed_size: int
    chunk_count: int
    estimated_time_remaining: Optional[float]

class DocumentChunker:
    def __init__(self, max_chunk_size: int = 30000):  # Gemini 的上下文窗口约为 30k 字符
        self.max_chunk_size = max_chunk_size
        self.document_processor = DocumentProcessor()
        # 修改分隔符模式，使用固定宽度的 look-behind
        self.sentence_patterns = {
            'general': r'[.。!！?？]\s*',  # 简化模式
            'list': r'\n\s*',             # 简化模式
            'section': r'\n\n+\s*',       # 简化模式
            'technical': r'[;。;；]\s*'    # 简化模式
        }

    def split_by_sentences(self, text: str) -> List[str]:
        """智能分割文本为句子"""
        # 首先按段落分割
        paragraphs = text.split('\n\n')
        sentences = []
        
        for paragraph in paragraphs:
            if not paragraph.strip():
                continue
                
            # 检测是否是列表项
            if re.match(r'^\s*[-*•]\s', paragraph):
                # 按列表项分割
                items = paragraph.split('\n')
                sentences.extend(items)
            else:
                # 使用更简单的分割方法
                for sent in re.split(r'([.。!！?？])\s*', paragraph):
                    if sent.strip():
                        sentences.append(sent.strip())
                        
        return sentences

    def create_chunks(self, text: str, overlap: int = 2) -> List[str]:
        """
        将文本分成多个块，保持上下文连贯性
        overlap: 重叠的句子数，确保上下文连续性
        """
        sentences = self.split_by_sentences(text)
        if not sentences:
            return []

        chunks = []
        current_chunk = []
        current_size = 0

        for i, sentence in enumerate(sentences):
            sentence_size = len(sentence)
            
            # 如果单个句子就超过了最大块大小，需要进一步分割
            if sentence_size > self.max_chunk_size:
                if current_chunk:
                    chunks.append(" ".join(current_chunk))
                    current_chunk = []
                    current_size = 0
                
                # 按字符分割大句子
                sub_chunks = [sentence[j:j + self.max_chunk_size] 
                            for j in range(0, len(sentence), self.max_chunk_size)]
                chunks.extend(sub_chunks)
                continue

            # 检查添加这个句子是否会超过块大小限制
            if current_size + sentence_size > self.max_chunk_size:
                chunks.append(" ".join(current_chunk))
                # 保留最后 overlap 个句子作为下一个块的开始
                current_chunk = current_chunk[-overlap:] if overlap > 0 else []
                current_size = sum(len(s) for s in current_chunk)

            current_chunk.append(sentence)
            current_size += sentence_size

        # 添加最后一个块
        if current_chunk:
            chunks.append(" ".join(current_chunk))

        return chunks

    def merge_results(self, terms_lists: List[List[tuple]]) -> List[tuple]:
        """合并多个块的术语结果，去除重复项"""
        seen_terms = set()
        merged_terms = []

        for terms in terms_lists:
            for source, target in terms:
                # 使用源文本和目标文本的组合作为唯一标识
                term_key = (source.lower(), target.lower())
                if term_key not in seen_terms:
                    seen_terms.add(term_key)
                    merged_terms.append((source, target))

        return merged_terms

    def stream_chunks(self, file_obj: io.IOBase, chunk_size: int = 8192) -> Generator[str, None, None]:
        """流式读取文件并生成文本块"""
        buffer = ""
        
        while True:
            chunk = file_obj.read(chunk_size)
            if not chunk:
                # 处理最后的buffer
                if buffer:
                    yield from self.create_chunks(buffer)
                break
                
            buffer += chunk.decode('utf-8', errors='ignore')
            
            # 找到最后一个完整的句子
            last_sentence_end = max(
                buffer.rfind('.'), buffer.rfind('。'),
                buffer.rfind('!'), buffer.rfind('！'),
                buffer.rfind('?'), buffer.rfind('？')
            )
            
            if last_sentence_end != -1:
                # 处理到最后一个完整句子的文本
                text_to_process = buffer[:last_sentence_end + 1]
                yield from self.create_chunks(text_to_process)
                # 保留剩余的文本到buffer
                buffer = buffer[last_sentence_end + 1:]

    def process_large_file(self, file_path: str) -> Iterator[List[tuple]]:
        """处理大文件的方法"""
        terms_buffer = []
        
        with open(file_path, 'rb') as file:
            for text_chunk in self.stream_chunks(file):
                # 处理每个文本块
                chunk_terms = self.extract_terms_from_chunk(text_chunk)
                terms_buffer.extend(chunk_terms)
                
                # 当累积足够多的术语时，进行一次合并和去重
                if len(terms_buffer) >= 1000:  # 可配置的阈值
                    merged_terms = self.merge_results([terms_buffer])
                    yield merged_terms
                    terms_buffer = []
        
        # 处理剩余的术语
        if terms_buffer:
            yield self.merge_results([terms_buffer])

    async def create_chunks_with_stats(self, text: str) -> AsyncGenerator[Tuple[str, ProcessingStats], None]:
        total_size = len(text)
        processed_size = 0
        chunk_count = 0
        start_time = time.time()

        chunks = self.split_by_sentences(text)
        
        for chunk in chunks:
            if not chunk.strip():
                continue

            chunk_size = len(chunk)
            processed_size += chunk_size
            chunk_count += 1

            # 计算预估剩余时间
            elapsed_time = time.time() - start_time
            if elapsed_time > 0:
                processing_rate = processed_size / elapsed_time
                remaining_size = total_size - processed_size
                estimated_time = remaining_size / processing_rate if processing_rate > 0 else None
            else:
                estimated_time = None

            stats = ProcessingStats(
                total_size=total_size,
                processed_size=processed_size,
                chunk_count=chunk_count,
                estimated_time_remaining=estimated_time
            )

            yield chunk, stats
            await asyncio.sleep(0)  # 让出控制权

    async def process_document(self, file_path: str) -> Iterator[tuple[str, ProcessingStats]]:
        """处理文档并返回分块结果"""
        try:
            # 获取文档元数据
            metadata = self.document_processor.get_document_metadata(file_path)
            
            # 检查文件大小
            if metadata['file_size'] > 100 * 1024 * 1024:  # 100MB
                raise ValueError("File too large")
            
            # 提取文本
            text = self.document_processor.process_file(file_path)
            
            # 使用现有的分块逻辑处理文本
            async for chunk, stats in self.create_chunks_with_stats(text):
                yield chunk, stats, metadata
                
        except Exception as e:
            raise Exception(f"Error processing document: {str(e)}")