// frontend/src/pages/DistanceCalculator.tsx
import React, { useState, useEffect } from 'react';
import { Card, Button, message, Spin, Upload, Table, Space, Modal, Typography, Tooltip } from 'antd';
import { 
  InboxOutlined, 
  DownloadOutlined, 
  StopOutlined, 
  DeleteOutlined,
  SyncOutlined,
  QuestionCircleOutlined 
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { distanceApi, Task } from '../services/distance';
import type { UploadProps, UploadFile } from 'antd';
import './distance-calculator.css';

const { Dragger } = Upload;
const { confirm } = Modal;
const { Title, Paragraph, Text } = Typography;

// 定义任务状态类型
type TaskStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

// 定义状态映射类型
const statusMap: Record<TaskStatus, string> = {
  queued: '等待中',
  processing: '处理中',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消'
};

const DistanceCalculator: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);

  // 添加刷新任务列表的函数
  const refreshTaskList = async () => {
    try {
      const response = await distanceApi.getAllTasks();
      if (response && Array.isArray(response)) {
        setTasks(response);
      }
    } catch (error) {
      console.error('获取任务列表失败:', error);
    }
  };

  // 修改轮询时间为3分钟
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await distanceApi.getAllTasks();
        if (response && Array.isArray(response)) {
          setTasks(response);
        }
      } catch (error) {
        console.error('获取任务列表失败:', error);
      }
    };

    fetchTasks(); // 立即获取一次
    const interval = setInterval(fetchTasks, 180000); // 3分钟更新一次
    return () => clearInterval(interval);
  }, []);

  const handleCalculate = async () => {
    if (!file) {
      message.warning('请先选择文件');
      return;
    }

    try {
      setLoading(true);
      const response = await distanceApi.calculateDistance(file);
      message.success('任务已添加到队列');
      setFile(null);
      setFileList([]);
      // 立即刷新任务列表
      await refreshTaskList();
    } catch (error) {
      console.error('添加任务失败:', error);
      message.error('添加任务失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (taskId: string) => {
    try {
      const blob = await distanceApi.downloadResult(taskId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `distance_result_${taskId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      message.error('下载失败，请重试');
      console.error('Download error:', error);
    }
  };

  const handleCancel = async (taskId: string) => {
    try {
      await distanceApi.cancelTask(taskId);
      message.success('任务已取消');
      // 立即刷新任务列表
      await refreshTaskList();
    } catch (error) {
      console.error('取消任务失败:', error);
    }
  };

  const handleDelete = async (taskId: string) => {
    confirm({
      title: '确认删除',
      content: '确定要删除这个任务吗？此操作不可恢复。',
      okText: '确认',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await distanceApi.deleteTask(taskId);
          message.success('任务已删除');
          // 立即刷新任务列表
          await refreshTaskList();
        } catch (error) {
          console.error('删除任务失败:', error);
        }
      }
    });
  };

  const uploadProps: UploadProps = {
    accept: '.xlsx',
    maxCount: 1,
    fileList: fileList,
    beforeUpload: (file) => {
      const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      if (!isExcel) {
        message.error('只能上传 Excel 文件！');
        return Upload.LIST_IGNORE;
      }

      const isLt30M = file.size / 1024 / 1024 < 30;
      if (!isLt30M) {
        message.error('文件必须小于100KB');
        return Upload.LIST_IGNORE;
      }

      const uploadFile: UploadFile = {
        uid: '-1',
        name: file.name,
        status: 'done',
        size: file.size,
        type: file.type,
      };

      setFileList([uploadFile]);
      setFile(file);
      return false;
    },
    onRemove: () => {
      setFileList([]);
      setFile(null);
      return true;
    }
  };

  const columns = [
    {
      title: '文件名',
      dataIndex: 'filename',
      key: 'filename',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: TaskStatus) => {
        return <span className={`status-badge status-${status}`}>{statusMap[status]}</span>;
      }
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString()
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Task) => (
        <Space>
          {record.status === 'completed' && (
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={() => handleDownload(record.id)}
            >
              下载
            </Button>
          )}
          {(record.status === 'queued' || record.status === 'processing') && (
            <Button
              danger
              icon={<StopOutlined />}
              onClick={() => handleCancel(record.id)}
            >
              终止
            </Button>
          )}
          {(record.status === 'completed' || record.status === 'failed' || record.status === 'cancelled') && (
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.id)}
            >
              删除
            </Button>
          )}
        </Space>
      )
    }
  ];

  // 显示使用说明
  const showInstructions = () => {
    Modal.info({
      title: '使用说明',
      width: 600,
      content: (
        <div className="instructions-content">
          <Title level={4}>文件格式要求</Title>
          <Paragraph>
            <ul>
              <li>仅支持 Excel 文件 (.xlsx 格式)</li>
              <li>文件大小限制：100KB</li>
              <li>单次处理数据量限制：5000条</li>
            </ul>
          </Paragraph>

          <Title level={4}>数据格式要求</Title>
          <Paragraph>
            <ul>
              <li>起点坐标：位于 C 列</li>
              <li>终点坐标：位于 F 列</li>
            </ul>
          </Paragraph>

          <Title level={4}>计算结果</Title>
          <Paragraph>
            <ul>
              <li>距离：将写入 G 列</li>
              <li>时间：将写入 H 列</li>
            </ul>
          </Paragraph>

          <Title level={4}>特别说明</Title>
          <Paragraph>
            <Text type="warning">
              由于 Google API 限制，单次处理数据量不能超过 5000 条。如果数据量较大，请分批处理。
            </Text>
          </Paragraph>
        </div>
      ),
      okText: '我知道了'
    });
  };

  return (
    <Card 
      title={
        <div className="card-title">
          <span>距离计算器</span>
          <Space>
            <Tooltip title="使用说明">
              <Button 
                type="text" 
                icon={<QuestionCircleOutlined />} 
                onClick={showInstructions}
              />
            </Tooltip>
            <Button 
              type="primary" 
              icon={<SyncOutlined />} 
              onClick={refreshTaskList}
            >
              刷新列表
            </Button>
          </Space>
        </div>
      } 
      className="distance-calculator-card"
    >
      <Spin spinning={loading}>
        <div className="calculator-container">
          <div className="upload-section">
            <Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持 .xlsx 格式的 Excel 文件，文件大小不超过 100KB
              </p>
            </Dragger>
          </div>

          <div className="tasks-section">
            <div className="tasks-header">
              <h3>任务列表</h3>
              <Text type="secondary">（每3分钟自动更新一次）</Text>
            </div>
            <Table
              columns={columns}
              dataSource={tasks}
              rowKey="id"
              pagination={false}
            />
          </div>

          <div className="action-section">
            <Button
              type="primary"
              onClick={handleCalculate}
              disabled={!file || loading}
              loading={loading}
              size="large"
            >
              开始计算
            </Button>
          </div>
        </div>
      </Spin>
    </Card>
  );
};

export default DistanceCalculator;