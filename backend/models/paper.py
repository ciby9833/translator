# backend/models/paper.py  文档阅读
from sqlalchemy import Column, String, Text, DateTime, Integer, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from database import Base
import uuid

class PaperAnalysis(Base):
    __tablename__ = "paper_analysis"

    id = Column(Integer, primary_key=True)
    paper_id = Column(UUID(as_uuid=True), default=uuid.uuid4, nullable=False)
    filename = Column(String(255), nullable=False)
    content = Column(Text)
    translated_content = Column(Text)
    translation_lang = Column(String(10))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class PaperQuestion(Base):
    __tablename__ = "paper_questions"

    id = Column(Integer, primary_key=True)
    paper_id = Column(UUID(as_uuid=True), ForeignKey('paper_analysis.paper_id'), nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())