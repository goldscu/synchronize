import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { WebSocketClient, ConnectionStatus } from './websocket';
import ConnectionStatusComponent from './components/ConnectionStatus';
import RoomManager from './components/RoomManager';
import MessageList from './components/MessageList';
import MessageInput from './components/MessageInput';
import Settings from './components/Settings';
import './App.css';

const App: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [wsClient] = useState<WebSocketClient>(new WebSocketClient('ws://localhost:8080'));
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [currentRoom, setCurrentRoom] = useState<string>('');
  const [roomKey, setRoomKey] = useState<string>('');
  const [onlineCount, setOnlineCount] = useState<number>(0);
  const [messages, setMessages] = useState<any[]>([]);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  useEffect(() => {
    // 初始化WebSocket连接
    wsClient.connect();

    // 监听连接状态
    wsClient.on('connect', (status: ConnectionStatus) => {
      setConnectionStatus(status);
    });

    // 监听房间加入
    wsClient.on('roomJoined', (data: any) => {
      setCurrentRoom(data.roomName);
      setMessages(data.messages || []);
      
      // 更新URL
      if (data.isPrivate && roomKey) {
        window.location.hash = `#/room=${data.roomName}&key=${roomKey}`;
      }
    });

    // 监听在线人数
    wsClient.on('onlineCount', (count: number) => {
      setOnlineCount(count);
    });

    // 监听消息
    wsClient.on('message', (message: any) => {
      setMessages(prev => {
        if (message.type === 'message_deleted') {
          return prev.filter(m => m.id !== message.data.messageId);
        } else {
          return [...prev, message.data];
        }
      });
    });

    // 检查URL参数
    const checkUrlParams = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/room=')) {
        const params = new URLSearchParams(hash.substring(7));
        const room = params.get('room');
        const key = params.get('key');
        if (room) {
          setCurrentRoom(room);
          if (key) {
            setRoomKey(key);
            wsClient.joinRoom(room, key);
          } else {
            wsClient.joinRoom(room);
          }
        }
      }
    };

    checkUrlParams();

    return () => {
      wsClient.disconnect();
    };
  }, [wsClient, roomKey]);

  useEffect(() => {
    // 应用暗黑模式
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleCreateRoom = (roomName: string, isPrivate: boolean, key?: string) => {
    if (isPrivate && key) {
      setRoomKey(key);
    }
    wsClient.createRoom(roomName, isPrivate);
  };

  const handleJoinRoom = (roomName: string, key?: string) => {
    if (key) {
      setRoomKey(key);
    }
    wsClient.joinRoom(roomName, key);
  };

  const handleSendMessage = (title: string, content: string) => {
    wsClient.sendTextMessage(title, content);
  };

  const handleSendFile = async (file: File) => {
    await wsClient.sendFile(file);
  };

  const handleDeleteMessage = (messageId: string) => {
    wsClient.deleteMessage(messageId);
  };

  const handleDownloadFile = (message: any) => {
    // 构建文件下载URL
    const url = `http://localhost:8080/files/${message.fileName}`;
    window.open(url, '_blank');
  };

  const handleReconnect = () => {
    wsClient.reconnect();
  };

  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const decryptMessage = (encryptedContent: string) => {
    if (!roomKey) return 'No key available';
    try {
      const parsed = JSON.parse(encryptedContent);
      return wsClient.decryptMessage(parsed.content, roomKey);
    } catch (error) {
      return 'Decryption failed';
    }
  };

  return (
    <div className={`min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-300`}>
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Secure Chat</h1>
              {currentRoom && (
                <span className="ml-4 text-sm text-gray-600 dark:text-gray-400">
                  • {currentRoom} ({onlineCount} {t('onlineDevices')})
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <ConnectionStatusComponent 
                status={connectionStatus} 
                onReconnect={handleReconnect}
              />
              <button
                onClick={toggleSettings}
                className="p-2 rounded-md text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                title={t('settings')}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col md:flex-row">
        {!currentRoom ? (
          <RoomManager
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
          />
        ) : (
          <>
            <div className="flex-1 flex flex-col">
              <MessageList
                messages={messages}
                onDeleteMessage={handleDeleteMessage}
                onDownloadFile={handleDownloadFile}
                decryptMessage={decryptMessage}
              />
              <MessageInput
                onSendMessage={handleSendMessage}
                onSendFile={handleSendFile}
              />
            </div>
          </>
        )}
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <Settings
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
          onChangeLanguage={changeLanguage}
          onClose={toggleSettings}
        />
      )}
    </div>
  );
};

export default App;