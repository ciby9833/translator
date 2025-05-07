from typing import List, Optional
import numpy as np
from sentence_transformers import SentenceTransformer
import faiss
import platform
from huggingface_hub import snapshot_download
import os
import torch

class RAGRetriever:
    def __init__(self):
        # 使用新的模型加载方式
        model_name = 'all-mpnet-base-v2'
        try:
            # 首先尝试从缓存加载
            cache_dir = os.path.join(os.path.expanduser("~"), ".cache", "huggingface")
            model_path = os.path.join(cache_dir, model_name)
            
            if not os.path.exists(model_path):
                # 如果缓存不存在，下载模型
                model_path = snapshot_download(
                    repo_id=f"sentence-transformers/{model_name}",
                    cache_dir=cache_dir
                )
            
            self.model = SentenceTransformer(model_path)
            # 确保使用 CPU 进行推理
            self.model.to('cpu')
            
        except Exception as e:
            print(f"Model loading error: {str(e)}")
            raise
            
        self.paper_indices = {}
        self.chunk_size = 512
        self.overlap = 50
        
        # 检查系统架构
        self.is_m1 = platform.processor() == 'arm'
        if self.is_m1:
            print("Running on M1 Mac, using CPU version of FAISS")

    def _create_index(self, dimension: int):
        """创建适合当前系统的索引"""
        if self.is_m1:
            # M1 Mac 使用 CPU 版本
            return faiss.IndexFlatL2(dimension)
        else:
            # 其他系统可以使用 GPU 版本
            return faiss.IndexFlatL2(dimension)

    def _split_text(self, text: str) -> List[str]:
        """将文本分割成重叠的块"""
        words = text.split()
        chunks = []
        for i in range(0, len(words), self.chunk_size - self.overlap):
            chunk = ' '.join(words[i:i + self.chunk_size])
            chunks.append(chunk)
        return chunks

    async def build_index(self, content: str, paper_id: str):
        """构建文档索引"""
        try:
            # 分割文档为块
            chunks = self._split_text(content)
            
            # 生成嵌入向量
            with torch.no_grad():  # 禁用梯度计算
                embeddings = self.model.encode(chunks, convert_to_numpy=True)
            
            # 创建适合当前系统的索引
            dimension = embeddings.shape[1]
            index = self._create_index(dimension)
            
            # 确保数据类型正确
            embeddings = embeddings.astype('float32')
            
            # 添加向量到索引
            index.add(embeddings)
            
            # 存储索引和文档
            self.paper_indices[paper_id] = {
                'index': index,
                'documents': chunks,
                'embeddings': embeddings
            }
            
            print(f"Successfully built index for paper {paper_id} with {len(chunks)} chunks")
            
        except Exception as e:
            print(f"Index building error details: {str(e)}")
            raise Exception(f"Index building error: {str(e)}")

    async def get_relevant_context(self, question: str, paper_id: str) -> str:
        """获取相关上下文"""
        try:
            if paper_id not in self.paper_indices:
                raise Exception(f"Paper ID {paper_id} not found")

            paper_data = self.paper_indices[paper_id]
            index = paper_data['index']
            documents = paper_data['documents']
            
            # 生成问题的嵌入向量
            with torch.no_grad():  # 禁用梯度计算
                question_embedding = self.model.encode([question], convert_to_numpy=True)[0]
            question_embedding = question_embedding.reshape(1, -1).astype('float32')
            
            # 使用 FAISS 进行相似度搜索
            k = min(5, len(documents))
            distances, indices = index.search(question_embedding, k)
            
            # 组合相关段落
            relevant_chunks = [documents[i] for i in indices[0]]
            relevant_context = "\n\n".join([
                f"段落 {i+1}:\n{chunk}" 
                for i, chunk in enumerate(relevant_chunks)
            ])
            
            return relevant_context
            
        except Exception as e:
            print(f"Context retrieval error details: {str(e)}")
            raise Exception(f"Context retrieval error: {str(e)}")
