// frontend/src/App.tsx
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import FileUpload from './components/FileUpload'
import LanguageSelect from './components/LanguageSelect'
import TranslationStatus from './components/TranslationStatus'
import LanguageSwitch from './components/LanguageSwitch'
import TextTranslate from './components/TextTranslate'
import TranslationModeSwitch from './components/TranslationModeSwitch'
import Footer from './components/Footer'
import './style.css'

export type TranslationStatus = 'idle' | 'uploading' | 'translating' | 'downloading' | 'completed' | 'error';
export type TranslationMode = 'text' | 'document';

function App() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<TranslationMode>('text')
  const [status, setStatus] = useState<TranslationStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [targetLanguage, setTargetLanguage] = useState<string>('EN')

  const validateFile = (file: File): string | null => {
    const MAX_SIZE = 30 * 1024 * 1024; // 30MB
    const ALLOWED_TYPES = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];

    if (file.size > MAX_SIZE) {
      return 'File is too large. Maximum size is 30MB.';
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Unsupported file type. Only PDF, DOCX, and PPTX files are supported.';
    }

    return null;
  };

  const handleTranslate = async () => {
    if (!selectedFile) return;

    try {
        if (selectedFile.size > 30 * 1024 * 1024) { // 30MB
            throw new Error(t('error.fileTooLarge'));
        }

        setStatus('uploading');
        setErrorMessage('');
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('target_lang', targetLanguage);

        // 1. 上传文档 - 添加 timeout 控制
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 180000); // 180秒超时

        const uploadResponse = await fetch('http://localhost:8000/api/translate', {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!uploadResponse.ok) {
            let errorMessage;
            try {
                const errorData = await uploadResponse.json();
                errorMessage = errorData.detail?.message || errorData.detail;
            } catch {
                // 如果解析 JSON 失败，使用状态码相关的错误信息
                errorMessage = uploadResponse.status === 413 ? 
                    t('error.fileTooLarge') : 
                    `Upload failed (${uploadResponse.status})`;
            }
            throw new Error(errorMessage || 'Upload failed');
        }

        const { document_id, document_key } = await uploadResponse.json();
        console.log('Upload successful:', { document_id, document_key });

        // 2. 轮询检查状态
        setStatus('translating');
        let retryCount = 0;
        const maxRetries = 30;

        while (retryCount < maxRetries) {
            console.log(`Checking status (attempt ${retryCount + 1})...`);
            try {
                const statusResponse = await fetch(
                    `http://localhost:8000/api/translate/${document_id}/status?document_key=${document_key}`,
                    {
                        method: 'POST'
                    }
                );

                if (!statusResponse.ok) {
                    const errorData = await statusResponse.json();
                    throw new Error(errorData.detail?.message || errorData.detail || 'Status check failed');
                }

                const status = await statusResponse.json();
                console.log('Translation status:', status);
                
                if (status.status === 'done') {
                    break;
                } else if (status.status === 'error') {
                    throw new Error(status.message || 'Translation failed');
                }

                retryCount++;
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                console.error('Status check error:', error);
                throw error;
            }
        }

        if (retryCount >= maxRetries) {
            throw new Error(t('error.timeout'));
        }

        // 3. 下载结果
        setStatus('downloading');
        const downloadResponse = await fetch(
            `http://localhost:8000/api/translate/${document_id}/download?document_key=${document_key}`,
            {
                method: 'POST'
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
        a.download = `translated_${selectedFile.name}`;
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
        
        // 优化错误消息处理
        let errorMessage;
        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                errorMessage = t('error.uploadTimeout');
            } else {
                errorMessage = error.message;
            }
        } else {
            errorMessage = t('error.unexpected');
        }
        setErrorMessage(errorMessage);
    }
  };
  // 打印当前状态日志
  useEffect(() => {
    console.log('Current status:', status);
    console.log('Selected file:', selectedFile?.name);
    console.log('Target language:', targetLanguage);
  }, [status, selectedFile, targetLanguage]);

  return (
    <div className="app-container">
      <div className="container">
        <div className="header">
          <h1>{t('title')}</h1>
        </div>
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
                <LanguageSelect
                  value={targetLanguage}
                  onChange={setTargetLanguage}
                  disabled={status !== 'idle' && status !== 'completed' && status !== 'error'}
                />
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
      </div>
      <Footer />
    </div>
  )
}

export default App