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


我来帮你总结一下后端项目的主要结构和功能：

1. 项目架构
```
backend/
├── models/
│   └── glossary.py         # 数据库模型定义
├── services/
│   ├── document_processor.py    # 文档处理服务
│   ├── document_chunker.py      # 文档分块服务
│   ├── term_extractor.py        # 术语提取服务
│   ├── glossary_manager.py      # 术语表管理服务
│   └── local_glossary_manager.py # 本地术语表管理服务
└── main.py                 # FastAPI 主应用
```

2. 核心功能模块：

a) 翻译服务：
- 支持 DeepL 和 Google 两种翻译服务
- DeepL 为主要翻译服务，支持文档和文本翻译
- 支持自动语言检测和术语表集成

b) 术语表管理：
```python
# models/glossary.py
class Glossary(Base):
    # 术语表基本信息
    id = Column(Integer, primary_key=True)
    deepl_glossary_id = Column(String(255), unique=True)
    name = Column(String(255))
    source_lang = Column(String(10))
    target_lang = Column(String(10))

class GlossaryEntry(Base):
    # 术语表条目
    id = Column(Integer, primary_key=True)
    glossary_id = Column(Integer, ForeignKey("glossaries.id"))
    source_term = Column(String(1024))
    target_term = Column(String(1024))
```

c) API 端点：
- 文档翻译：`/api/translate`
- 文本翻译：`/api/translate/text`
- 术语表管理：
  - 创建：`/api/create-glossary`
  - 查询：`/api/glossaries`
  - 搜索：`/api/glossaries-search`
  - 更新：`/api/glossaries/{id}`
  - 删除：`/api/glossaries/{id}`

3. 环境配置：
```python
# .env
DEEPL_API_KEY=xxx
DEEPL_API_TYPE=pro
GEMINI_API_KEY=xxx
MAX_CHUNK_SIZE=30000
POSTGRES_USER=postgres
POSTGRES_PASSWORD=xxx
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=translation
```

4. 主要特性：

a) 文档处理：
- 支持 PDF、DOCX、PPTX 格式
- 文件大小限制：30MB
- 自动分块处理大文档

b) 术语表功能：
- 自动术语提取
- 术语表创建和管理
- 支持术语搜索和更新
- 本地数据库存储和同步

c) 错误处理：
- 详细的错误日志记录
- 自定义错误类型
- HTTP 异常处理

d) 安全特性：
- CORS 配置
- API 密钥管理
- 数据库连接池

5. 数据库配置：
- 使用 PostgreSQL
- 连接池配置
- 事务管理
- 模型关系映射

6. 性能优化：
- 异步处理
- 连接池管理
- 文档分块处理
- 缓存机制

这个后端项目主要是一个专业的翻译服务系统，集成了 DeepL API，并提供了完整的术语表管理功能。系统设计合理，包含了必要的错误处理和性能优化措施。主要特点是支持文档翻译和术语表管理的深度集成，可以提供更准确的专业领域翻译服务。
