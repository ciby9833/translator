// frontend/src/components/TextTranslate.tsx   文本翻译
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import './TextTranslate.css';
import { translateText } from '../services/api';
import { debounce } from 'lodash';

interface TextTranslateProps {
  disabled?: boolean;
}

interface Language {
  code: string;
  name: string;
  autoDetect?: boolean;
}

const LANGUAGES: Language[] = [
  { code: 'AUTO', name: '自动检测', autoDetect: true },
  { code: 'ID', name: '印尼语' },
  { code: 'ZH', name: '中文' },
  { code: 'EN', name: '英语' },
];

// 修改常量配置
const DEBOUNCE_DELAY = 3000; // 修改为3秒延迟
const MAX_CHARACTERS = 3000;

// 添加工具函数处理空白字符
const removeExtraWhitespace = (text: string) => {
  return text.trim().replace(/\s+/g, ' ');
};

// 修改工具函数，添加检查最后一个字符是否为空格
const isLastCharSpace = (text: string) => {
  return text.charAt(text.length - 1) === ' ';
};

const TextTranslate = ({ disabled }: TextTranslateProps) => {
  const { t } = useTranslation();
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState('');
  const [sourceLang, setSourceLang] = useState<string>(
    localStorage.getItem('textSourceLang') || 'AUTO'
  );
  const [targetLang, setTargetLang] = useState<string>(
    localStorage.getItem('textTargetLang') || 'ID'
  );
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [lastTranslatedText, setLastTranslatedText] = useState('');
  const [lastValidText, setLastValidText] = useState('');
  const [pendingText, setPendingText] = useState('');

  // 修改自动翻译函数，将 debounce 移到组件外部
  const debouncedTranslate = useCallback(
    debounce(async (text: string, targetLang: string) => {
      const processedText = removeExtraWhitespace(text);
      if (!processedText || disabled) return;
      
      try {
        setIsTranslating(true);
        setError('');
        
        const response = await translateText(processedText, targetLang);
        if (!response.ok) {
          throw new Error(await response.text());
        }

        const result = await response.json();
        setTranslatedText(result.translations[0].text);
        setLastValidText(processedText);
      } catch (error) {
        setError(t('error.translationFailed'));
      } finally {
        setIsTranslating(false);
      }
    }, DEBOUNCE_DELAY),
    [disabled, t]
  );

  // 添加立即翻译函数（不带防抖）
  const translateImmediate = useCallback(async (text: string, targetLang: string) => {
    const processedText = removeExtraWhitespace(text);
    if (!processedText || disabled) return;
    
    try {
      setIsTranslating(true);
      setError('');
      
      const response = await translateText(processedText, targetLang);
      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result = await response.json();
      setTranslatedText(result.translations[0].text);
      setLastValidText(processedText);
    } catch (error) {
      setError(t('error.translationFailed'));
    } finally {
      setIsTranslating(false);
    }
  }, [disabled, t]);

  // 修改文本变化处理函数
  const handleTextChange = (text: string) => {
    setSourceText(text);
    
    // 更新历史记录
    const newHistory = [...history.slice(0, historyIndex + 1), text];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    
    // 如果内容为空，直接清空翻译结果
    if (!text.trim()) {
      setTranslatedText('');
      setLastValidText('');
      return;
    }

    // 如果是空格结尾，不触发翻译
    if (isLastCharSpace(text)) return;

    // 调用防抖函数，会在 3 秒内的最后一次调用后执行
    debouncedTranslate(text, targetLang);
  };

  // 修改清除函数
  const handleClear = () => {
    setSourceText('');
    setTranslatedText('');
    setLastTranslatedText('');
    setLastValidText('');
    setPendingText('');
    setHistory([]);
    setHistoryIndex(-1);
    setError('');
  };

  // 修改撤销/重做函数
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const newText = history[newIndex];
      setHistoryIndex(newIndex);
      setSourceText(newText);
      
      if (newText.trim() && !isLastCharSpace(newText)) {
        debouncedTranslate(newText, targetLang);
      }
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const newText = history[newIndex];
      setHistoryIndex(newIndex);
      setSourceText(newText);
      
      if (newText.trim() && !isLastCharSpace(newText)) {
        debouncedTranslate(newText, targetLang);
      }
    }
  };

  // 修改语言切换函数
  const handleSwapLanguages = () => {
    if (!translatedText) return;

    const newSourceLang = targetLang;
    const newTargetLang = sourceLang === 'AUTO' 
      ? LANGUAGES.find(lang => !lang.autoDetect)?.code || 'ZH' 
      : sourceLang;
    
    setSourceLang(newSourceLang);
    setTargetLang(newTargetLang);
    setSourceText(translatedText);
    setTranslatedText('');
    
    // 更新历史记录
    setHistory([...history.slice(0, historyIndex + 1), translatedText]);
    setHistoryIndex(historyIndex + 1);
  };

  // 添加复制函数
  const handleCopy = async () => {
    if (!translatedText) return;
    
    try {
      await navigator.clipboard.writeText(translatedText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 1000);
    } catch (error) {
      setError(t('error.copyFailed'));
    }
  };

  // 添加键盘快捷键处理
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ctrl+Enter 触发翻译
    if (e.ctrlKey && e.key === 'Enter') {
      if (sourceText.trim()) {
        debouncedTranslate(sourceText, targetLang);
      }
    }
    
    // Ctrl+C 复制翻译结果（当焦点在翻译结果框时）
    if (e.ctrlKey && e.key === 'c' && document.activeElement?.classList.contains('translated')) {
      e.preventDefault();
      handleCopy();
    }
  }, [sourceText, debouncedTranslate, handleCopy]);

  // 添加键盘事件监听
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // 修改语言切换时的翻译处理
  useEffect(() => {
    if (sourceText.trim() && !isLastCharSpace(sourceText)) {
      // 语言切换时立即翻译
      translateImmediate(sourceText, targetLang);
    }
  }, [targetLang, translateImmediate]);

  // 修改输入法完成事件处理
  const handleCompositionEnd = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
    setIsComposing(false);
    const text = e.currentTarget.value;
    if (text.trim() && !isLastCharSpace(text)) {
      debouncedTranslate(text, targetLang);
    }
  };

  // 添加语言选择持久化
  useEffect(() => {
    localStorage.setItem('textSourceLang', sourceLang);
  }, [sourceLang]);

  useEffect(() => {
    localStorage.setItem('textTargetLang', targetLang);
  }, [targetLang]);

  // 修改语言选择处理函数
  const handleSourceLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    setSourceLang(newLang);
    localStorage.setItem('textSourceLang', newLang);
    
    // 如果有文本，立即触发翻译
    if (sourceText.trim() && !isLastCharSpace(sourceText)) {
      translateImmediate(sourceText, targetLang);
    }
  };

  // 修改目标语言选择处理函数
  const handleTargetLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    setTargetLang(newLang);
    localStorage.setItem('textTargetLang', newLang);
    
    // 如果有文本，立即触发翻译
    if (sourceText.trim() && !isLastCharSpace(sourceText)) {
      translateImmediate(sourceText, newLang);
    }
  };

  return (
    <div className="text-translate-container">
      <div className="text-area-wrapper">
        <div className="text-area-container">
          <div className="language-select-group">
            <select
              value={sourceLang}
              onChange={handleSourceLangChange}
              disabled={disabled || isTranslating}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.autoDetect ? `${lang.name}` : lang.name}
                </option>
              ))}
            </select>
          </div>
          <textarea
            className="text-area source"
            placeholder={t('textTranslate.sourcePlaceholder')}
            value={sourceText}
            onChange={(e) => handleTextChange(e.target.value)}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={handleCompositionEnd}
            disabled={disabled}
          />
          <div className="text-area-controls">
            <button
              className="icon-button"
              onClick={() => handleClear()}
              disabled={!sourceText}
              title={t('button.clear')}
            >
              <span className="material-icons">close</span>
            </button>
            <button
              className="icon-button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              title={t('button.undo')}
            >
              <span className="material-icons">undo</span>
            </button>
            <button
              className="icon-button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              title={t('button.redo')}
            >
              <span className="material-icons">redo</span>
            </button>
          </div>
          <div className="character-count">
            {sourceText.length} / 3000
          </div>
          <div className="shortcut-hint">
            Ctrl + Enter {t('textTranslate.shortcutTranslate')}
          </div>
        </div>

        <div className="text-area-container">
          <div className="language-select-group target">
            <button
              className="swap-button"
              onClick={handleSwapLanguages}
              disabled={disabled || isTranslating || !translatedText}
              title={t('button.swap')}
            >
              <span className="material-icons">swap_horiz</span>
            </button>
            <select
              value={targetLang}
              onChange={handleTargetLangChange}
              disabled={disabled || isTranslating}
            >
              {LANGUAGES.filter(lang => !lang.autoDetect).map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
          <textarea
            className="text-area translated"
            placeholder={t('textTranslate.translatedPlaceholder')}
            value={translatedText}
            readOnly
          />
          <div className="translated-controls">
            <button
              className={`icon-button ${copySuccess ? 'copy-success' : ''}`}
              onClick={handleCopy}
              disabled={!translatedText}
              title={`${t('button.copy')} (Ctrl+C)`}
            >
              <span className="material-icons">
                {copySuccess ? 'check' : 'content_copy'}
              </span>
            </button>
          </div>
          <div className="shortcut-hint">
            Ctrl + C {t('textTranslate.shortcutCopy')}
          </div>
        </div>
      </div>
      
      <div className="controls">
        {error && <div className="error-message">{error}</div>}
        {isTranslating && <div className="translating-message">{t('textTranslate.translating')}</div>}
      </div>
    </div>
  );
};

export default TextTranslate;
