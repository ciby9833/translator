from sqlalchemy import Column, String, DateTime, Integer, Text, LargeBinary
from database import Base
from datetime import datetime
import uuid

class Task(Base):
    __tablename__ = "tasks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String(255), nullable=False)
    status = Column(String(20), nullable=False, default='queued')  # queued, processing, completed, failed, cancelled
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    error = Column(Text, nullable=True)
    result_data = Column(Text, nullable=True)  # 存储base64编码的结果
    result_filename = Column(String(255), nullable=True)
    progress = Column(Integer, default=0)
    file_content = Column(LargeBinary, nullable=False)  # 添加这行来存储文件内容
