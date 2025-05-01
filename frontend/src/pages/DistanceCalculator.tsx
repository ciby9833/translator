// frontend/src/pages/DistanceCalculator.tsx
import React, { useState } from 'react';
import { Card, Button, message, Spin, Upload } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { distanceApi } from '../services/distance';
import type { UploadProps, UploadFile } from 'antd';
import './distance-calculator.css';

const { Dragger } = Upload;

const DistanceCalculator: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [file, setFile] = useState<File | null>(null);

  const handleCalculate = async () => {
    if (!file) {
      message.warning('请先选择文件');
      return;
    }

    try {
      setLoading(true);
      const blob = await distanceApi.calculateDistance(file);
      
      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `distance_result_${file.name}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      message.success('距离计算完成');
      setFile(null);
      setFileList([]);
    } catch (error) {
      console.error('计算失败:', error);
      message.error('计算失败，请重试');
    } finally {
      setLoading(false);
    }
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

  return (
    <Card title="距离计算器" className="distance-calculator-card">
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

          <div className="info-section">
            <h3>使用说明</h3>
            <ul>
              <li>上传 Excel 文件 (.xlsx 格式)</li>
              <li>起点坐标位于 C 列</li>
              <li>终点坐标位于 F 列</li>
              <li>计算结果将写入：
                <ul>
                  <li>距离 - G 列</li>
                  <li>时间 - H 列</li>
                </ul>
              </li>
              <li>文件大小限制：100KB</li>
              <li>特别说明，在计算时请勿关闭界面。</li>
            </ul>
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