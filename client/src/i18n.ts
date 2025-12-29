import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 导入语言资源
import zhTranslation from './locales/zh/translation.json';
import enTranslation from './locales/en/translation.json';

// 配置i18n
i18n
  .use(LanguageDetector) // 自动检测用户语言
  .use(initReactI18next) // 绑定react-i18next
  .init({
    resources: {
      zh: {
        translation: zhTranslation
      },
      en: {
        translation: enTranslation
      }
    },
    lng: localStorage.getItem('language') || 'zh', // 优先使用本地存储的语言设置
    fallbackLng: 'zh', // 默认语言
    debug: process.env.NODE_ENV === 'development',
    
    interpolation: {
      escapeValue: false // React已经默认转义
    }
  });

export default i18n;