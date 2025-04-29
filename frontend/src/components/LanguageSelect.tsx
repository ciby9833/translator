// frontend/src/components/LanguageSelect.tsx   文档翻译语言选择器
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Language } from '@/types';  // 添加类型导入

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

    // 修改语言列表顺序，把印尼语放在前面
    const LANGUAGES: Language[] = [
        { code: 'AUTO', name: t('language.AUTO') },
        { code: 'ID', name: t('language.ID') },  // 把印尼语放在前面
        { code: 'ZH', name: t('language.ZH') },
        { code: 'EN', name: t('language.EN') },
    ];

    // 根据是否为源语言选择器过滤语言列表
    const languages = React.useMemo(() => {
        if (isSource) {
            return disableAuto ? LANGUAGES.filter(lang => lang.code !== 'AUTO') : LANGUAGES;
        }
        return LANGUAGES.filter(lang => lang.code !== 'AUTO');
    }, [isSource, disableAuto]);

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
                {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                        {t(`language.${lang.code}`)}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default LanguageSelect