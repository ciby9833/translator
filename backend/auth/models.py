from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from database import Base
from datetime import datetime
import uuid

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    feishu_user_id = Column(String(255), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    en_name = Column(String(255))
    email = Column(String(255))
    mobile = Column(String(255))
    avatar_url = Column(String(1024))
    tenant_key = Column(String(255), nullable=False)
    
    # 认证相关
    access_token = Column(String(255))
    refresh_token = Column(String(255))
    token_expires_at = Column(DateTime)
    
    # 用户状态
    is_active = Column(Boolean, default=True)
    last_login_at = Column(DateTime)
    login_count = Column(Integer, default=0)
    
    # 审计字段
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def update_login(self, access_token: str, expires_at: datetime):
        """更新登录信息"""
        self.access_token = access_token
        self.token_expires_at = expires_at
        self.last_login_at = datetime.utcnow()
        self.login_count += 1
