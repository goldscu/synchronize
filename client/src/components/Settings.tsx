import React from 'react';
import { useTranslation } from 'react-i18next';

interface SettingsProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onChangeLanguage: (lng: string) => void;
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({
  isDarkMode,
  onToggleDarkMode,
  onChangeLanguage,
  onClose
}) => {
  const { t, i18n } = useTranslation();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {t('settings')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Language Settings */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
              {t('language')}
            </h3>
            <div className="flex space-x-3">
              <button
                onClick={() => onChangeLanguage('en')}
                className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                  i18n.language === 'en'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                English
              </button>
              <button
                onClick={() => onChangeLanguage('zh')}
                className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                  i18n.language === 'zh'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                中文
              </button>
            </div>
          </div>

          {/* Theme Settings */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
              {t('theme')}
            </h3>
            <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                  isDarkMode ? 'bg-gray-800 text-white' : 'bg-yellow-400 text-gray-900'
                }`}>
                  {isDarkMode ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  )}
                </div>
                <span className="text-gray-700 dark:text-gray-300">
                  {isDarkMode ? t('darkMode') : t('lightMode')}
                </span>
              </div>
              <button
                onClick={onToggleDarkMode}
                className="w-12 h-6 bg-gray-300 dark:bg-gray-600 rounded-full relative transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                <span
                  className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                    isDarkMode ? 'transform translate-x-6' : ''
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Version Info */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Secure Chat v1.0.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;