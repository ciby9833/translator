1. **文档处理流程**：
```python
# main.py 中的 create_glossary 端点
@app.post("/api/create-glossary")
async def create_glossary(
    file: UploadFile = File(...),
    primary_lang: str = Form(...),
    name: str = Form("Auto Generated Glossary")
):
    # 1. 读取和处理文档
    content = await file.read()
    text_content = extract_text_from_document(content, file.filename)
    
    # 2. 使用 Gemini AI 生成术语表
    glossary_payload = await term_extractor.create_glossary_payload(
        text_content, 
        primary_lang,
        name
    )
    
    # 3. 创建 DeepL 术语表
    result = await glossary_manager.create_glossary(glossary_payload)
```

2. **文档内容提取**：
```python
# document_processor.py 处理不同类型文档
class DocumentProcessor:
    def process_file(self, file_path: str) -> str:
        # 根据文件类型选择处理方法
        ext = os.path.splitext(file_path.lower())[1]
        if ext not in self.supported_extensions:
            raise ValueError(f"Unsupported file type: {ext}")
            
        return self.supported_extensions[ext](file_path)
```

3. **文本分块处理**：
```python
# document_chunker.py 将大文本分成小块
class DocumentChunker:
    def create_chunks(self, text: str, overlap: int = 2) -> List[str]:
        """将文本分成多个块，保持上下文连贯性"""
        sentences = self.split_by_sentences(text)
        chunks = []
        # ... 分块逻辑 ...
        return chunks
```

4. **术语提取流程**：
```python
# term_extractor.py 使用 Gemini AI 提取术语
class GeminiTermExtractor:
    async def extract_terms_from_chunk(self, text: str, source_lang: str, target_lang: str):
        prompt = f"""
        Task: Extract professional terms and important phrases from the text below 
        and translate them from {source_lang} to {target_lang}.
        
        Requirements:
        1. Focus on technical terms, proper nouns, and domain-specific phrases
        2. Output format: one term pair per line, source and target separated by tab
        3. Only output the term pairs, no explanations
        4. Maintain consistency in translations
        
        Text:
        {text}
        """
        
        # 调用 Gemini AI 进行术语提取
        response = await self.model.generate_content_async(prompt)
        return self._parse_terms(response.text)
```

5. **术语表创建和管理**：
```python
# glossary_manager.py 管理 DeepL 术语表
class GlossaryManager:
    async def create_glossary(self, payload: dict) -> dict:
        """创建新的术语表并缓存"""
        # 调用 DeepL API 创建术语表
        result = await self._create_glossary_in_deepl(payload)
        
        # 缓存术语表信息
        self._cache_glossary(result["glossary_id"], {
            "payload": payload,
            "response": result
        })
        
        return result
```

完整流程说明：

1. **文档处理阶段**：
   - 接收上传的文档
   - 根据文件类型（PDF、Word、PPT等）提取文本内容
   - 将大文本分成适合处理的小块

2. **术语提取阶段**：
   - 对每个文本块使用 Gemini AI 提取专业术语
   - Gemini AI 根据提示词识别专业术语并提供初步翻译
   - 合并所有块的术语并去重

3. **术语表创建阶段**：
   - 将提取的术语格式化为 DeepL 要求的格式（TSV或CSV）
   - 创建双向术语表（如中文->英文和英文->中文）
   - 调用 DeepL API 创建术语表

4. **翻译使用阶段**：
   - 将创建的术语表 ID 用于后续的翻译请求
   - DeepL 在翻译时会参考术语表确保专业术语的一致性

5. **缓存和同步**：
   - 本地缓存术语表信息
   - 定期同步确保术语表状态更新
   - 管理术语表的生命周期

这个流程确保了：
1. 专业术语的准确识别（通过 Gemini AI）
2. 术语翻译的一致性（通过 DeepL 术语表）
3. 高效的文档处理（通过分块处理）
4. 可靠的数据管理（通过本地缓存和同步）
