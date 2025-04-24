# backend/main.py
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os
import asyncio
from dotenv import load_dotenv
from typing import Optional, Dict
from abc import ABC, abstractmethod
from enum import Enum
import logging
import traceback
from datetime import datetime

# 加载环境变量
load_dotenv()

# 修改日志配置
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),  # 输出到控制台
        logging.FileHandler('debug.log'),  # 直接在当前目录创建日志文件
    ]
)
logger = logging.getLogger(__name__)

# 定义翻译服务类型
class TranslatorType(str, Enum):
    DEEPL = "deepl"
    GOOGLE = "google"

# 翻译服务的抽象基类
class TranslatorService(ABC):
    @abstractmethod
    async def translate_document(self, file_content: bytes, filename: str, target_lang: str) -> bytes:
        pass

    @abstractmethod
    def is_available(self) -> bool:
        pass

# DeepL翻译服务实现
class DeepLTranslator(TranslatorService):
    def __init__(self):
        self.api_key = os.getenv("DEEPL_API_KEY")
        self.api_type = os.getenv("DEEPL_API_TYPE", "free")  # 默认使用 free
        
        # 根据 API 类型设置基础 URL
        base_url = "https://api.deepl.com" if self.api_type.lower() == "pro" else "https://api-free.deepl.com"
        self.api_url = f"{base_url}/v2/document"
        
        logger.debug(f"Initializing DeepL translator with API type: {self.api_type}")
        logger.debug(f"Using API URL: {self.api_url}")

    def is_available(self) -> bool:
        return bool(self.api_key)

    async def translate_document(self, file_content: bytes, filename: str, target_lang: str) -> bytes:
        if not self.api_key:
            logger.error("DeepL API key not configured")
            raise ValueError("DeepL API key not configured")

        logger.info(f"Starting translation for file: {filename}, target language: {target_lang}")
        logger.debug(f"File size: {len(file_content)} bytes")

        async with httpx.AsyncClient() as client:
            try:
                # 1. 上传文档
                files = {"file": (filename, file_content)}
                data = {
                    "auth_key": self.api_key,
                    "target_lang": target_lang
                }
                
                logger.debug("Sending document to DeepL API")
                response = await client.post(
                    self.api_url,
                    files=files,
                    data=data
                )
                
                # 记录响应信息
                logger.debug(f"DeepL API response status: {response.status_code}")
                logger.debug(f"DeepL API response headers: {dict(response.headers)}")
                logger.debug(f"DeepL API response body: {response.text}")

                if response.status_code == 403:
                    logger.error(f"DeepL API authorization failed: {response.text}")
                    raise ValueError(f"DeepL API authorization failed: {response.text}")
                
                response.raise_for_status()
                upload_result = response.json()
                
                document_id = upload_result["document_id"]
                document_key = upload_result["document_key"]
                logger.info(f"Document uploaded successfully. ID: {document_id}")
                
                # 2. 等待翻译完成
                while True:
                    logger.debug(f"Checking translation status for document {document_id}")
                    status_response = await client.get(
                        f"{self.api_url}/{document_id}",
                        params={
                            "auth_key": self.api_key,
                            "document_key": document_key
                        }
                    )
                    status = status_response.json()["status"]
                    logger.debug(f"Translation status: {status}")
                    
                    if status == "done":
                        break
                    elif status == "error":
                        error_msg = status_response.json().get("message", "Unknown error")
                        logger.error(f"Translation failed: {error_msg}")
                        raise ValueError(f"Translation failed: {error_msg}")
                    
                    await asyncio.sleep(1)
                
                # 3. 下载翻译结果
                logger.debug("Downloading translated document")
                result_response = await client.post(
                    f"{self.api_url}/{document_id}/result",
                    data={
                        "auth_key": self.api_key,
                        "document_key": document_key
                    }
                )
                
                if result_response.status_code != 200:
                    logger.error(f"Failed to download translation: {result_response.text}")
                    raise ValueError(f"Failed to download translation: {result_response.text}")
                
                logger.info("Translation completed successfully")
                return result_response.content
                
            except httpx.HTTPError as e:
                logger.error(f"HTTP error during translation: {str(e)}")
                logger.error(traceback.format_exc())
                raise ValueError(f"HTTP error during translation: {str(e)}")
            except Exception as e:
                logger.error(f"Unexpected error during translation: {str(e)}")
                logger.error(traceback.format_exc())
                raise ValueError(f"Translation error: {str(e)}")

