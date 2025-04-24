// 切换文本翻译或文档翻译
// frontend/src/components/TranslationModeSwitch.tsx
import { useTranslation } from 'react-i18next';
import './TranslationModeSwitch.css';

interface TranslationModeSwitchProps {
  mode: 'text' | 'document';
  onModeChange: (mode: 'text' | 'document') => void;
}

const TranslationModeSwitch = ({ mode, onModeChange }: TranslationModeSwitchProps) => {
  const { t } = useTranslation();

  return (
    <div className="translation-mode-switch">
      <button
        className={`mode-button ${mode === 'text' ? 'active' : ''}`}
        onClick={() => onModeChange('text')}
      >
        {t('mode.text')}
      </button>
      <button
        className={`mode-button ${mode === 'document' ? 'active' : ''}`}
        onClick={() => onModeChange('document')}
      >
        {t('mode.document')}
      </button>
    </div>
  );
};

export default TranslationModeSwitch;