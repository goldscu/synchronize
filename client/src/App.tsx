import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from './ThemeContext';
import i18n from 'i18next';
import { Room } from '../../shared/WebSocketProtocol';
import './App.css';
import './App-dark.css';

const App: React.FC = () => {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [currentRoom, setCurrentRoom] = useState<Room>({ id: 0, name: '', description: t('room.public'), created_at: Date.now() }); // 默认进入公开房间
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [fileList, setFileList] = useState<Array<{name: string, size: number, modified: string}>>([]);
  const [messages, setMessages] = useState<Array<{type: string, username: string, content?: string, fileName?: string, fileSize?: number, timestamp: string}>>([]);
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
    // 如果已经有WebSocket实例且状态为连接中或已连接，不再重复连接
    if (wsRef.current && (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN)) {
      console.log('WebSocket已在连接中或已连接，跳过重复连接');
      return;
    }
    
    // 如果有旧的连接，先关闭它
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setConnectionStatus('connecting');
    
    // 从配置文件读取WebSocket连接地址
    fetch('/config.json')
      .then(response => response.json())
      .then(config => {
        // 动态构建WebSocket连接地址
        let websocketUrl;
        if (config.client.useCurrentHost) {
          // 获取当前页面的协议、主机和端口
          const currentHost = window.location.host;
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          websocketUrl = `${protocol}//${currentHost}${(config.websocket && config.websocket.path) || '/'}`;
        } else {
          // 使用配置中的完整URL（备用方案）
          websocketUrl = config.client.websocketUrl;
        }
        
        console.log('WebSocket连接地址:', websocketUrl);
        const ws = new WebSocket(websocketUrl);
        wsRef.current = ws;
        
        ws.onopen = () => {
          console.log('WebSocket连接已建立');
          setConnectionStatus('connected');
          hasConnected.current = true;
        };
        
        ws.onmessage = (event) => {
          console.log('收到服务器消息:', event.data);
          
          try {
            const message = JSON.parse(event.data);
            
            switch (message.type) {
              case 'fileList':
                setFileList(message.files);
                break;
              case 'text':
                setMessages(prev => [...prev, message]);
                break;
              case 'file':
                setMessages(prev => [...prev, message]);
                break;
              default:
                console.log('未知消息类型:', message.type);
            }
          } catch (error) {
            console.error('解析消息失败:', error);
          }
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
        
        ws.onclose = (event: CloseEvent) => {
          console.log('WebSocket连接已关闭');
          setConnectionStatus('disconnected');
          // 只有在非正常关闭且组件未卸载时才显示错误提示
          if (event.code !== 1000 && event.code !== 1001 && !isUnmounting.current) {
            setToastMessage(t('controls.connection.connectionError', { error: t('controls.connection.unexpectedClose', { code: event.code }) }));
            setTimeout(() => setToastMessage(null), 5000);
          }
        };
      })
      .catch(error => {
        console.error('读取配置文件失败:', error);
        setConnectionStatus('disconnected');
      });
  };
  
  // 重新连接
  const reconnect = () => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual reconnect');
      wsRef.current = null;
    }
    hasConnected.current = false; // 重置连接标记
    setConnectionStatus('disconnected');
    
    // 延迟重新连接，避免过快重连
    setTimeout(() => {
      connectWebSocket();
    }, 1000);
  };
  
  // 只在组件挂载时连接一次
  useEffect(() => {
    // 延迟连接，确保组件完全挂载
    const timer = setTimeout(() => {
      connectWebSocket();
    }, 1000);
    
    return () => {
      // 清理定时器
      clearTimeout(timer);
      
      // 标记组件正在卸载
      isUnmounting.current = true;
      
      // 关闭WebSocket连接
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
        wsRef.current = null;
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
  const [userUuid, setUserUuid] = useState<string>('');
  
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
  
  // 生成UUID函数
  const generateUUID = () => {
    // 简单的UUID v4生成器
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // 初始化用户名和UUID
  useEffect(() => {
    // 初始化用户名
    const savedUsername = localStorage.getItem('username');
    if (savedUsername) {
      setUsername(savedUsername);
    } else {
      // 如果没有保存的用户名，使用默认值（电脑名称-浏览器名称）
      const defaultUsername = `${getPlatformInfo()}-${getBrowserName()}`;
      setUsername(defaultUsername);
      localStorage.setItem('username', defaultUsername);
    }

    // 初始化用户UUID
    const savedUuid = localStorage.getItem('userUuid');
    if (savedUuid) {
      setUserUuid(savedUuid);
    } else {
      // 如果没有保存的UUID，生成新的并保存
      const newUuid = generateUUID();
      setUserUuid(newUuid);
      localStorage.setItem('userUuid', newUuid);
      console.log('生成新的用户UUID:', newUuid);
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
    setIsEditingUsername(true);
  };
  
  // 更新用户名（实时保存）
  const updateUsername = (newUsername: string) => {
    setUsername(newUsername);
    if (newUsername.trim()) {
      localStorage.setItem('username', newUsername.trim());
    }
  };
  
  // 结束编辑用户名
  const endEditUsername = () => {
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
    if (textInput.trim() && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = {
        type: 'text',
        username: username,
        user_uuid: userUuid,
        content: textInput.trim()
      };
      
      wsRef.current.send(JSON.stringify(message));
      setTextInput('');
    }
  };
  
  // 发送文件
  const sendFile = () => {
    if (selectedFile && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        if (event.target && event.target.result && wsRef.current) {
          const message = {
            type: 'file',
            username: username,
            user_uuid: userUuid,
            fileName: selectedFile.name,
            fileSize: selectedFile.size,
            fileData: event.target.result
          };
          
          wsRef.current.send(JSON.stringify(message));
        }
      };
      
      reader.readAsDataURL(selectedFile);
      setSelectedFile(null);
    }
  };
  
  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files && event.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // 切换房间
  const switchRoom = (room: Room) => {
    setCurrentRoom(room);
  };

  // 获取当前房间名称
  const getRoomName = () => {
    if (currentRoom.name === '') {
      return t('room.public');
    } else {
      return t('room.privateWithRoom', { roomName: currentRoom.name });
    }
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
          {/* 用户名区域 - 用户名和编辑框在同一行 */}
          <div className="user-section">
            <div className="username-row">
              <span className="user-label">{t('user.name')}:</span>
              {isEditingUsername ? (
                <input
                  type="text"
                  value={username}
                  onChange={(e) => updateUsername(e.target.value)}
                  onBlur={endEditUsername}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      endEditUsername();
                    } else if (e.key === 'Escape') {
                      endEditUsername();
                    }
                  }}
                  className="username-input"
                  autoFocus
                />
              ) : (
                <span 
                  className="username-text"
                  onClick={startEditUsername}
                  title={t('user.editHint')}
                >
                  {username}
                </span>
              )}
            </div>
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