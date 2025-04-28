# backend/models/glossary.py  术语表模型
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint, text, CheckConstraint
from sqlalchemy.orm import relationship
from database import Base

class Glossary(Base):
    __tablename__ = "glossaries"
    
    id = Column(Integer, primary_key=True)
    deepl_glossary_id = Column(String(255), unique=True)
    name = Column(String(255), nullable=False)
    source_lang = Column(String(10), nullable=False)
    target_lang = Column(String(10), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=text('CURRENT_TIMESTAMP'))
    updated_at = Column(DateTime(timezone=True), onupdate=text('CURRENT_TIMESTAMP'))
    entries = relationship("GlossaryEntry", back_populates="glossary", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint('source_lang', 'target_lang', name='uix_lang_pair'),
        CheckConstraint("source_lang ~ '^[A-Z]{2}(-[A-Z]{2})?$'", name='chk_source_lang'),
        CheckConstraint("target_lang ~ '^[A-Z]{2}(-[A-Z]{2})?$'", name='chk_target_lang'),
    )

class GlossaryEntry(Base):
    __tablename__ = "glossary_entries"
    
    id = Column(Integer, primary_key=True)
    glossary_id = Column(Integer, ForeignKey("glossaries.id", ondelete="CASCADE"))
    source_term = Column(String(1024), nullable=False)
    target_term = Column(String(1024), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=text('CURRENT_TIMESTAMP'))
    glossary = relationship("Glossary", back_populates="entries")

    __table_args__ = (
        UniqueConstraint('glossary_id', 'source_term', name='uix_glossary_source_term'),
    )