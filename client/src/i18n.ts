import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      // 连接状态
      connecting: 'Connecting...',
      connected: 'Connected',
      disconnected: 'Disconnected',
      reconnect: 'Reconnect',
      
      // 房间管理
      createRoom: 'Create Room',
      joinRoom: 'Join Room',
      roomName: 'Room Name',
      roomKey: 'Room Key (for private rooms)',
      createPrivateRoom: 'Create Private Room',
      joinExistingRoom: 'Join Existing Room',
      roomCreated: 'Room created successfully',
      roomJoined: 'Joined room successfully',
      roomExists: 'Room already exists',
      roomNotFound: 'Room not found',
      
      // 消息发送
      sendMessage: 'Send Message',
      messageTitle: 'Message Title',
      messageContent: 'Message Content',
      attachFile: 'Attach File',
      send: 'Send',
      cancel: 'Cancel',
      
      // 消息操作
      copy: 'Copy',
      delete: 'Delete',
      download: 'Download',
      expand: 'Expand',
      collapse: 'Collapse',
      
      // 文件上传
      uploading: 'Uploading...',
      uploadComplete: 'Upload Complete',
      uploadFailed: 'Upload Failed',
      resumeUpload: 'Resume Upload',
      
      // 其他
      onlineDevices: 'Online Devices',
      settings: 'Settings',
      language: 'Language',
      theme: 'Theme',
      darkMode: 'Dark Mode',
      lightMode: 'Light Mode',
      chinese: '中文',
      english: 'English',
      confirmDelete: 'Confirm Delete',
      areYouSure: 'Are you sure you want to delete this?',
      yes: 'Yes',
      no: 'No'
    }
  },
  zh: {
    translation: {
      // 连接状态
      connecting: '连接中...',
      connected: '已连接',
      disconnected: '已断开',
      reconnect: '重新连接',
      
      // 房间管理
      createRoom: '创建房间',
      joinRoom: '加入房间',
      roomName: '房间名称',
      roomKey: '房间密钥（私有房间）',
      createPrivateRoom: '创建私有房间',
      joinExistingRoom: '加入现有房间',
      roomCreated: '房间创建成功',
      roomJoined: '成功加入房间',
      roomExists: '房间已存在',
      roomNotFound: '房间不存在',
      
      // 消息发送
      sendMessage: '发送消息',
      messageTitle: '消息标题',
      messageContent: '消息内容',
      attachFile: '附加文件',
      send: '发送',
      cancel: '取消',
      
      // 消息操作
      copy: '复制',
      delete: '删除',
      download: '下载',
      expand: '展开',
      collapse: '收起',
      
      // 文件上传
      uploading: '上传中...',
      uploadComplete: '上传完成',
      uploadFailed: '上传失败',
      resumeUpload: '继续上传',
      
      // 其他
      onlineDevices: '在线设备',
      settings: '设置',
      language: '语言',
      theme: '主题',
      darkMode: '深色模式',
      lightMode: '浅色模式',
      chinese: '中文',
      english: 'English',
      confirmDelete: '确认删除',
      areYouSure: '确定要删除吗？',
      yes: '是',
      no: '否'
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;