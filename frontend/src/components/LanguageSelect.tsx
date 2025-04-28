// frontend/src/components/LanguageSelect.tsx   文档翻译语言选择器
import React, { useTranslation } from 'react-i18next';

interface LanguageSelectProps {
    value: string
    onChange: (value: string) => void
    disabled?: boolean
    compact?: boolean
    isSource?: boolean  // 新增：是否为源语言选择器
    disableAuto?: boolean  // 新增属性
}

const LanguageSelect: React.FC<LanguageSelectProps> = ({ value, onChange, disabled, compact, isSource, disableAuto }) => {
    const { t } = useTranslation();

    // 移除硬编码的语言列表
    const LANGUAGES = [
        { code: 'AUTO', name: t('language.AUTO'), sourceOnly: true },
        { code: 'EN', name: t('language.EN') },
        { code: 'ZH', name: t('language.ZH') },
        { code: 'ID', name: t('language.ID') },
    ] as const;

    const languages = isSource 
        ? LANGUAGES 
        : LANGUAGES.filter(lang => lang.code !== 'AUTO');

    return (
        <div className={`language-select ${compact ? 'compact' : ''}`}>
            {!compact && (
                <label htmlFor="language">
                    {isSource ? t('sourceLanguage') : t('targetLanguage')}
                </label>
            )}
            <select
                id="language"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className={compact ? 'compact' : ''}
            >
                {isSource && !disableAuto && (
                    <option value="AUTO">{t('language.AUTO')}</option>
                )}
                {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                        {t(`language.${lang.code}`)}
                    </option>
                ))}
            </select>
        </div>
    )
}

export default LanguageSelect