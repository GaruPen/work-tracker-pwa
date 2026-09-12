import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import ru from './locales/ru.json';
import pl from './locales/pl.json';
import uk from './locales/uk.json';
import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';

const resources = {
  'zh-CN': { translation: zhCN },
  ru: { translation: ru },
  pl: { translation: pl },
  uk: { translation: uk },
  en: { translation: en },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'zh-CN',
    fallbackLng: 'zh-CN',
    interpolation: { escapeValue: false },
  });

export default i18n;
