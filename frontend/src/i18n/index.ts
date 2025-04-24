import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en';
import zh from './locales/zh';
import id from './locales/id';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en,
      zh,
      id,
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'zh', 'id'],
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
