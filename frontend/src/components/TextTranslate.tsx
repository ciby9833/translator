// frontend/src/components/TextTranslate.tsx   文本翻译
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './TextTranslate.css';
import { translateText } from '../services/api';

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

const TextTranslate = ({ disabled }: TextTranslateProps) => {
  const { t } = useTranslation();
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState('');
  const [sourceLang, setSourceLang] = useState<string>('AUTO');
  const [targetLang, setTargetLang] = useState<string>('ZH');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const handleTextChange = (text: string) => {
    setSourceText(text);
    setHistory([...history.slice(0, historyIndex + 1), text]);
    setHistoryIndex(historyIndex + 1);
  };

  const handleClear = () => {
    setSourceText('');
    setHistory([]);
    setHistoryIndex(-1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setSourceText(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setSourceText(history[historyIndex + 1]);
    }
  };

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;
    setIsTranslating(true);
    setError('');

    try {
      const response = await translateText(sourceText, targetLang);
      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result = await response.json();
      setTranslatedText(result.translations[0].text);
    } catch (error) {
      setError(t('error.translationFailed'));
    } finally {
      setIsTranslating(false);
    }
  };

  // 改进的语言交换函数
  const handleSwapLanguages = async () => {
    // 如果没有翻译结果，不执行交换
    if (!translatedText) return;

    const newSourceLang = targetLang;
    const newTargetLang = sourceLang === 'AUTO' 
      ? LANGUAGES.find(lang => !lang.autoDetect)?.code || 'ZH' 
      : sourceLang;
    
    // 保存当前的翻译文本
    const newSourceText = translatedText;
    const newTranslatedText = sourceText;
    
    // 更新状态
    setSourceLang(newSourceLang);
    setTargetLang(newTargetLang);
    setSourceText(newSourceText);
    setTranslatedText(''); // 清空翻译结果
    
    // 更新历史记录
    setHistory([...history.slice(0, historyIndex + 1), newSourceText]);
    setHistoryIndex(historyIndex + 1);
    
    // 使用 setTimeout 确保状态更新后再进行翻译
    setTimeout(async () => {
      try {
        const formData = new FormData();
        formData.append('text', newSourceText);
        formData.append('target_lang', newTargetLang);

        setIsTranslating(true);
        const response = await fetch('http://localhost:8000/api/translate/text', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const result = await response.json();
        setTranslatedText(result.translations[0].text);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Translation failed');
        // 如果翻译失败，恢复原来的文本
        setTranslatedText(newTranslatedText);
      } finally {
        setIsTranslating(false);
      }
    }, 0);
  };

  return (
    <div className="text-translate-container">
      <div className="text-area-wrapper">
        <div className="text-area-container">
          <div className="language-select-group">
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
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
            disabled={disabled || isTranslating}
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
              onChange={(e) => setTargetLang(e.target.value)}
              disabled={disabled || isTranslating}
            >
              {LANGUAGES.filter(lang => !lang.autoDetect).map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.code === 'ZH' ? `${lang.name}` : lang.name}
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
              className="icon-button"
              onClick={() => navigator.clipboard.writeText(translatedText)}
              disabled={!translatedText}
              title={t('button.copy')}
            >
              <span className="material-icons">content_copy</span>
            </button>
            <button
              className="icon-button"
              onClick={() => {/* 添加到收藏 */}}
              disabled={!translatedText}
              title={t('button.favorite')}
            >
              <span className="material-icons">bookmark_border</span>
            </button>
            <button
              className="icon-button"
              onClick={() => {/* 分享功能 */}}
              disabled={!translatedText}
              title={t('button.share')}
            >
              <span className="material-icons">share</span>
            </button>
          </div>
        </div>
      </div>
      
      <div className="controls">
        <div className="translate-controls">
          <button
            className="translate-button"
            onClick={handleTranslate}
            disabled={disabled || isTranslating || !sourceText.trim()}
          >
            {isTranslating ? t('textTranslate.translating') : t('textTranslate.translate')}
          </button>
        </div>
        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );
};

export default TextTranslate;
