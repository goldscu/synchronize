import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from './ThemeContext';
import i18n from 'i18next';
import { RoomType } from '../../shared/WebSocketProtocol';
import './App.css';
import './App-dark.css';

const App: React.FC = () => {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [currentRoom, setCurrentRoom] = useState<RoomType>('public'); // 默认进入公开房间
  
  // 更新页面标题
  useEffect(() => {
    document.title = t('title');
    
    // 更新 HTML lang 属性
    const htmlElement = document.documentElement;
    htmlElement.lang = i18n.language === 'zh' ? 'zh-CN' : 'en-US';
  }, [t, i18n.language]);
  
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const currentLanguage = i18n.language;
  
  // 切换房间
  const switchRoom = (roomType: RoomType) => {
    setCurrentRoom(roomType);
  };

  // 获取当前房间名称
  const getRoomName = () => {
    if (currentRoom === 'public') {
      return t('room.public');
    } else if (currentRoom === 'private') {
      // 暂时不显示房间名，等后续处理WebSocket数据时再添加
      return t('room.private');
    }
    return '';
  };

  return (
    <div className={`app ${theme}`}>
      <header className="main-header">
        <div className="header-left">
          <h1 className="app-title">{getRoomName()}</h1>
        </div>
        <div className="header-right">
          <div className="control-button">
            <button
              className="icon-button"
              onClick={toggleTheme}
              onMouseEnter={() => setShowTooltip('theme')}
              onMouseLeave={() => setShowTooltip(null)}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            {showTooltip === 'theme' && (
              <div className="tooltip">
                {t('controls.theme.toggle')}
              </div>
            )}
          </div>
          
          <div className="control-button">
            <button
              className="icon-button"
              onClick={() => changeLanguage(currentLanguage === 'zh' ? 'en' : 'zh')}
              onMouseEnter={() => setShowTooltip('language')}
              onMouseLeave={() => setShowTooltip(null)}
            >
              {currentLanguage === 'zh' ? '🇺🇸' : '🇨🇳'}
            </button>
            {showTooltip === 'language' && (
              <div className="tooltip">
                {t('controls.language.toggle')}
              </div>
            )}
          </div>
        </div>
      </header>
    </div>
  );
};

export default App;