# Google翻译服务实现
class GoogleTranslator(TranslatorService):
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_TRANSLATE_API_KEY")
        self.project_id = os.getenv("GOOGLE_PROJECT_ID")
        try:
            from google.cloud import translate_v3
            from google.oauth2 import service_account
            self.translate_v3 = translate_v3
            self.service_account = service_account
            self._init_client()
        except ImportError:
            self.translate_v3 = None

    def is_available(self) -> bool:
        return bool(self.translate_v3 and self.api_key and self.project_id)

    def _init_client(self):
        if self.is_available():
            credentials = self.service_account.Credentials.from_service_account_info({
                "type": "service_account",
                "project_id": self.project_id,
                "private_key": self.api_key,
                # 其他必要的凭证信息...
            })
            self.client = self.translate_v3.TranslationServiceClient(credentials=credentials)

    async def translate_document(self, file_content: bytes, filename: str, target_lang: str) -> bytes:
        if not self.is_available():
            raise ValueError("Google Translate API not configured or package not installed")

        try:
            parent = f"projects/{self.project_id}/locations/global"
            
            # 构建请求
            request = self.translate_v3.TranslateTextRequest(
                parent=parent,
                contents=[file_content.decode('utf-8')],
                mime_type=self._get_mime_type(filename),
                source_language_code="auto",
                target_language_code=target_lang,
            )
            
            # 发送翻译请求
            response = self.client.translate_text(request)
            
            # 返回翻译结果
            if response.translations:
                return response.translations[0].translated_text.encode('utf-8')
            else:
                raise ValueError("No translation result")
                
        except Exception as e:
            raise Exception(f"Google Translate API error: {str(e)}")
    
    def _get_mime_type(self, filename: str) -> str:
        ext = filename.lower().split('.')[-1]
        mime_types = {
            'pdf': 'application/pdf',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'txt': 'text/plain'
        }
        return mime_types.get(ext, 'application/octet-stream')

# 翻译服务工厂
class TranslatorFactory:
    _instances: Dict[TranslatorType, TranslatorService] = {}

    @classmethod
    def get_translator(cls, translator_type: TranslatorType) -> TranslatorService:
        if translator_type not in cls._instances:
            if translator_type == TranslatorType.DEEPL:
                cls._instances[translator_type] = DeepLTranslator()
            elif translator_type == TranslatorType.GOOGLE:
                cls._instances[translator_type] = GoogleTranslator()
        
        translator = cls._instances[translator_type]
        if not translator.is_available():
            raise ValueError(f"{translator_type} translator is not available")
            
        return translator

app = FastAPI(title="CargoPPT Translation API")

# 添加 CORS 中间件配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite 默认端口
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/translators")
def get_available_translators():
    """获取可用的翻译服务列表"""
    translators = {
        TranslatorType.DEEPL: DeepLTranslator(),
        TranslatorType.GOOGLE: GoogleTranslator()
    }
    
    return {
        "translators": [
            {
                "id": translator_type.value,
                "name": "DeepL" if translator_type == TranslatorType.DEEPL else "Google Translate",
                "available": translator.is_available()
            }
            for translator_type, translator in translators.items()
        ],
        "default": os.getenv("DEFAULT_TRANSLATOR", TranslatorType.DEEPL.value)
    }

# 添加文件大小限制常量
MAX_FILE_SIZE = 30 * 1024 * 1024  # 30MB in bytes

# 设置超时时间
TIMEOUT = 300.0  # 300秒

@app.post("/api/translate")
async def translate_document(
    file: UploadFile = File(...),
    target_lang: str = Form(...)
):
    try:
        # 1. 检查文件大小
        file_size = 0
        content = await file.read()  # 直接读取整个文件
        file_size = len(content)
            
        # 检查文件大小是否超过限制
        if file_size > MAX_FILE_SIZE:
            logger.error(f"File size ({file_size} bytes) exceeds limit ({MAX_FILE_SIZE} bytes)")
            raise HTTPException(
                status_code=413,
                detail={
                    "code": "FILE_TOO_LARGE",
                    "message": f"File size exceeds limit of {MAX_FILE_SIZE/(1024*1024)}MB"
                }
            )

        # 2. 获取 DeepL 配置
        translator = DeepLTranslator()
        if not translator.api_key:
            logger.error("DeepL API key not configured")
            raise HTTPException(
                status_code=500,
                detail={
                    "code": "API_KEY_MISSING",
                    "message": "DeepL API key not configured"
                }
            )

        # 3. 准备请求
        base_url = translator.api_url.replace("/document", "")
        headers = {
            "Authorization": f"DeepL-Auth-Key {translator.api_key}"
        }

        # 4. 发送请求
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                files = {
                    "file": (file.filename, content, file.content_type)
                }
                data = {
                    "target_lang": target_lang
                }
                
                logger.info(f"Sending file to DeepL API: {file.filename}, size: {file_size} bytes, type: {file.content_type}")
                upload_response = await client.post(
                    f"{base_url}/document",
                    files=files,
                    data=data,
                    headers=headers
                )
                
                # 5. 记录响应信息
                logger.info(f"DeepL API response status: {upload_response.status_code}")
                logger.debug(f"DeepL API response headers: {dict(upload_response.headers)}")
                logger.debug(f"DeepL API response body: {upload_response.text}")

                # 6. 处理错误响应
                if upload_response.status_code != 200:
                    error_body = upload_response.json()
                    logger.error(f"DeepL API error: {error_body}")
                    raise HTTPException(
                        status_code=upload_response.status_code,
                        detail={
                            "code": "DEEPL_API_ERROR",
                            "message": error_body.get("message", "Translation service error")
                        }
                    )

                # 7. 返回成功响应
                result = upload_response.json()
                return {
                    "document_id": result["document_id"],
                    "document_key": result["document_key"]
                }

            except httpx.ReadTimeout:  # 修正超时异常类名
                logger.error("DeepL API request timed out")
                raise HTTPException(
                    status_code=504,
                    detail={
                        "code": "TIMEOUT",
                        "message": "Translation service request timed out"
                    }
                )
            except httpx.RequestError as e:
                logger.error(f"DeepL API request failed: {str(e)}")
                raise HTTPException(
                    status_code=502,
                    detail={
                        "code": "REQUEST_FAILED",
                        "message": "Failed to connect to translation service"
                    }
                )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during translation: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail={
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred"
            }
        )

