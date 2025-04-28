# backend/database.py 数据库连接配置
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv
from sqlalchemy.sql import text
import logging

# 配置 logger
logger = logging.getLogger(__name__)

# 加载环境变量
load_dotenv()

# 构建数据库 URL
DATABASE_URL = (
    f"postgresql://{os.getenv('POSTGRES_USER')}:{os.getenv('POSTGRES_PASSWORD')}@"
    f"{os.getenv('POSTGRES_HOST')}:{os.getenv('POSTGRES_PORT')}/{os.getenv('POSTGRES_DB')}"
)

# 创建引擎
engine = create_engine(
    DATABASE_URL,
    pool_size=int(os.getenv('POSTGRES_POOL_SIZE', 5)),
    max_overflow=int(os.getenv('POSTGRES_MAX_OVERFLOW', 10)),
    pool_timeout=int(os.getenv('POSTGRES_POOL_TIMEOUT', 30)),
    pool_recycle=int(os.getenv('POSTGRES_POOL_RECYCLE', 1800))
)

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 声明基类
Base = declarative_base()

# 依赖项
def get_db():
    db = SessionLocal()
    try:
        # 添加连接测试
        db.execute(text("SELECT 1"))
        logger.debug("Database connection successful")
        yield db
    except Exception as e:
        logger.error(f"Database connection error: {str(e)}")
        raise
    finally:
        db.close()