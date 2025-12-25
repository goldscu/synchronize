import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from './ThemeContext';
import './App.css';
import './App-dark.css';

const App: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className={`App ${theme}`}>
      <header className="App-header">
        <h1>{t('app.title')}</h1>
        <p>{t('app.description')}</p>
        <div className="feature-box">
          <h3>{t('app.techStack.title')}</h3>
          <ul>
            <li>{t('app.techStack.react')}</li>
            <li>{t('app.techStack.typescript')}</li>
            <li>{t('app.techStack.webpack')}</li>
          </ul>
        </div>
        <div className="controls">
          <div className="language-switcher">
            <button onClick={() => changeLanguage('zh')}>
              {t('app.language.chinese')}
            </button>
            <button onClick={() => changeLanguage('en')}>
              {t('app.language.english')}
            </button>
          </div>
          <div className="theme-switcher">
            <button onClick={toggleTheme}>
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
        </div>
      </header>
    </div>
  );
};

export default App;