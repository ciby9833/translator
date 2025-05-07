import aiohttp
from .config import DEEPL_API_KEY, DEEPL_API_URL, SUPPORTED_LANGUAGES

class Translator:
    def __init__(self):
        self.api_key = DEEPL_API_KEY
        self.api_url = DEEPL_API_URL
        self.supported_languages = SUPPORTED_LANGUAGES

    async def translate_text(self, text: str, target_lang: str) -> str:
        """翻译文本到目标语言"""
        if not text:
            return ""
            
        if target_lang not in self.supported_languages:
            raise ValueError(f"Unsupported target language: {target_lang}")

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.api_url,
                    data={
                        "auth_key": self.api_key,
                        "text": text,
                        "target_lang": target_lang
                    }
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        raise Exception(f"Translation failed: {error_text}")
                        
                    result = await response.json()
                    return result["translations"][0]["text"]
        except Exception as e:
            raise Exception(f"Translation error: {str(e)}")

    def get_supported_languages(self) -> dict:
        """获取支持的语言列表"""
        return self.supported_languages
