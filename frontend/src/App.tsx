// frontend/src/App.tsx
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import FileUpload from './components/FileUpload'
import LanguageSelect from './components/LanguageSelect'
import TranslationStatus from './components/TranslationStatus'
import TextTranslate from './components/TextTranslate'
import TranslationModeSwitch from './components/TranslationModeSwitch'
import Footer from './components/Footer'
import { Tabs } from 'antd'
import { GlossaryList, GlossaryEditor } from './components/GlossaryManager'
import './style.css'
import { translateDocument } from './services/api'
import GlossaryDatabaseSearch from './components/GlossaryManager/GlossaryDatabaseSearch'
import { API_BASE_URL } from './config/env'

export type TranslationStatus = 
    'idle' | 
    'uploading' | 
    'processing' |      // 新增：文档处理
    'extracting' |      // 新增：术语提取
    'creating_glossary' | // 新增：创建术语表
    'translating' | 
    'downloading' | 
    'completed' | 
    'error';
export type TranslationMode = 'text' | 'document';

function App() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<TranslationMode>('text')
  const [status, setStatus] = useState<TranslationStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [targetLanguage, setTargetLanguage] = useState<string>(
    localStorage.getItem('targetLanguage') || 'ID'  // 默认印尼语
  )
  const [sourceLang, setSourceLang] = useState<string>(
    localStorage.getItem('sourceLang') || 'AUTO'
  )
  const [useGlossary, setUseGlossary] = useState<boolean>(true)

  useEffect(() => {
    localStorage.setItem('targetLanguage', targetLanguage);
  }, [targetLanguage]);

  useEffect(() => {
    localStorage.setItem('sourceLang', sourceLang);
  }, [sourceLang]);

  const handleSourceLangChange = (lang: string) => {
    setSourceLang(lang);
    localStorage.setItem('sourceLang', lang);
  };

  const handleTargetLangChange = (lang: string) => {
    setTargetLanguage(lang);
    localStorage.setItem('targetLanguage', lang);
  };

  const validateFile = (file: File): string | null => {
    const MAX_SIZE = 30 * 1024 * 1024; // 30MB
    const ALLOWED_TYPES = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];

    if (file.size > MAX_SIZE) {
      return t('error.fileTooLarge');
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return t('error.unsupportedFileType');
    }

    return null;
  };

  const handleTranslate = async () => {
    if (!selectedFile) return;

    try {
        if (useGlossary && (sourceLang === 'AUTO' || !sourceLang)) {
            setErrorMessage(t('error.sourceLanguageRequired'));
            setStatus('error');
            return;
        }

        setStatus('uploading');
        setErrorMessage('');
        
        const response = await translateDocument(
          selectedFile, 
          sourceLang, 
          targetLanguage, 
          useGlossary
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail?.message || 'Upload failed');
        }

        const { document_id, document_key, has_glossary } = await response.json();
        console.log('Upload successful:', { document_id, document_key, has_glossary });

        // 2. 轮询检查状态，需要考虑术语表处理的状态
        setStatus('translating');
        let retryCount = 0;
        const maxRetries = 30;  // 可能需要增加重试次数，因为要等待术语表处理

        const checkStatus = async () => {
            const response = await fetch(
                `${API_BASE_URL}/api/translate/${document_id}/status`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({ document_key })
                }
            );

            if (!response.ok) {
                throw new Error('Status check failed');
            }

            const statusData = await response.json();
            
            // 添加对处理阶段的判断
            switch(statusData.status) {
                case 'processing_document':
                    setStatus('processing');
                    break;
                case 'extracting_terms':
                    setStatus('extracting');
                    break;
                case 'creating_glossary':
                    setStatus('creating_glossary');
                    break;
                case 'translating':
                    setStatus('translating');
                    break;
                case 'done':
                    return true;
                case 'error':
                    throw new Error(statusData.message || t('error.translationFailed'));
            }
            return false;
        };

        // 修改状态检查循环
        while (retryCount < maxRetries) {
            const isDone = await checkStatus();
            if (isDone) break;
            
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        if (retryCount >= maxRetries) {
            throw new Error(t('error.timeout'));
        }

        // 3. 下载结果
        setStatus('downloading');
        const downloadResponse = await fetch(
            `${API_BASE_URL}/api/translate/${document_id}/result`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({ document_key })
            }
        );

        if (!downloadResponse.ok) {
            const errorData = await downloadResponse.json();
            throw new Error(errorData.detail?.message || errorData.detail || 'Download failed');
        }

        const blob = await downloadResponse.blob();
        if (blob.size === 0) {
            throw new Error(t('error.emptyFile'));
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = t('download.filename', { 
          filename: selectedFile.name 
        });
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        setStatus('completed');
        setSelectedFile(null);
        setTimeout(() => {
            setStatus('idle');
        }, 2000);

    } catch (error) {
        console.error('Translation error:', error);
        setStatus('error');
        setErrorMessage(t('error.translationFailed'));
    }
  };
  // 打印当前状态日志
  useEffect(() => {
    console.log('Current status:', status);
    console.log('Selected file:', selectedFile?.name);
    console.log('Target language:', targetLanguage);
  }, [status, selectedFile, targetLanguage]);

  // 添加对源语言的监听
  useEffect(() => {
    // 当启用术语表时，如果源语言是 AUTO，则设置为默认语言（如 'ZH'）
    if (useGlossary && sourceLang === 'AUTO') {
      setSourceLang('ZH');  // 或其他默认语言
    }
  }, [useGlossary, sourceLang]);

  // 在 App.tsx 中添加状态检查日志  2025-04-29 上传按钮跟踪
  useEffect(() => {
    console.log('Current status:', {
      mode: mode,
      selectedFile: selectedFile?.name,
      status: status,
      isButtonDisabled: !selectedFile || (status !== 'idle' && status !== 'completed' && status !== 'error')
    });
  }, [mode, selectedFile, status]);

  // 定义主标签页的 items
  const mainTabItems = [
    {
      key: 'translation',
      label: t('tabs.translation'),
      children: (
        <div className="card">
          <TranslationModeSwitch mode={mode} onModeChange={setMode} />
          <div className="translation-content">
            {mode === 'text' ? (
              <TextTranslate 
                disabled={status !== 'idle' && status !== 'completed' && status !== 'error'}
              />
            ) : (
              <>
                <FileUpload
                  onFileSelect={setSelectedFile}
                  selectedFile={selectedFile}
                  disabled={status !== 'idle' && status !== 'completed' && status !== 'error'}
                />
                <div className="language-controls">
                  <LanguageSelect
                    value={sourceLang}
                    onChange={handleSourceLangChange}
                    disabled={status !== 'idle' && status !== 'completed' && status !== 'error'}
                    isSource={true}
                    disableAuto={useGlossary}
                  />
                  <LanguageSelect
                    value={targetLanguage}
                    onChange={handleTargetLangChange}
                    disabled={status !== 'idle' && status !== 'completed' && status !== 'error'}
                  />
                  <div className="glossary-control">
                    <label>
                      <input
                        type="checkbox"
                        checked={useGlossary}
                        onChange={(e) => setUseGlossary(e.target.checked)}
                        disabled={status !== 'idle' && status !== 'completed' && status !== 'error'}
                      />
                      {t('useGlossary')}
                    </label>
                  </div>
                </div>
                <button
                  onClick={handleTranslate}
                  disabled={!selectedFile || (status !== 'idle' && status !== 'completed' && status !== 'error')}
                  className="translate-button"
                >
                  {t('button.translate')}
                </button>
                <TranslationStatus status={status} errorMessage={errorMessage} />
              </>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'glossary',
      label: t('tabs.glossaryManagement'),
      children: (
        <div className="card">
          <Tabs
            defaultActiveKey="databaseSearch"
            items={[
              {
                key: 'databaseSearch',
                label: t('glossary.databaseSearch'),
                children: <GlossaryDatabaseSearch />
              },
              {
                key: 'list',
                label: t('glossary.list'),
                children: <GlossaryList />
              }
            ]}
          />
        </div>
      )
    }
  ];

  return (
    <div className="app-container">
      <div className="container">
        <div className="header">
          <h1>{t('title')}</h1>
        </div>
        <Tabs defaultActiveKey="translation" className="main-tabs" items={mainTabItems} />
      </div>
      <Footer />
    </div>
  )
}

export default App