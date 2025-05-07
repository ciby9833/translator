# backend/services/task_manager.py  经纬度计算任务管理器
from typing import Dict, List, Optional
import asyncio
from datetime import datetime
import uuid
import base64
from io import BytesIO
from sqlalchemy.orm import Session
from models.task import Task
import logging
import traceback
from services.distance_calculator import DistanceCalculator
import urllib.parse

# 配置日志
logger = logging.getLogger(__name__)

class TaskManager:
    def __init__(self, db: Session):
        self.db = db
        self.queue: asyncio.Queue = asyncio.Queue()
        self._start_worker()
        self._active_tasks = set()  # 用于跟踪活动任务

    def _start_worker(self):
        """启动异步工作进程"""
        asyncio.create_task(self._process_queue())

    async def _process_queue(self):
        """处理队列中的任务"""
        while True:
            task_id = await self.queue.get()
            try:
                # 检查任务是否被取消
                if task_id in self._active_tasks:
                    task = self.db.query(Task).filter(Task.id == task_id).first()
                    if task and task.status == 'cancelled':
                        self._active_tasks.remove(task_id)
                        self.queue.task_done()
                        continue

                if task_id in self._active_tasks:
                    task = self.db.query(Task).filter(Task.id == task_id).first()
                    if task:
                        task.status = 'processing'
                        self.db.commit()

                        # 执行距离计算
                        calculator = DistanceCalculator()
                        result = await calculator.process_excel(
                            task.file_content,
                            task.filename
                        )
                        
                        # 将结果转换为base64
                        result_bytes, filename = result
                        result_base64 = base64.b64encode(result_bytes).decode('utf-8')
                        
                        # 更新任务状态和结果
                        task.status = 'completed'
                        task.completed_at = datetime.utcnow()
                        task.result_data = result_base64
                        task.result_filename = filename
                        self.db.commit()
                        self._active_tasks.remove(task_id)

            except Exception as e:
                logger.error(f"Error processing task {task_id}: {str(e)}")
                logger.error(traceback.format_exc())
                if task:
                    task.status = 'failed'
                    task.error = str(e)
                    task.completed_at = datetime.utcnow()
                    self.db.commit()
                if task_id in self._active_tasks:
                    self._active_tasks.remove(task_id)
            finally:
                self.queue.task_done()

    async def add_task(self, file_content: bytes, filename: str) -> str:
        """添加新任务到队列"""
        try:
            task = Task(
                filename=filename,
                status='queued',
                file_content=file_content
            )
            self.db.add(task)
            self.db.commit()
            
            self._active_tasks.add(task.id)
            await self.queue.put(task.id)
            return task.id
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error adding task: {str(e)}")
            logger.error(traceback.format_exc())
            raise

    def get_task(self, task_id: str) -> Optional[dict]:
        """获取单个任务信息"""
        try:
            task = self.db.query(Task).filter(Task.id == task_id).first()
            if task:
                return {
                    'id': task.id,
                    'filename': task.filename,
                    'status': task.status,
                    'created_at': task.created_at.isoformat(),
                    'completed_at': task.completed_at.isoformat() if task.completed_at else None,
                    'error': task.error,
                    'progress': task.progress,
                    'result_data': task.result_data,
                    'result_filename': task.result_filename
                }
            return None
        except Exception as e:
            logger.error(f"Error getting task: {str(e)}")
            logger.error(traceback.format_exc())
            raise

    def get_all_tasks(self) -> List[dict]:
        """获取所有任务列表"""
        try:
            tasks = self.db.query(Task).order_by(Task.created_at.desc()).all()
            return [{
                'id': task.id,
                'filename': task.filename,
                'status': task.status,
                'created_at': task.created_at.isoformat(),
                'completed_at': task.completed_at.isoformat() if task.completed_at else None,
                'error': task.error,
                'progress': task.progress
            } for task in tasks]
        except Exception as e:
            logger.error(f"Error getting all tasks: {str(e)}")
            logger.error(traceback.format_exc())
            raise

    def cancel_task(self, task_id: str) -> bool:
        """取消任务"""
        try:
            task = self.db.query(Task).filter(Task.id == task_id).first()
            if not task:
                return False
                
            # 只允许取消排队中或处理中的任务
            if task.status not in ['queued', 'processing']:
                raise ValueError("Only queued or processing tasks can be cancelled")
                
            task.status = 'cancelled'
            task.completed_at = datetime.utcnow()
            task.error = "Task cancelled by user"
            self.db.commit()
            
            # 从活动任务集合中移除
            if task_id in self._active_tasks:
                self._active_tasks.remove(task_id)
                
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error cancelling task {task_id}: {str(e)}")
            logger.error(traceback.format_exc())
            raise

    def delete_task(self, task_id: str) -> bool:
        """删除任务"""
        try:
            task = self.db.query(Task).filter(Task.id == task_id).first()
            if not task:
                return False
                
            # 只允许删除已完成、失败或已取消的任务
            if task.status not in ['completed', 'failed', 'cancelled']:
                raise ValueError("Only completed, failed, or cancelled tasks can be deleted")
                
            # 删除任务
            self.db.delete(task)
            self.db.commit()
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error deleting task {task_id}: {str(e)}")
            logger.error(traceback.format_exc())
            raise