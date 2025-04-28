// frontend/src/components/TranslatorSelect.tsx   翻译选择器 默认deepl
import { useTranslation } from 'react-i18next';
import React, { useEffect } from 'react';

interface TranslatorSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const TranslatorSelect = ({ value, onChange, disabled }: TranslatorSelectProps) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (!value) {
      onChange('deepl');
    }
  }, []);

  return (
    <div className="translator-select">
      <label htmlFor="translator">{t('translator.title')}</label>
      <select
        id="translator"
        value="deepl"
        disabled={true}
      >
        <option value="deepl">DeepL</option>
      </select>
    </div>
  );
};

export default TranslatorSelect;
