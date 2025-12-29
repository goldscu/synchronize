import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from './ThemeContext';
import i18n from 'i18next';
import { Room, UserJoinedMessage, RoomFilesUpdateMessage, MESSAGE_TYPES, RoomTextMessage, RoomTextDeleteMessage, RoomFileUploadMessage, RoomFileDeleteMessage } from '../../shared/WebSocketProtocol';
import './App.css';
import './App-dark.css';

const App: React.FC = () => {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [currentRoom, setCurrentRoom] = useState<Room>({ id: 0, name: '', description: t('room.public'), created_at: Date.now() }); // 默认进入公开房间
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [toastMessage, setToastMessage] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  // 最大文件大小限制（字节）
  const [maxFileSize, setMaxFileSize] = useState<number>(100 * 1024 * 1024); // 默认100MB
  // 拖动状态计数器，用于处理嵌套元素的拖动事件
  const dragCounter = useRef(0);
  // 使用useRef创建可变的文件数组
  const filesRef = useRef<Array<{name: string, size: number, create_time: number}>>([]);
  const [files, setFiles] = useState<Array<{name: string, size: number, create_time: number}>>([]);
  // 使用useRef创建可变的消息数组
  const messagesRef = useRef<Array<{id?: number, user_name: string, content?: string, timestamp: string}>>([]);
  // 保留messages状态用于界面渲染，但不直接操作它
  const [messages, setMessages] = useState<Array<{id?: number, user_name: string, content?: string, timestamp: string}>>([]);
  const [connectedUsers, setConnectedUsers] = useState<Array<{user_name: string, user_uuid: string}>>([]);
  const [showUserTooltip, setShowUserTooltip] = useState<boolean>(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<{show: boolean, type: 'file' | 'message', title: string, message: string, onConfirm: () => void}>({
    show: false, 
    type: 'file', 
    title: '', 
    message: '', 
    onConfirm: () => {}
  });
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
  
  // 加载配置文件中的最大文件大小限制
  useEffect(() => {
    fetch('/config.json')
      .then(response => response.json())
      .then(config => {
        if (config.client && config.client.maxFileSize) {
          setMaxFileSize(config.client.maxFileSize);
        }
      })
      .catch(error => {
        console.error('加载配置文件失败:', error);
        // 使用默认值100MB
      });
  }, []);
  
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    // 保存语言设置到本地存储
    localStorage.setItem('language', lng);
  };

  const currentLanguage = i18n.language;
  
  // 用户名相关状态
  const [username, setUsername] = useState<string>('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [userUuid, setUserUuid] = useState<string>('');
  
  // 消息相关状态
  const [messageType, setMessageType] = useState<'text' | 'file'>(() => {
    // 从本地存储获取显示模式，如果没有则默认为'text'
    const savedMessageType = localStorage.getItem('messageType');
    return (savedMessageType as 'text' | 'file') || 'text';
  });
  const [textInput, setTextInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [copyNotification, setCopyNotification] = useState<{ show: boolean, message: string }>({ show: false, message: '' });
  const [isDragging, setIsDragging] = useState(false);
  
  // 消息管理函数
  const updateMessages = (updater: (messages: Array<{id?: number, user_name: string, content?: string, timestamp: string}>) => void) => {
    // 直接操作可变数组
    updater(messagesRef.current);
    // 触发组件重新渲染
    setMessages([...messagesRef.current]);
  };
  
  // 添加新消息（插入到最前面）
  const addMessage = (message: {id?: number, user_name: string, content?: string, timestamp: string}) => {
    messagesRef.current.unshift(message); // 使用unshift插入到数组开头
    setMessages([...messagesRef.current]);
  };
  
  // 设置消息列表（用于替换整个数组）
  const setMessagesList = (newMessages: Array<{id?: number, user_name: string, content?: string, timestamp: string}>) => {
    messagesRef.current = newMessages;
    setMessages([...messagesRef.current]);
  };
  
  // 清空消息列表
  const clearMessages = () => {
    messagesRef.current = [];
    setMessages([]);
  };
  
  // 文件管理函数
  const updateFiles = (updater: (files: Array<{name: string, size: number, create_time: number}>) => void) => {
    // 直接操作可变数组
    updater(filesRef.current);
    // 触发组件重新渲染
    setFiles([...filesRef.current]);
  };
  
  // 添加新文件（插入到最前面）
  const addFile = (file: {name: string, size: number, create_time: number}) => {
    filesRef.current.unshift(file); // 使用unshift插入到数组开头
    setFiles([...filesRef.current]);
  };
  
  // 设置文件列表（用于替换整个数组）
  const setFilesList = (newFiles: Array<{name: string, size: number, create_time: number}>) => {
    filesRef.current = newFiles;
    setFiles([...filesRef.current]);
  };
  
  // 清空文件列表
  const clearFiles = () => {
    filesRef.current = [];
    setFiles([]);
  };

  // 删除指定文件
  const removeFile = (filename: string) => {
    const fileIndex = filesRef.current.findIndex(file => file.name === filename);
    if (fileIndex !== -1) {
      filesRef.current.splice(fileIndex, 1);
      setFiles([...filesRef.current]);
      console.log(`从文件列表中移除文件: ${filename}`);
    }
  };
  
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
    console.log('开始初始化用户名和UUID...');
    
    // 初始化用户名
    let savedUsername = localStorage.getItem('username');
    if (!savedUsername) {
      // 如果没有保存的用户名，使用默认值（电脑名称-浏览器名称）
      const defaultUsername = `${getPlatformInfo()}-${getBrowserName()}`;
      localStorage.setItem('username', defaultUsername);
      setUsername(defaultUsername);
      savedUsername = defaultUsername;
      console.log('生成默认用户名:', defaultUsername);
    } else {
      setUsername(savedUsername);
      console.log('从localStorage读取用户名:', savedUsername);
    }

    // 初始化用户UUID
    let savedUuid = localStorage.getItem('userUuid');
    if (!savedUuid) {
      // 如果没有保存的UUID，生成新的并保存
      const newUuid = generateUUID();
      localStorage.setItem('userUuid', newUuid);
      setUserUuid(newUuid);
      savedUuid = newUuid;
      console.log('生成新的用户UUID:', newUuid);
    } else {
      setUserUuid(savedUuid);
      console.log('从localStorage读取UUID:', savedUuid);
    }
    
    console.log('用户名和UUID初始化完成 - 用户名:', savedUsername, 'UUID:', savedUuid);
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
          console.log('当前用户名状态:', username);
          console.log('当前UUID状态:', userUuid);
          setConnectionStatus('connected');
          hasConnected.current = true;
          
          // 检查localStorage中是否有必要的用户信息
          const currentUsername = localStorage.getItem('username');
          const currentUserUuid = localStorage.getItem('userUuid');
          
          // 如果没有找到必要的用户信息，显示错误并停止执行
          if (!currentUsername) {
            setConnectionStatus('disconnected');
            setToastMessage({message: t('user.error.usernameRequired'), type: 'error'});
            console.error('无法获取用户名，停止执行');
            ws.close();
            return;
          }
          
          if (!currentUserUuid) {
            setConnectionStatus('disconnected');
            setToastMessage({message: t('user.error.uuidRequired'), type: 'error'});
            console.error('无法获取UUID，停止执行');
            ws.close();
            return;
          }
          
          // 从URL参数中获取room_id
          const urlParams = new URLSearchParams(window.location.search);
          const roomIdFromUrl = urlParams.get('room_id');
          const roomId = roomIdFromUrl ? parseInt(roomIdFromUrl) : 1; // 默认使用公开房间ID为1
          
          console.log('准备发送用户信息 - 用户名:', currentUsername, 'UUID:', currentUserUuid, '房间ID:', roomId);
          
          // 发送用户加入消息
          const userJoinedMessage: UserJoinedMessage = {
            type: MESSAGE_TYPES.USER_JOINED,
            user_name: currentUsername,
            user_uuid: currentUserUuid,
            room_id: roomId
          };
          
          ws.send(JSON.stringify(userJoinedMessage));
          console.log('已发送用户加入消息:', userJoinedMessage);
        };
        
        ws.onmessage = (event) => {
          console.log('收到服务器消息:', event.data);
          
          try {
            const message = JSON.parse(event.data);
            
            switch (message.type) {
              case MESSAGE_TYPES.ROOM_UPDATE:
                setCurrentRoom(message.room);
                break;
              case MESSAGE_TYPES.USERS_UPDATE:
                setConnectedUsers(message.users);
                break;
              case MESSAGE_TYPES.ROOM_TEXT_MESSAGE:
                // 处理单个新文本消息
                addMessage({
                  id: message.room_text.id,
                  user_name: message.room_text.user_name,
                  content: message.room_text.content,
                  timestamp: message.room_text.timestamp
                });
                break;
              case MESSAGE_TYPES.ROOM_TEXTS_UPDATE:
                  // 清空现有消息，然后添加新收到的room_texts
                  clearMessages();
                  message.room_texts.forEach((text: { id?: number, user_name: string, content: string, timestamp: string }) => {
                    addMessage({
                      id: text.id,
                      user_name: text.user_name,
                      content: text.content,
                      timestamp: text.timestamp
                    });
                  });
                  break;
              case MESSAGE_TYPES.ROOM_TEXT_MESSAGE_DELETE:
                // 从消息列表中删除指定的消息
                const messageIdToDelete = message.id;
                const updatedMessages = messagesRef.current.filter(msg => msg.id !== messageIdToDelete);
                setMessagesList(updatedMessages);
                break;
              case MESSAGE_TYPES.ROOM_FILES_UPDATE:
                // 清空现有文件，然后添加新收到的files
                clearFiles();
                const newFiles = message.files.map((file: RoomFilesUpdateMessage['files'][0]) => ({
                  name: file.name,
                  size: file.size,
                  create_time: file.create_time
                }));
                setFilesList(newFiles);
                break;
              case MESSAGE_TYPES.ROOM_FILE_UPLOAD:
                // 处理新上传的文件，将其添加到文件列表中
                addFile({
                  name: message.file.name,
                  size: message.file.size,
                  create_time: message.file.create_time
                });
                console.log('收到新文件上传通知:', message.file);
                break;
              case MESSAGE_TYPES.ROOM_FILE_DELETE:
                // 处理文件删除消息，从文件列表中移除指定文件
                removeFile(message.file_name);
                console.log('收到文件删除通知:', message.file_name);
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
            
            setToastMessage({message: t('controls.connection.connectionError', { error: errorMessage }), type: 'error'});
            setTimeout(() => setToastMessage(null), 5000);
          }
        };
        
        ws.onclose = (event: CloseEvent) => {
          console.log(`WebSocket连接已关闭，代码: ${event.code}, 原因: ${event.reason}`);
          setConnectionStatus('disconnected');
          
          // 检查是否是重复连接导致的正常关闭
          const isDuplicateConnection = event.reason === 'Duplicate connection - new connection established';
          
          // 只有在非正常关闭且组件未卸载时才显示错误提示
          if (event.code !== 1000 && event.code !== 1001 && !isUnmounting.current && !isDuplicateConnection) {
            setToastMessage({message: t('controls.connection.connectionError', { error: t('controls.connection.unexpectedClose', { code: event.code }) }), type: 'error'});
            setTimeout(() => setToastMessage(null), 5000);
          }
          
          // 如果是重复连接，不进行重连，因为新连接应该已经建立
          if (isDuplicateConnection) {
            console.log('检测到重复连接，等待新连接建立');
            return;
          }
          
          // 如果不是正常关闭，尝试重新连接
          if (event.code !== 1000 && event.code !== 1001 && !isUnmounting.current) {
            // 延迟重新连接，避免过快重连
            setTimeout(() => {
              connectWebSocket();
            }, 1000);
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
    // 延迟连接，确保用户名和UUID完全初始化
    const connectAfterInit = () => {
      // 检查localStorage中是否已有用户信息
      const savedUsername = localStorage.getItem('username');
      const savedUuid = localStorage.getItem('userUuid');
      
      if (savedUsername && savedUuid) {
        console.log('用户信息已就绪，建立WebSocket连接');
        connectWebSocket();
      } else {
        // 如果还没初始化完成，继续等待
        console.log('等待用户信息初始化完成...');
        setTimeout(connectAfterInit, 100);
      }
    };
    
    // 开始检查并连接
    connectAfterInit();
    
    return () => {
      // 标记组件正在卸载
      isUnmounting.current = true;
      
      // 关闭WebSocket连接
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
        wsRef.current = null;
      }
    };
  }, []);
  
  // 切换消息类型
  const toggleMessageType = () => {
    const newMessageType = messageType === 'text' ? 'file' : 'text';
    setMessageType(newMessageType);
    // 保存显示模式到本地存储
    localStorage.setItem('messageType', newMessageType);
  };
  
  // 控制消息展开状态
  const [expandedMessages, setExpandedMessages] = useState<Set<number>>(new Set());

  // 切换消息展开状态
  const toggleMessageExpanded = (messageIndex: number) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageIndex)) {
        newSet.delete(messageIndex);
      } else {
        newSet.add(messageIndex);
      }
      return newSet;
    });
  };
  
  // 复制消息内容到剪贴板
  const copyMessageToClipboard = (content: string) => {
    // 检查是否支持 Clipboard API
    if (!navigator.clipboard) {
      // 降级方案：使用 document.execCommand
      const textArea = document.createElement('textarea');
      textArea.value = content;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          showCopyNotification(t('message.copySuccess'));
        } else {
          showCopyNotification(t('message.copyFailed'));
        }
      } catch (err) {
        console.error('Failed to copy message: ', err);
        showCopyNotification(t('message.copyFailed'));
      }
      
      document.body.removeChild(textArea);
      return;
    }
    
    // 使用现代 Clipboard API
    navigator.clipboard.writeText(content).then(() => {
      showCopyNotification(t('message.copySuccess'));
    }).catch(err => {
      console.error('Failed to copy message: ', err);
      showCopyNotification(t('message.copyFailed'));
    });
  };
  
  // 显示复制结果提示
  const showCopyNotification = (message: string) => {
    setCopyNotification({ show: true, message });
    // 3秒后自动隐藏提示
    setTimeout(() => {
      setCopyNotification(prev => ({ ...prev, show: false }));
    }, 3000);
  };
  
  // 删除消息
  const deleteMessage = (messageIndex: number) => {
    const messageToDelete = messagesRef.current[messageIndex];
    if (!messageToDelete) {
      console.error('Message not found');
      showCopyNotification(t('message.deleteError.messageNotFound'));
      return;
    }
    
    if (!messageToDelete.id) {
      console.error('Message ID missing');
      showCopyNotification(t('message.deleteError.missingId'));
      return;
    }

    // 显示确认弹窗
    setShowConfirmDialog({
      show: true,
      type: 'message',
      title: t('controls.confirm.title'),
      message: t('controls.confirm.message.message'),
      onConfirm: () => executeMessageDelete(messageIndex)
    });
  };

  // 执行消息删除操作
  const executeMessageDelete = (messageIndex: number) => {
    const messageToDelete = messagesRef.current[messageIndex];
    if (!messageToDelete) {
      console.error('Message not found');
      showCopyNotification(t('message.deleteError.messageNotFound'));
      return;
    }
    
    if (!messageToDelete.id) {
      console.error('Message ID missing');
      showCopyNotification(t('message.deleteError.missingId'));
      return;
    }
    
    // 发送删除消息请求到服务器
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const deleteMessage: RoomTextDeleteMessage = {
        type: 'room_text_message_delete',
        id: messageToDelete.id
      };
      
      wsRef.current.send(JSON.stringify(deleteMessage));
      console.log(`Sent delete request for message ID: ${messageToDelete.id}`);
    } else {
      console.error('WebSocket connection not available');
      showCopyNotification(t('message.deleteError.connectionError'));
    }
  };
  
  // 下载文件
  const downloadFile = async (fileName: string) => {
    try {
      // 获取服务器地址
      let serverUrl;
      try {
        const configResponse = await fetch('/config.json');
        const config = await configResponse.json();
        
        if (config.client.useCurrentHost) {
          const protocol = window.location.protocol;
          const currentHost = window.location.host;
          serverUrl = `${protocol}//${currentHost}`;
        } else {
          serverUrl = config.client.websocketUrl.replace(/^wss?:/, (protocol: string) => protocol === 'wss:' ? 'https:' : 'http:');
        }
      } catch (error) {
        console.error('加载配置文件失败:', error);
        // 使用默认值
        const protocol = window.location.protocol;
        const currentHost = window.location.host;
        serverUrl = `${protocol}//${currentHost}`;
      }
      
      const downloadUrl = `${serverUrl}/api/download/${encodeURIComponent(fileName)}`;
      
      // 创建下载链接
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      console.error('下载文件失败:', error);
      setToastMessage({message: t('file.downloadError', { fileName, error: error.message }), type: 'error'});
      setTimeout(() => setToastMessage(null), 3000);
    }
  };
  
  // 删除文件
  const deleteFile = (fileIndex: number) => {
    const file = filesRef.current[fileIndex];
    if (!file || !file.name) {
      setToastMessage({message: t('file.deleteError', { error: '无效的文件信息' }), type: 'error'});
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    // 显示确认弹窗
    setShowConfirmDialog({
      show: true,
      type: 'file',
      title: t('controls.confirm.title'),
      message: t('controls.confirm.message.file', { fileName: file.name }),
      onConfirm: () => executeFileDelete(fileIndex)
    });
  };

  // 执行文件删除操作
  const executeFileDelete = async (fileIndex: number) => {
    try {
      const file = filesRef.current[fileIndex];
      if (!file || !file.name) {
        setToastMessage({message: t('file.deleteError', { error: '无效的文件信息' }), type: 'error'});
        setTimeout(() => setToastMessage(null), 3000);
        return;
      }
      
      // 获取服务器地址
      let serverUrl;
      try {
        const configResponse = await fetch('/config.json');
        const config = await configResponse.json();
        
        if (config.client.useCurrentHost) {
          const protocol = window.location.protocol;
          const currentHost = window.location.host;
          serverUrl = `${protocol}//${currentHost}`;
        } else {
          serverUrl = config.client.websocketUrl.replace(/^wss?:/, (protocol: string) => protocol === 'wss:' ? 'https:' : 'http:');
        }
      } catch (error) {
        console.error('加载配置文件失败:', error);
        // 使用默认值
        const protocol = window.location.protocol;
        const currentHost = window.location.host;
        serverUrl = `${protocol}//${currentHost}`;
      }
      
      const deleteUrl = `${serverUrl}/api/file/${encodeURIComponent(file.name)}`;
      
      // 发送删除请求
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '删除失败' }));
        throw new Error(errorData.error || `删除失败，状态码: ${response.status}`);
      }
      
      // 不在这里立即移除文件，等待服务器广播删除消息后统一处理
      // 这样可以确保所有客户端的状态同步
      
      // 显示成功提示
      setToastMessage({message: t('file.deleteSuccess', { fileName: file.name }), type: 'success'});
      setTimeout(() => setToastMessage(null), 3000);
    } catch (error: any) {
      console.error('删除文件失败:', error);
      setToastMessage({message: t('file.deleteError', { error: error.message }), type: 'error'});
      setTimeout(() => setToastMessage(null), 3000);
    }
  };
  
  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // 格式化时间戳
  const formatTimestamp = (timestamp: string | number): string => {
    const date = new Date(typeof timestamp === 'string' ? parseInt(timestamp) : timestamp);
    return date.toLocaleString();
  };
  
  // 发送文本消息
  const sendTextMessage = () => {
    // 检查消息内容是否为空
    if (!textInput.trim()) {
      setToastMessage({message: t('message.error.empty'), type: 'error'});
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    
    // 检查WebSocket连接是否存在
    if (!wsRef.current) {
      setToastMessage({message: t('message.error.noConnection'), type: 'error'});
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    
    // 检查WebSocket连接状态
    if (wsRef.current.readyState !== WebSocket.OPEN) {
      const statusMap: { [key: number]: string } = {
        [WebSocket.CONNECTING]: t('message.error.connecting'),
        [WebSocket.CLOSING]: t('message.error.closing'),
        [WebSocket.CLOSED]: t('message.error.closed')
      };
      const statusText = statusMap[wsRef.current.readyState] || t('message.error.unknown');
      setToastMessage({message: t('message.error.notOpen', { status: statusText }), type: 'error'});
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    
    // 所有条件满足，发送消息
    const message: RoomTextMessage = {
      type: MESSAGE_TYPES.ROOM_TEXT_MESSAGE,
      room_text: {
        user_name: username,
        user_uuid: userUuid,
        room_id: currentRoom.id,
        content: textInput.trim()
      }
    };
    
    wsRef.current.send(JSON.stringify(message));
    setTextInput('');
  };
  
  // 发送文件
  const sendFile = async () => {
    if (!selectedFile) return;
    
    // 从配置文件读取服务器地址
    fetch('/config.json')
      .then(response => response.json())
      .then(config => {
        // 动态构建HTTP服务器地址
        let serverUrl;
        if (config.client.useCurrentHost) {
          // 获取当前页面的协议、主机和端口
          const currentHost = window.location.host;
          const protocol = window.location.protocol;
          serverUrl = `${protocol}//${currentHost}`;
        } else {
          // 使用配置中的完整URL（备用方案）
          serverUrl = config.client.websocketUrl.replace(/^wss?:/, (protocol: string) => protocol === 'wss:' ? 'https:' : 'http:');
        }
        
        // 创建FormData对象
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        // 发送HTTP请求上传文件
        fetch(`${serverUrl}/api/upload/${encodeURIComponent(selectedFile.name)}`, {
          method: 'POST',
          body: formData,
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(t('file.uploadFailed', { status: response.status }));
          }
          return response.json();
        })
        .then(data => {
          console.log('文件上传成功:', data);
          setToastMessage({message: t('file.uploadSuccess'), type: 'success'});
          setTimeout(() => setToastMessage(null), 3000);
        })
        .catch(error => {
          console.error('文件上传错误:', error);
          setToastMessage({message: t('file.uploadError', { error: error.message }), type: 'error'});
          setTimeout(() => setToastMessage(null), 3000);
        });
      })
      .catch(error => {
        console.error('获取配置失败:', error);
        setToastMessage({message: t('file.configError'), type: 'error'});
        setTimeout(() => setToastMessage(null), 3000);
      });
    
    setSelectedFile(null);
  };
  
  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files && event.target.files[0];
    if (file) {
      // 检查文件大小是否超过限制
      if (file.size > maxFileSize) {
        // 将字节转换为MB
        const maxSizeMB = (maxFileSize / (1024 * 1024)).toFixed(0);
        setToastMessage({message: t('file.error.fileTooLarge', {maxSize: `${maxSizeMB}MB`}), type: 'error'});
        setTimeout(() => setToastMessage(null), 3000);
        return;
      }
      setSelectedFile(file);
    }
  };
  
  // 处理拖拽进入
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };
  
  // 处理拖拽经过
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  // 处理拖拽离开
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };
  
  // 处理文件拖放
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      // 检查文件大小是否超过限制
      if (file.size > maxFileSize) {
        // 将字节转换为MB
        const maxSizeMB = (maxFileSize / (1024 * 1024)).toFixed(0);
        setToastMessage({message: t('file.error.fileTooLarge', {maxSize: `${maxSizeMB}MB`}), type: 'error'});
        setTimeout(() => setToastMessage(null), 3000);
        return;
      }
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
        <div className={`toast ${toastMessage.type}`}>
          {toastMessage.message}
        </div>
      )}
      
      {/* 复制结果提示 */}
      {copyNotification.show && (
        <div className="copy-notification">
          {copyNotification.message}
        </div>
      )}
      
      <header className="main-header">
        <div className="header-left">
          <h1 className="app-title">{getRoomName()}</h1>
          <div className="user-count-button">
            <button
              className="icon-button"
              onMouseEnter={() => setShowUserTooltip(true)}
              onMouseLeave={() => setShowUserTooltip(false)}
            >
              👥 {connectedUsers.length}
            </button>
            {showUserTooltip && connectedUsers.length > 0 && (
              <div className="tooltip user-list-tooltip">
                <div className="user-list-title">{t('user.onlineUsers')}:</div>
                <div className="user-list">
                  {connectedUsers.map((user, index) => (
                    <div key={index} className="user-list-item">
                      {user.user_name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
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
          <div 
            className={`send-file-section ${isDragging ? 'dragging' : ''}`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <h3>{t('message.sendFile')}</h3>
            <div className="file-input-container">
              <input
                type="file"
                id="file-input"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <label htmlFor="file-input" className="file-input-label">
                {selectedFile ? selectedFile.name : t('message.filePrompt')}
              </label>
              <button onClick={sendFile} className="send-button" disabled={!selectedFile}>
                {t('message.send')}
              </button>
            </div>
            <div className="file-size-hint">
              {t('file.maxFileSize', { maxSize: `${(maxFileSize / (1024 * 1024)).toFixed(0)}MB` })}
            </div>
          </div>
        </div>
        
        {/* 右侧消息列表区域 */}
        <div className="right-panel">
          <div className="message-type-toggle">
            <button
              className={`toggle-button ${messageType === 'text' ? 'active' : ''}`}
              onClick={() => {
                setMessageType('text');
                localStorage.setItem('messageType', 'text');
              }}
              title={t('message.tooltip.textMessages')}
            >
              {t('message.text')}
            </button>
            <button
              className={`toggle-button ${messageType === 'file' ? 'active' : ''}`}
              onClick={() => {
                setMessageType('file');
                localStorage.setItem('messageType', 'file');
              }}
              title={t('message.tooltip.fileMessages')}
            >
              {t('message.file')}
            </button>
          </div>

          {/* 消息/文件列表 */}
          <div className="message-list">
            {messageType === 'text' ? (
              // 显示文本消息列表
              messagesRef.current.length > 0 ? (
                messagesRef.current.map((message, index) => (
                  <div key={index} className="message-item">
                    {/* 上部分：概要信息和操作按钮 */}
                    <div className="message-header">
                      <div className="message-info">
                        <span className="sender-name">{message.user_name}</span>
                        <span className="message-time">{formatTimestamp(message.timestamp)}</span>
                      </div>
                      <div className="message-actions">
                        <button 
                          className="action-button copy-button"
                          onClick={() => copyMessageToClipboard(message.content || '')}
                          title={t('message.action.copy')}
                        >
                          {t('message.action.copy')}
                        </button>
                        <button 
                          className="action-button delete-button"
                          onClick={() => deleteMessage(index)}
                          title={t('message.action.delete')}
                        >
                          {t('message.action.delete')}
                        </button>
                        <button 
                          className="action-button expand-button"
                          onClick={() => toggleMessageExpanded(index)}
                          title={expandedMessages.has(index) ? t('message.collapse') : t('message.expand')}
                        >
                          {expandedMessages.has(index) ? t('message.collapse') : t('message.expand')}
                        </button>
                      </div>
                    </div>
                    {/* 下部分：消息内容 */}
                    <div className={`message-content ${expandedMessages.has(index) ? 'expanded' : ''}`}>
                      {message.content}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-list">{t('message.noMessages')}</div>
              )
            ) : (
              // 显示文件列表
              filesRef.current.length > 0 ? (
                filesRef.current.map((file, index) => (
                  <div key={index} className="file-item">
                    {/* 上部分：操作按钮 */}
                    <div className="file-actions">
                      <button 
                        className="action-button download-button"
                        onClick={() => downloadFile(file.name)}
                        title={t('message.action.download')}
                      >
                        {t('message.action.download')}
                      </button>
                      <button 
                        className="action-button delete-button"
                        onClick={() => deleteFile(index)}
                        title={t('message.action.delete')}
                      >
                        {t('message.action.delete')}
                      </button>
                    </div>
                    {/* 下部分：文件信息 */}
                    <div className="file-info">
                      <div className="file-detail">
                        <span className="file-label">{t('message.fileInfo.name')}:</span>
                        <span className="file-value">{file.name}</span>
                      </div>
                      <div className="file-detail">
                        <span className="file-label">{t('message.fileInfo.size')}:</span>
                        <span className="file-value">{formatFileSize(file.size)}</span>
                      </div>
                      <div className="file-detail">
                        <span className="file-label">{t('message.fileInfo.createTime')}:</span>
                        <span className="file-value">{formatTimestamp(file.create_time)}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-list">{t('message.noFiles')}</div>
              )
            )}
            <div className="no-more-messages">{t('message.noMoreMessages')}</div>
          </div>
        </div>
      </div>
      
      {/* 确认删除对话框 */}
      {showConfirmDialog.show && (
        <div className="confirm-dialog-overlay">
          <div className="confirm-dialog">
            <h3 className="confirm-dialog-title">{showConfirmDialog.title}</h3>
            <p className="confirm-dialog-message">{showConfirmDialog.message}</p>
            <div className="confirm-dialog-buttons">
              <button 
                className="confirm-button"
                onClick={() => {
                  showConfirmDialog.onConfirm();
                  setShowConfirmDialog(prev => ({ ...prev, show: false }));
                }}
              >
                {t('controls.confirm.buttons.confirm')}
              </button>
              <button 
                className="cancel-button"
                onClick={() => setShowConfirmDialog(prev => ({ ...prev, show: false }))}
              >
                {t('controls.confirm.buttons.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;