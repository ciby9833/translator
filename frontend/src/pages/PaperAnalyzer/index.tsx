// frontend/src/pages/PaperAnalyzer/index.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Card, Upload, Button, Input, message, List, Layout, Spin, Select, Tooltip } from 'antd';
import { 
  InboxOutlined, 
  SendOutlined, 
  FileTextOutlined, 
  TranslationOutlined,
  PaperClipOutlined,
  DeleteOutlined,
  RightOutlined,
  LeftOutlined
} from '@ant-design/icons';
import { paperAnalyzerApi } from '../../services/paperAnalyzer';
import './styles.css';

const { TextArea } = Input;
const { Sider, Content } = Layout;
const { Option } = Select;

const PaperAnalyzer: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [responses, setResponses] = useState<Array<{question: string, answer: string}>>([]);
  const [documentContent, setDocumentContent] = useState<string>('');
  const [currentPaperId, setCurrentPaperId] = useState<string>('');
  const [collapsed, setCollapsed] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [languages, setLanguages] = useState<Record<string, string>>({});
  const [translationLoading, setTranslationLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  // 处理文件上传
  const handleFileUpload = async (file: File) => {
    try {
      setLoading(true);
      setSelectedFile(file);
      const result = await paperAnalyzerApi.analyzePaper(file);
      if (result.status === 'success' && result.paper_id) {
        setCurrentPaperId(result.paper_id);
        if (result.content) {
          setDocumentContent(result.content);
        } else {
          const content = await paperAnalyzerApi.getDocumentContent(result.paper_id);
          setDocumentContent(content);
        }
        message.success('论文分析完成');
      } else {
        message.error(result.message || '论文分析失败');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      message.error('论文分析失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理提问
  const handleAsk = async () => {
    if (!question.trim() && !selectedFile) {
      message.warning('请输入问题或上传文件');
      return;
    }

    try {
      setLoading(true);
      const result = await paperAnalyzerApi.askQuestion(question, 'current_paper_id');
      setResponses(prev => [...prev, { question, answer: result.response }]);
      setQuestion('');
      setSelectedFile(null);
      
      // 滚动到最新消息
      setTimeout(() => {
        if (chatMessagesRef.current) {
          chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
      }, 100);
    } catch (error) {
      message.error('提问失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取支持的语言列表
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const supportedLanguages = await paperAnalyzerApi.getSupportedLanguages();
        setLanguages(supportedLanguages);
      } catch (error) {
        console.error('Failed to fetch languages:', error);
      }
    };
    fetchLanguages();
  }, []);

  // 处理翻译
  const handleTranslate = async () => {
    if (!currentPaperId || !selectedLanguage) {
      message.warning('请选择目标语言');
      return;
    }

    try {
      setTranslationLoading(true);
      const translated = await paperAnalyzerApi.translatePaper(currentPaperId, selectedLanguage);
      setTranslatedContent(translated);
      message.success('翻译完成');
    } catch (error: any) {
      console.error('Translation error:', error);
      message.error(error.message || '翻译失败');
    } finally {
      setTranslationLoading(false);
    }
  };

  // 渲染文档内容（原文和翻译对照）
  const renderDocumentContent = () => {
    if (loading) {
      return (
        <div className="loading-container">
          <Spin size="large" />
          <p>正在分析文档...</p>
        </div>
      );
    }

    if (!documentContent) {
      return (
        <div className="empty-document">
          <FileTextOutlined style={{ fontSize: '48px' }} />
          <p>请上传并分析文档</p>
        </div>
      );
    }

    return (
      <div className="document-viewer">
        <div className="document-header">
          <div className="header-left">
            <FileTextOutlined /> {selectedFile?.name}
          </div>
          <div className="header-right">
            <Select
              style={{ width: 200 }}
              placeholder="选择目标语言"
              value={selectedLanguage}
              onChange={setSelectedLanguage}
            >
              {Object.entries(languages).map(([code, name]) => (
                <Option key={code} value={code}>{name}</Option>
              ))}
            </Select>
            <Button
              type="primary"
              icon={<TranslationOutlined />}
              onClick={handleTranslate}
              loading={translationLoading}
              disabled={!selectedLanguage}
            >
              翻译
            </Button>
          </div>
        </div>
        <div className="document-content-split">
          <div className="original-content">
            <h3>原文</h3>
            {documentContent.split('\n').map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
          <div className="translated-content">
            <h3>翻译</h3>
            {translatedContent ? (
              translatedContent.split('\n').map((line, index) => (
                <p key={index}>{line}</p>
              ))
            ) : (
              <div className="empty-translation">
                <TranslationOutlined style={{ fontSize: '24px' }} />
                <p>请选择语言并点击翻译按钮</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Layout className="paper-analyzer-layout">
      <Sider 
        width={400}
        collapsible={false}
        collapsed={collapsed}
        className="paper-analyzer-sider"
      >
        <div className="chat-container">
          <div className="chat-header">
            <span className="chat-title">聊天</span>
            <Button
              type="text"
              icon={collapsed ? <RightOutlined /> : <LeftOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="collapse-button"
              title={collapsed ? "展开" : "收起"}
            />
          </div>
          <div className="chat-messages" ref={chatMessagesRef}>
            <List
              className="response-list"
              itemLayout="vertical"
              dataSource={responses}
              renderItem={(item) => (
                <List.Item className="chat-message">
                  <div className="message-bubble question-bubble">
                    <div className="message-header">问</div>
                    <div className="message-content">{item.question}</div>
                  </div>
                  <div className="message-bubble answer-bubble">
                    <div className="message-header">答</div>
                    <div className="message-content">{item.answer}</div>
                  </div>
                </List.Item>
              )}
            />
          </div>
          
          <div className="chat-input-container">
            {selectedFile && (
              <div className="selected-file">
                <PaperClipOutlined />
                <span className="file-name">{selectedFile.name}</span>
                <Button 
                  type="text" 
                  icon={<DeleteOutlined />} 
                  onClick={() => setSelectedFile(null)}
                />
              </div>
            )}
            <div className="input-area">
              <TextArea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="请输入您的问题或上传文件"
                rows={3}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    handleAsk();
                  }
                }}
              />
              <div className="input-actions">
                <div className="left-actions">
                  <Upload
                    accept=".pdf"
                    maxCount={1}
                    showUploadList={false}
                    beforeUpload={(file) => {
                      handleFileUpload(file);
                      return false;
                    }}
                  >
                    <Tooltip title="上传文件">
                      <Button icon={<PaperClipOutlined />} />
                    </Tooltip>
                  </Upload>
                </div>
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleAsk}
                  loading={loading}
                  disabled={!currentPaperId}
                >
                  发送
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Sider>

      <Content className="paper-analyzer-content">
        {renderDocumentContent()}
      </Content>
    </Layout>
  );
};

export default PaperAnalyzer;