# backend/services/term_extractor.py 
# 术语提取器
import google.generativeai as genai
from typing import List, Tuple, Set, Dict, Any
import os
import json
from .document_chunker import DocumentChunker
import logging
from google.generativeai.types import HarmCategory, HarmBlockThreshold
from tenacity import retry, stop_after_attempt, wait_exponential
import traceback
import asyncio
import re

# 添加 logger 配置
logger = logging.getLogger(__name__)

class TermExtractorConfig:
    """术语提取器配置管理"""
    def __init__(self):
        self.supported_langs = {
            'zh': 'Chinese',
            'en': 'English',
            'id': 'Indonesian',
            'ja': 'Japanese'
        }
        
        # 加载配置（如果配置文件存在则从文件加载，否则使用默认值）
        config_path = os.path.join(os.path.dirname(__file__), '../config/term_extractor_config.json')
        self.config = self._load_config(config_path)
    
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """加载配置文件"""
        default_config = {
            "prompt_templates": {
                "term_extraction": self._get_default_prompt_template()
            },
            "validation": {
                "max_term_length": 1024,
                "min_term_length": 2
            }
        }
        
        try:
            if os.path.exists(config_path):
                with open(config_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            return default_config
        except Exception as e:
            logger.error(f"Error loading config: {str(e)}")
            return default_config
    
    def _get_default_prompt_template(self) -> str:
        """获取默认提示词模板 - 不限制行业领域"""
        return """
        You are a professional translator and terminology expert.

        Task: From the given text in {source_lang}, identify and extract important terms and phrases based on the text context, then translate them to {target_lang}.

        Requirements:
        1. Extract terms from any domain present in the text:
           - Cultural references and concepts
           - Geographic and location names
           - Economic and social terminology
           - Technical terms and proper nouns
           - Commonly used phrases specific to the text's subject

        2. Term selection criteria:
           - Focus on context-relevant terminology
           - Include important concepts that benefit from consistent translation
           - Select terms that appear significant in the text's context
           - Terms should be complete and meaningful

        3. Output format:
           - One term pair per line
           - Format: source_term<TAB>target_term
           - Example: 风俗文化<TAB>Budaya dan Adat Istiadat

        Text to analyze:
        {text}

        Note: Extract diverse terms based on the text content, not limited to any specific industry. Ensure translations are accurate and culturally appropriate.
        """

    def get_language_name(self, lang_code: str) -> str:
        """获取语言名称"""
        return self.supported_langs.get(lang_code.lower(), lang_code)

    def get_prompt(self, source_lang: str, target_lang: str, text: str) -> str:
        """生成提取术语的提示词"""
        template = self.config["prompt_templates"]["term_extraction"]
        source_lang_name = self.get_language_name(source_lang)
        target_lang_name = self.get_language_name(target_lang)
        
        return template.format(
            source_lang=source_lang_name,
            target_lang=target_lang_name,
            text=text
        )

class GeminiTermExtractor:
    def __init__(self):
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        self.generation_config = {
            "temperature": 0.7,  # 提高温度增加创造性
            "top_p": 0.8,        # 增加采样多样性
            "top_k": 40,         # 扩大候选词范围
            "max_output_tokens": 2048,
        }
        self.model = genai.GenerativeModel(
            model_name='gemini-1.5-pro',
            generation_config=self.generation_config
        )
        self.chunker = DocumentChunker()
        self.config = TermExtractorConfig()

    async def extract_terms(self, text: str, source_lang: str, target_lang: str) -> List[Tuple[str, str]]:
        """提取术语的主方法"""
        try:
            # 统一转换为小写
            source_lang = source_lang.lower()
            target_lang = target_lang.lower()
            
            logger.info(f"Starting term extraction for {source_lang}->{target_lang}")
            logger.debug(f"Input text length: {len(text)} characters")
            
            # 极简文本预处理 - 只处理制表符，保留原始文本结构
            processed_text = text.replace('\t', ' ')
            
            # 分块处理
            chunks = self.chunker.create_chunks(processed_text)
            logger.info(f"Created {len(chunks)} text chunks")
            
            all_terms = set()
            for i, chunk in enumerate(chunks, 1):
                logger.debug(f"Processing chunk {i}/{len(chunks)}")
                terms = await self._extract_ai_terms(chunk, source_lang, target_lang)
                all_terms.update(terms)
            
            # 转换为列表并返回 - 几乎不做任何过滤
            validated_terms = [(s, t) for s, t in all_terms if s and t]
            
            logger.info(f"Extracted {len(validated_terms)} terms")
            return validated_terms
            
        except Exception as e:
            logger.error(f"Term extraction failed: {str(e)}\n{traceback.format_exc()}")
            return []

    def _process_text(self, text: str) -> str:
        """文本预处理 - 极简版本，保留原始文本结构"""
        try:
            if not text:
                return ""
            
            # 只替换制表符，不做其他处理
            text = text.replace('\t', ' ')
            
            return text
            
        except Exception as e:
            logger.error(f"Text preprocessing error: {str(e)}")
            return text

    async def _extract_ai_terms(self, text: str, source_lang: str, target_lang: str) -> Set[Tuple[str, str]]:
        """使用 AI 提取术语 - 完全依赖AI能力，无备用逻辑"""
        try:
            # 记录原始文本片段用于调试
            logger.debug(f"Input text sample: {text[:100]}...")
            
            # 构建更强调上下文分析的提示词
            prompt = f"""
            You are a terminology extraction expert.

            TEXT:
            {text}

            TASK:
            Extract key terms from this {self.config.get_language_name(source_lang)} text and provide their {self.config.get_language_name(target_lang)} translations.

            INSTRUCTIONS:
            1. Identify 10-15 significant terms that appear in the text
            2. Include names, phrases, and technical vocabulary 
            3. Format each term as source_term[TAB]target_term with an actual tab character between terms
            4. Example: 风俗文化[actual tab character]Cultural Customs

            OUTPUT ONLY THE TERM PAIRS, ONE PER LINE.
            """
            
            logger.debug("Using enhanced context-aware prompt for term extraction")
            
            # 调用API
            response = await self._generate_with_retry_backoff([{"text": prompt}])
            
            # 收集响应
            full_response = ""
            async for chunk in response:
                if chunk.text:
                    full_response += chunk.text
            
            logger.debug(f"Got API response length: {len(full_response)} chars")
            
            # 清理和规范化响应
            cleaned_lines = []
            for line in full_response.strip().split('\n'):
                # 跳过明显的非术语行
                if line.startswith('FORMAT:') or line.startswith('Note:') or line.startswith('RESPONSE') or line.startswith('-'):
                    continue
                # 保留有制表符的行和可能是术语的行
                if '\t' in line or (len(line) > 1 and not line.startswith('#')):
                    cleaned_lines.append(line)
            
            clean_response = '\n'.join(cleaned_lines)
            
            # 在解析前记录完整响应
            logger.debug(f"Full AI response: {full_response}")
            
            # 解析术语
            terms = set()
            
            # 首先处理真实的制表符分隔格式
            tab_pattern = re.compile(r'^([^\t]+)\t+([^\t]+)$')
            for line in clean_response.strip().split('\n'):
                match = tab_pattern.match(line.strip())
                if match:
                    source, target = match.groups()
                    source = source.strip()
                    target = target.strip()
                    
                    if '\t' not in source and '\t' not in target and source and target:
                        terms.add((source, target))
                        logger.debug(f"Found valid term: {source} -> {target}")
            
            # 新增：处理<TAB>字符串格式
            if len(terms) < 5:
                tab_string_pattern = re.compile(r'^([^<]+)<TAB>(.+)$')
                for line in clean_response.strip().split('\n'):
                    if '<TAB>' in line:
                        match = tab_string_pattern.match(line.strip())
                        if match:
                            source, target = match.groups()
                            source = source.strip()
                            target = target.strip()
                            if source and target:
                                terms.add((source, target))
                                logger.debug(f"Found tab string term: {source} -> {target}")
            
            # 冒号分隔格式(备用解析方法)
            if len(terms) < 5:
                colon_pattern = re.compile(r'^([^:：]+)[：:]\s*(.+)$')
                for line in clean_response.strip().split('\n'):
                    if ':' in line or '：' in line:
                        match = colon_pattern.match(line.strip())
                        if match:
                            source, target = match.groups()
                            source = source.strip()
                            target = target.strip()
                            if '\t' not in source and '\t' not in target and source and target:
                                terms.add((source, target))
                                logger.debug(f"Found term (colon format): {source} -> {target}")
            
            # 在没有找到术语时记录更详细信息
            if len(terms) == 0:
                logger.error(f"Failed to extract any terms. AI response was: {full_response[:200]}...")
            
            # 简化验证 - 仅检查数据库长度限制
            validated_terms = set()
            for source, target in terms:
                if len(source.encode('utf-8')) <= 1024 and len(target.encode('utf-8')) <= 1024:
                    validated_terms.add((source, target))
            
            logger.info(f"Extracted {len(validated_terms)} terms from AI response")
            return validated_terms
            
        except Exception as e:
            logger.error(f"AI term extraction failed: {str(e)}\n{traceback.format_exc()}")
            return set()

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def _generate_with_retry_backoff(self, prompt_parts):
        try:
            return await self.model.generate_content_async(
                prompt_parts,
                stream=False, # 避免流式处理来减少API负担
                generation_config=self.generation_config
            )
        except Exception as e:
            if "429" in str(e):  # 速率限制错误
                logger.warning(f"Rate limit exceeded, backing off: {str(e)}")
            raise

    async def create_bidirectional_terms(self, terms: List[Tuple[str, str]], source_lang: str, target_lang: str) -> dict:
        """创建双向术语映射"""
        return {
            f"{source_lang}-{target_lang}": terms,
            f"{target_lang}-{source_lang}": [(target, source) for source, target in terms]
        }

    async def extract_terms_for_all_pairs(self, text: str, primary_lang: str) -> dict:
        """为所有语言对提取术语"""
        all_terms = {}
        supported_langs = self.config.supported_langs.keys()
        
        lang_pairs = [(primary_lang, lang) for lang in supported_langs if lang != primary_lang]
        
        for source_lang, target_lang in lang_pairs:
            terms = await self.extract_terms(text, source_lang, target_lang)
            bidirectional_terms = await self.create_bidirectional_terms(terms, source_lang, target_lang)
            all_terms.update(bidirectional_terms)
        
        return all_terms

    async def format_terms_for_db(self, terms: List[Tuple[str, str]]) -> List[Dict[str, str]]:
        """将术语格式化为数据库格式"""
        formatted_terms = []
        for source, target in terms:
            source = source.strip()
            target = target.strip()
            
            # 符合数据库表结构的格式
            if source and target and len(source.encode('utf-8')) <= 1024 and len(target.encode('utf-8')) <= 1024:
                formatted_terms.append({
                    "source_term": source,
                    "target_term": target
                })
        
        return formatted_terms

    async def format_terms_for_deepl(self, terms: List[Tuple[str, str]], format: str = 'tsv') -> str:
        """将术语格式化为DeepL格式"""
        try:
            if format == 'tsv':
                formatted_terms = []
                for source, target in terms:
                    source = source.strip()
                    target = target.strip()
                    
                    if source and target and len(source.encode('utf-8')) <= 1024 and len(target.encode('utf-8')) <= 1024:
                        formatted_terms.append(f"{source}\t{target}")
                
                result = '\n'.join(formatted_terms)
                logger.info(f"Formatted {len(formatted_terms)} terms for DeepL")
                return result
            
            return ""
        except Exception as e:
            logger.error(f"Error formatting terms: {str(e)}")
            raise

    async def batch_translate_words(self, words: List[str], target_lang: str) -> Dict[str, str]:
        """批量翻译词汇"""
        if not words:
            return {}
        
        # 源语言应该传递，添加默认值为'zh'
        source_lang = 'zh'  # 假设中文为源语言，更好的做法是将source_lang作为参数传入
        
        # 构建批量翻译提示词
        words_text = "\n".join([f"{i+1}. {word}" for i, word in enumerate(words)])
        prompt = f"""
        Translate the following {self.config.get_language_name(source_lang)} words/phrases to {self.config.get_language_name(target_lang)}:
        
        {words_text}
        
        Format your response exactly as:
        1. [translation1]
        2. [translation2]
        ...
        """
        
        try:
            # 使用带重试的API调用
            response = await self._generate_with_retry_backoff([{"text": prompt}])
            result_text = response.text.strip()
            
            # 解析结果
            translations = {}
            for i, word in enumerate(words):
                # 查找匹配的编号行
                match = re.search(rf"{i+1}\.\s+(.+)($|\n)", result_text)
                if match:
                    translation = match.group(1).strip()
                    # 清理可能的引号、括号等
                    translation = re.sub(r'^["\'（(\[\{]|["\')）\]\}]$', '', translation)
                    translations[word] = translation
            
            return translations
        except Exception as e:
            logger.error(f"Batch translation error: {str(e)}")
            return {}

    def _sanitize_term_pair(self, source: str, target: str) -> Tuple[str, str]:
        """确保术语对格式正确"""
        # 1. 移除制表符
        source = source.replace('\t', ' ').strip()
        target = target.replace('\t', ' ').strip()
        
        # 2. 清理多余的标点符号和格式
        for term in [source, target]:
            # 移除前后的引号、括号等
            term = re.sub(r'^["\'（(\[\{]|["\')）\]\}]$', '', term)
            # 移除前后的数字和点（如 "1. 术语"）
            term = re.sub(r'^\d+\.\s*', '', term)
        
        return (source, target)

    async def translate_multilingual(self, text: str) -> dict:
        """
        增强的多语言翻译方法，支持深度文化语境理解和跨语言转换
        内部进行深度分析但只返回翻译结果
        """
        try:
            if not self._is_valid_input(text):
                return {
                    "error": "Invalid input - empty, meaningless, or contains only symbols/emojis"
                }

            # 构建增强的上下文理解和翻译提示词
            prompt = f"""
            You are a cultural-aware multilingual translator with deep understanding of Chinese, English, and Indonesian languages, cultures, and societies.

            Analyze the input text internally (DO NOT include analysis in output) for:
            1. Language and Cultural Context:
               - Source language and cultural background
               - Regional variations and dialects
               - Cultural-specific references
               - Religious or cultural sensitivities

            2. Contextual Elements:
               - Professional/social context (formal/informal)
               - Time-sensitive elements (festivals, seasons, events)
               - Location-specific references
               - Organization names and titles
               - Colloquialisms and idioms

            3. Emotional and Pragmatic Aspects:
               - Emotional undertones
               - Speaker's intention
               - Social relationships implied
               - Level of politeness
               - Humor or irony if present

            Based on the analysis, translate the text into all three languages while:
            - Maintaining the original intention and emotional tone
            - Adapting cultural references appropriately
            - Using equivalent idioms or expressions when appropriate
            - Preserving the level of formality
            - Ensuring cultural sensitivity
            - Adapting time and location references as needed

            Input text:
            {text}

            Provide ONLY the translations in this exact format:
            - English translation: [translation]
            - Chinese translation: [translation]
            - Indonesian translation: [translation]
            """

            # 调用 AI API 进行翻译
            response = await self._generate_with_retry_backoff([{"text": prompt}])
            
            # 解析响应，只保留翻译结果
            result = self._parse_translations_only(response.text)
            
            return result

        except Exception as e:
            logger.error(f"Enhanced multilingual translation failed: {str(e)}\n{traceback.format_exc()}")
            return {"error": str(e)}

    def _parse_translations_only(self, response: str) -> dict:
        """
        只解析翻译结果，不包含分析信息，返回符合前端期望的格式
        """
        try:
            lines = response.strip().split('\n')
            translations = {
                "english": "",
                "chinese": "",
                "indonesian": "",
                "detected_language": "auto"  # 添加默认值
            }

            for line in lines:
                line = line.strip()
                if not line:
                    continue

                # 只解析翻译结果
                if line.startswith('- English translation:'):
                    translations["english"] = line.replace('- English translation:', '').strip()
                elif line.startswith('- Chinese translation:'):
                    translations["chinese"] = line.replace('- Chinese translation:', '').strip()
                elif line.startswith('- Indonesian translation:'):
                    translations["indonesian"] = line.replace('- Indonesian translation:', '').strip()

            # 验证结果完整性
            if not all(translations.values()):
                logger.warning("Some translations are missing in the response")
                missing_fields = [field for field, value in translations.items() if not value]
                logger.warning(f"Missing translations for: {missing_fields}")

            return translations

        except Exception as e:
            logger.error(f"Error parsing translations: {str(e)}")
            return {
                "english": "",
                "chinese": "",
                "indonesian": "",
                "detected_language": "auto"  # 确保错误情况下也有这个字段
            }

    def _is_valid_input(self, text: str) -> bool:
        """
        增强的输入验证，包含更多文化语境相关的检查
        """
        if not text or not text.strip():
            return False

        # 移除空白字符
        text = text.strip()

        # 检查是否只包含符号和表情
        symbols_pattern = r'^[\s!@#$%^&*()_+\-=\[\]{};:\'",.<>/?\\|~`，。！？、；：''""《》【】（）…—]+$'
        emoji_pattern = r'[\U0001F300-\U0001F9FF]'
        
        if re.match(symbols_pattern, text) or re.match(emoji_pattern, text):
            return False

        # 检查是否包含有效字符（扩展支持更多语言字符）
        valid_char_pattern = r'[a-zA-Z0-9\u4e00-\u9fff\u0080-\u024F\u0600-\u06FF\u0900-\u097F]'
        return bool(re.search(valid_char_pattern, text))

    async def translate_text_with_language_detection(self, text: str) -> dict:
        """
        便捷方法：翻译文本到所有支持的语言
        """
        if not text or not text.strip():
            return {"error": "Empty input"}

        try:
            return await self.translate_multilingual(text)
        except Exception as e:
            logger.error(f"Translation failed: {str(e)}")
            return {"error": str(e)}

def validate_glossary_payload(payload: dict) -> bool:
    """验证术语表有效性"""
    try:
        if not all(key in payload for key in ["name", "dictionaries"]):
            logger.error("Missing required fields in glossary payload")
            return False
            
        if len(payload["name"].encode('utf-8')) > 1024:
            logger.error("Glossary name exceeds 1024 bytes")
            return False
            
        for dictionary in payload["dictionaries"]:
            if not all(key in dictionary for key in ["source_lang", "target_lang", "entries", "entries_format"]):
                logger.error("Invalid dictionary format")
                return False
                
            if dictionary["entries_format"] not in ["tsv", "csv"]:
                logger.error(f"Invalid entries_format: {dictionary['entries_format']}")
                return False
                
            entries = dictionary["entries"].split("\n")
            seen_sources = set()
            
            for entry in entries:
                if not entry.strip():
                    continue
                    
                parts = entry.split("\t") if dictionary["entries_format"] == "tsv" else entry.split(",")
                if len(parts) != 2:
                    logger.error(f"Invalid entry format: {entry}")
                    return False
                    
                source, target = parts
                
                # 检查重复源术语
                if source in seen_sources:
                    logger.error(f"Duplicate source term: {source}")
                    return False
                    
                seen_sources.add(source)
                
                # 检查空术语
                if not source.strip() or not target.strip():
                    logger.error("Empty source or target term")
                    return False
                    
                # 检查长度限制
                if len(source.encode('utf-8')) > 1024 or len(target.encode('utf-8')) > 1024:
                    logger.error("Term exceeds 1024 bytes")
                    return False
                    
        return True
    except Exception as e:
        logger.error(f"Glossary payload validation error: {str(e)}\n{traceback.format_exc()}")
        return False
