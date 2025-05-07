# backend/services/paper_analyzer/__init__.py
from .ai_manager import AIManager
from .paper_processor import PaperProcessor
from .rag_retriever import RAGRetriever
from .translator import Translator
from sqlalchemy.orm import Session
from models.paper import PaperAnalysis, PaperQuestion
import uuid
from sqlalchemy import func

class PaperAnalyzerService:
    def __init__(self, db: Session):
        self.db = db
        self.ai_manager = AIManager()
        self.paper_processor = PaperProcessor()
        self.rag_retriever = RAGRetriever()
        self.translator = Translator()

    async def analyze_paper(self, file_content: bytes, filename: str):
        """分析论文文件"""
        try:
            # 处理论文内容
            processed_content = await self.paper_processor.process(file_content)
            
            # 生成唯一的paper_id
            paper_id = str(uuid.uuid4())
            
            # 构建向量索引，传入paper_id
            await self.rag_retriever.build_index(processed_content, paper_id)
            
            # 存储到数据库
            paper_analysis = PaperAnalysis(
                paper_id=uuid.UUID(paper_id),
                filename=filename,
                content=processed_content
            )
            self.db.add(paper_analysis)
            self.db.commit()
            
            return {
                "status": "success",
                "message": "论文分析完成",
                "paper_id": paper_id,
                "content": processed_content
            }
        except Exception as e:
            self.db.rollback()
            return {
                "status": "error",
                "message": str(e)
            }

    async def get_paper_content(self, paper_id: str) -> str:
        """获取论文内容"""
        try:
            paper = self.db.query(PaperAnalysis).filter(
                PaperAnalysis.paper_id == uuid.UUID(paper_id)
            ).first()
            
            if not paper:
                raise Exception("Paper not found")
                
            return paper.content
        except Exception as e:
            raise Exception(f"Failed to get paper content: {str(e)}")

    async def ask_question(self, question: str, paper_id: str):
        """向论文提问"""
        try:
            # 验证paper_id
            if paper_id == "current_paper_id":
                # 获取最新的paper_id
                latest_paper = self.db.query(PaperAnalysis).order_by(
                    PaperAnalysis.created_at.desc()
                ).first()
                if not latest_paper:
                    return {
                        "status": "error",
                        "message": "没有找到可用的论文"
                    }
                paper_id = str(latest_paper.paper_id)

            # 获取相关上下文
            try:
                context = await self.rag_retriever.get_relevant_context(question, paper_id)
            except Exception as e:
                return {
                    "status": "error",
                    "message": f"获取上下文失败: {str(e)}"
                }
            
            # 获取 AI 回答
            response = await self.ai_manager.get_response(question, context)
            
            # 存储问答记录
            paper_question = PaperQuestion(
                paper_id=uuid.UUID(paper_id),
                question=question,
                answer=response
            )
            self.db.add(paper_question)
            self.db.commit()
            
            return {
                "status": "success",
                "response": response
            }
        except Exception as e:
            self.db.rollback()
            return {
                "status": "error",
                "message": str(e)
            }

    async def get_question_history(self, paper_id: str):
        """获取问答历史"""
        try:
            questions = self.db.query(PaperQuestion).filter(
                PaperQuestion.paper_id == uuid.UUID(paper_id)
            ).order_by(PaperQuestion.created_at.desc()).all()
            
            return [{
                "question": q.question,
                "answer": q.answer,
                "created_at": q.created_at.isoformat()
            } for q in questions]
        except Exception as e:
            raise Exception(f"Failed to get question history: {str(e)}")

    async def translate_paper(self, paper_id: str, target_lang: str):
        """翻译论文内容"""
        try:
            # 获取论文内容
            paper = self.db.query(PaperAnalysis).filter(
                PaperAnalysis.paper_id == uuid.UUID(paper_id)
            ).first()
            
            if not paper:
                raise Exception("Paper not found")
            
            # 验证目标语言
            if target_lang not in self.translator.supported_languages:
                raise ValueError(f"Unsupported target language: {target_lang}")
            
            # 翻译内容
            translated_content = await self.translator.translate_text(
                paper.content,
                target_lang
            )
            
            # 更新数据库中的翻译内容
            paper.translated_content = translated_content
            paper.translation_lang = target_lang
            paper.translation_updated_at = func.now()
            self.db.commit()
            
            return {
                "status": "success",
                "content": translated_content,
                "language": target_lang
            }
        except Exception as e:
            self.db.rollback()
            return {
                "status": "error",
                "message": str(e)
            }

    async def get_supported_languages(self):
        """获取支持的语言列表"""
        return self.translator.get_supported_languages()