# 添加新的端点用于检查状态
@app.post("/api/translate/{document_id}/status")
async def check_status(
    document_id: str,
    document_key: str
):
    try:
        # 使用 DeepLTranslator 实例获取正确的配置
        translator = DeepLTranslator()
        base_url = translator.api_url.replace("/document", "")

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{base_url}/document/{document_id}",
                params={
                    "auth_key": translator.api_key,
                    "document_key": document_key
                }
            )
            
            if response.status_code != 200:
                logger.error(f"Status check failed: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Status check failed: {response.text}"
                )
            
            return response.json()

    except Exception as e:
        logger.error(f"Error checking status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# 在文件开头添加自定义异常类
class CharacterLimitError(Exception):
    """DeepL API character limit reached exception"""
    pass

# 修改文档翻译下载端点
@app.post("/api/translate/{document_id}/download")
async def download_document(
    document_id: str,
    document_key: str
):
    try:
        translator = DeepLTranslator()
        base_url = translator.api_url.replace("/document", "")

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{base_url}/document/{document_id}/result",
                params={
                    "auth_key": translator.api_key,
                    "document_key": document_key
                }
            )
            
            if response.status_code != 200:
                error_data = response.json()
                error_message = error_data.get("message", "")
                
                # 检查是否是字符限制错误
                if "Character limit reached" in error_message:
                    logger.error("Translation character limit reached")
                    raise CharacterLimitError("Monthly character limit reached. Please contact administrator.")
                
                logger.error(f"Download failed: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Download failed: {response.text}"
                )
            
            return Response(
                content=response.content,
                media_type="application/octet-stream",
                headers={
                    "Content-Disposition": f"attachment; filename=translated_document"
                }
            )

    except CharacterLimitError as e:
        # 返回特定的错误代码和消息
        raise HTTPException(
            status_code=429,  # Too Many Requests
            detail={
                "code": "CHARACTER_LIMIT_REACHED",
                "message": str(e)
            }
        )
    except Exception as e:
        logger.error(f"Error downloading document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# 同样修改文本翻译端点
@app.post("/api/translate/text")
async def translate_text(
    text: str = Form(...),
    target_lang: str = Form(...),
):
    try:
        translator = DeepLTranslator()
        if not translator.api_key:
            raise HTTPException(status_code=500, detail="DeepL API key not configured")

        base_url = translator.api_url.replace("/document", "")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{base_url}/translate",
                headers={
                    "Authorization": f"DeepL-Auth-Key {translator.api_key}"
                },
                json={
                    "text": [text],
                    "target_lang": target_lang
                }
            )
            
            if response.status_code != 200:
                error_data = response.json()
                error_message = error_data.get("message", "")
                
                # 检查是否是字符限制错误
                if "Character limit reached" in error_message:
                    logger.error("Translation character limit reached")
                    raise CharacterLimitError("Monthly character limit reached. Please contact administrator.")
                
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Translation failed: {response.text}"
                )
            
            return response.json()

    except CharacterLimitError as e:
        # 返回特定的错误代码和消息
        raise HTTPException(
            status_code=429,  # Too Many Requests
            detail={
                "code": "CHARACTER_LIMIT_REACHED",
                "message": str(e)
            }
        )
    except Exception as e:
        logger.error(f"Text translation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
def health_check():
    return {"status": "ok"}