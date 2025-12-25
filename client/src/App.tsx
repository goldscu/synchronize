import React, { useState, useEffect, useRef } from 'react';
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
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const hasConnected = useRef(false); // 标记是否已经连接过
  const isUnmounting = useRef(false); // 标记组件是否正在卸载
  
  // 更新页面标题
  useEffect(() => {
    document.title = t('title');
    
    // 更新 HTML lang 属性
    const htmlElement = document.documentElement;
    htmlElement.lang = i18n.language === 'zh' ? 'zh-CN' : 'en-US';
  }, [t, i18n.language]);
  
  // 建立WebSocket连接
  const connectWebSocket = () => {
    // 如果已经连接过，不再重复连接
    if (hasConnected.current) return;
    
    setConnectionStatus('connecting');
    const ws = new WebSocket('ws://localhost:3000');
    wsRef.current = ws;
    
    ws.onopen = () => {
      console.log('WebSocket连接已建立');
      setConnectionStatus('connected');
      hasConnected.current = true;
    };
    
    ws.onmessage = (event) => {
      console.log('收到服务器消息:', event.data);
      // 这里可以处理服务器发送的消息
    };
    
    ws.onerror = (error: Event) => {
      console.error('WebSocket连接错误:', error);
      setConnectionStatus('disconnected');
      // 只有在非正常关闭时才显示错误提示
      if (ws.readyState !== WebSocket.CLOSING && ws.readyState !== WebSocket.CLOSED) {
        // 尝试获取更详细的错误信息
        let errorMessage = `事件类型: ${error.type}`;
        if ('message' in error && error.message) {
          errorMessage += `, 消息: ${error.message}`;
        }
        
        setToastMessage(t('controls.connection.connectionError', { error: errorMessage }));
        setTimeout(() => setToastMessage(null), 5000);
      }
    };
    
    ws.onclose = (event) => {
      console.log('WebSocket连接已关闭');
      setConnectionStatus('disconnected');
      // 只有在非正常关闭且组件未卸载时才显示错误提示
      if (event.code !== 1000 && event.code !== 1001 && !isUnmounting.current) {
        setToastMessage(t('controls.connection.connectionError', { error: t('controls.connection.unexpectedClose', { code: event.code }) }));
        setTimeout(() => setToastMessage(null), 5000);
      }
    };
  };
  
  // 重新连接
  const reconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    hasConnected.current = false; // 重置连接标记
    connectWebSocket();
  };
  
  // 只在组件挂载时连接一次
  useEffect(() => {
    connectWebSocket();
    
    return () => {
      isUnmounting.current = true; // 标记组件正在卸载
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);
  
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const currentLanguage = i18n.language;
  
  // 用户名相关状态
  const [username, setUsername] = useState<string>('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState('');
  
  // 消息相关状态
  const [messageType, setMessageType] = useState<'text' | 'file'>('text');
  const [textInput, setTextInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // 模拟消息数据
  const [textMessages] = useState([
    { id: 1, title: '第一条消息', content: '这是第一条消息的内容\n包含多行文本\n用于测试展开和收起功能', expanded: false },
    { id: 2, title: '第二条消息', content: '这是第二条消息的内容，比较短', expanded: false },
    { id: 3, title: '第三条消息', content: '这是第三条消息的内容\n同样包含多行文本\n用于测试展开和收起功能\n还有更多内容', expanded: false }
  ]);
  
  const [fileMessages] = useState([
    { id: 1, fileName: 'document.pdf' },
    { id: 2, fileName: 'image.jpg' },
    { id: 3, fileName: 'presentation.pptx' }
  ]);
  
  // 初始化用户名
  useEffect(() => {
    // 尝试从本地存储获取用户名
    const savedUsername = localStorage.getItem('username');
    if (savedUsername) {
      setUsername(savedUsername);
    } else {
      // 如果没有保存的用户名，使用默认值（电脑名称-浏览器名称）
      const defaultUsername = `${getPlatformInfo()}-${getBrowserName()}`;
      setUsername(defaultUsername);
      localStorage.setItem('username', defaultUsername);
    }
  }, []);
  
  // 获取简单但准确的平台信息
  const getPlatformInfo = () => {
    // 尝试使用navigator.userAgentData（如果可用）
    // @ts-ignore - userAgentData可能不在TypeScript类型定义中
    if (navigator.userAgentData && navigator.userAgentData.platform) {
      // @ts-ignore
      return navigator.userAgentData.platform;
    }
    
    // 回退到navigator.userAgent解析
    const userAgent = navigator.userAgent;
    if (userAgent.indexOf('Mac') > -1) {
      // 简单返回"Mac"，不区分Intel还是Apple Silicon
      return 'Mac';
    }
    
    // 最后回退到navigator.platform
    return navigator.platform;
  };
  
  // 获取浏览器名称
  const getBrowserName = () => {
    const userAgent = navigator.userAgent;
    if (userAgent.indexOf('Chrome') > -1) return 'Chrome';
    if (userAgent.indexOf('Safari') > -1) return 'Safari';
    if (userAgent.indexOf('Firefox') > -1) return 'Firefox';
    if (userAgent.indexOf('Edge') > -1) return 'Edge';
    return 'Unknown';
  };
  
  // 开始编辑用户名
  const startEditUsername = () => {
    setTempUsername(username);
    setIsEditingUsername(true);
  };
  
  // 保存用户名
  const saveUsername = () => {
    if (tempUsername.trim()) {
      setUsername(tempUsername.trim());
      localStorage.setItem('username', tempUsername.trim());
    }
    setIsEditingUsername(false);
  };
  
  // 取消编辑用户名
  const cancelEditUsername = () => {
    setTempUsername('');
    setIsEditingUsername(false);
  };
  
  // 切换消息类型
  const toggleMessageType = () => {
    setMessageType(messageType === 'text' ? 'file' : 'text');
  };
  
  // 切换消息展开状态
  const toggleMessageExpanded = (id: number) => {
    // 这里只是UI演示，实际应该更新状态
    console.log(`Toggle message ${id} expanded state`);
  };
  
  // 复制文本消息
  const copyTextMessage = (id: number) => {
    // 这里只是UI演示，实际应该实现复制功能
    console.log(`Copy text message ${id}`);
  };
  
  // 删除消息
  const deleteMessage = (id: number, type: 'text' | 'file') => {
    // 这里只是UI演示，实际应该实现删除功能
    console.log(`Delete ${type} message ${id}`);
  };
  
  // 下载文件
  const downloadFile = (id: number) => {
    // 这里只是UI演示，实际应该实现下载功能
    console.log(`Download file ${id}`);
  };
  
  // 发送文本消息
  const sendTextMessage = () => {
    if (textInput.trim()) {
      console.log(`Send text message: ${textInput}`);
      setTextInput('');
    }
  };
  
  // 发送文件
  const sendFile = () => {
    if (selectedFile) {
      console.log(`Send file: ${selectedFile.name}`);
      setSelectedFile(null);
    }
  };
  
  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

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
      {/* Toast提示 */}
      {toastMessage && (
        <div className="toast">
          {toastMessage}
        </div>
      )}
      
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
          
          <div className="control-button">
            <button
              className={`icon-button ${connectionStatus === 'connected' ? 'disabled' : ''}`}
              onClick={connectionStatus === 'connected' ? undefined : reconnect}
              onMouseEnter={() => setShowTooltip('connection')}
              onMouseLeave={() => setShowTooltip(null)}
            >
              {connectionStatus === 'connected' ? '🟢' : connectionStatus === 'connecting' ? '🟡' : '🔴'}
            </button>
            {showTooltip === 'connection' && (
              <div className="tooltip">
                {t(`controls.connection.${connectionStatus}`)}
              </div>
            )}
          </div>
        </div>
      </header>
      
      <div className="main-content">
        {/* 左侧区域 */}
        <div className="left-panel">
          {/* 用户名区域 */}
          <div className="user-section">
            <div className="user-label">{t('user.name')}:</div>
            {isEditingUsername ? (
              <div className="username-edit">
                <input
                  type="text"
                  value={tempUsername}
                  onChange={(e) => setTempUsername(e.target.value)}
                  className="username-input"
                />
                <button onClick={saveUsername} className="save-button">{t('user.save')}</button>
                <button onClick={cancelEditUsername} className="cancel-button">{t('user.cancel')}</button>
              </div>
            ) : (
              <div className="username-display">
                <span className="username-text">{username}</span>
                <button onClick={startEditUsername} className="edit-button">{t('user.edit')}</button>
              </div>
            )}
          </div>
          
          {/* 发送文本区域 */}
          <div className="send-text-section">
            <h3>{t('message.sendText')}</h3>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={t('message.textPlaceholder')}
              className="text-input"
              rows={5}
            />
            <button onClick={sendTextMessage} className="send-button">{t('message.send')}</button>
          </div>
          
          {/* 发送文件区域 */}
          <div className="send-file-section">
            <h3>{t('message.sendFile')}</h3>
            <div className="file-input-container">
              <input
                type="file"
                id="file-input"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <label htmlFor="file-input" className="file-input-label">
                {selectedFile ? selectedFile.name : t('message.selectFile')}
              </label>
              <button onClick={sendFile} className="send-button" disabled={!selectedFile}>
                {t('message.send')}
              </button>
            </div>
          </div>
        </div>
        
        {/* 右侧消息列表区域 */}
        <div className="right-panel">
          <div className="message-header">
            <h2>{t('message.messages')}</h2>
            <div className="message-type-toggle">
              <button
                className={`toggle-button ${messageType === 'text' ? 'active' : ''}`}
                onClick={() => setMessageType('text')}
              >
                {t('message.textMessages')}
              </button>
              <button
                className={`toggle-button ${messageType === 'file' ? 'active' : ''}`}
                onClick={() => setMessageType('file')}
              >
                {t('message.fileMessages')}
              </button>
            </div>
          </div>
          
          <div className="message-list">
            {messageType === 'text' ? (
              <div className="text-messages">
                {textMessages.map((message) => (
                  <div key={message.id} className="text-message">
                    <div className="message-header">
                      <h4 className="message-title">{message.title}</h4>
                      <div className="message-actions">
                        <button
                          className="action-button"
                          onClick={() => toggleMessageExpanded(message.id)}
                        >
                          {message.expanded ? t('message.collapse') : t('message.expand')}
                        </button>
                        <button
                          className="action-button"
                          onClick={() => copyTextMessage(message.id)}
                        >
                          {t('message.copy')}
                        </button>
                        <button
                          className="action-button delete-button"
                          onClick={() => deleteMessage(message.id, 'text')}
                        >
                          {t('message.delete')}
                        </button>
                      </div>
                    </div>
                    <div className={`message-content ${message.expanded ? 'expanded' : 'collapsed'}`}>
                      {message.content.split('\n').map((line, index) => (
                        <div key={index}>{line}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="file-messages">
                {fileMessages.map((message) => (
                  <div key={message.id} className="file-message">
                    <div className="file-info">
                      <span className="file-name">{message.fileName}</span>
                      <div className="file-actions">
                        <button
                          className="action-button"
                          onClick={() => downloadFile(message.id)}
                        >
                          {t('message.download')}
                        </button>
                        <button
                          className="action-button delete-button"
                          onClick={() => deleteMessage(message.id, 'file')}
                        >
                          {t('message.delete')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="message-footer">
              {t('message.noMoreMessages')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;