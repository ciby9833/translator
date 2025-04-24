// frontend/src/components/LanguageSwitch.tsx   语言切换
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: '中文' },
  { code: 'id', name: 'Bahasa Indonesia' }
];

const LanguageSwitch = () => {
  const { i18n } = useTranslation();

  return (
    <select 
      value={i18n.language}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
      className="language-switch"
    >
      {LANGUAGES.map(({ code, name }) => (
        <option key={code} value={code}>
          {name}
        </option>
      ))}
    </select>
  );
};

export default LanguageSwitch;
