import express, { Express, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer } from 'http';
import { Server as WebSocketServer, WebSocket } from 'ws';
import { initializeDatabase, saveMessage, getRoomMessages } from './database';
import { DATA_PATHS } from './constants';
// @ts-ignore
import { UserJoinedMessage, RoomTextMessage, UsersUpdateMessage, MESSAGE_TYPES } from '../../shared/WebSocketProtocol';

// 用户管理
interface ConnectedUser {
  userName: string;
  userUuid: string;
  socket: WebSocket;
  roomId: number;
}
const connectedUsers: ConnectedUser[] = [];

const app: Express = express();

// 检查并创建必要的目录
function ensureDirectoriesExist() {
  const directories = [
    DATA_PATHS.FILE_DIR,
    DATA_PATHS.SQLITE_DIR
  ];
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`已创建目录: ${dir}`);
    } else {
      console.log(`目录已存在: ${dir}`);
    }
  });
}

// 读取配置文件
const configPath = path.join(__dirname, '../../shared/config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const { host, port } = config.server;

// 创建 HTTP 服务器
const server = createServer(app);

// 设置服务器监听选项
server.listen({ port, host }, async () => {
  console.log(`HTTP 和 WebSocket 服务器运行在 http://${host}:${port}`);
  
  // 确保目录存在
  ensureDirectoriesExist();
  
  // 初始化数据库
  try {
    await initializeDatabase();
    console.log('数据库初始化完成');
  } catch (error) {
    console.error('数据库初始化失败:', error);
  }
});

// 创建 WebSocket 服务器
const wss = new WebSocketServer({ 
  server,
  path: config.websocket?.path || '/' // 从配置文件读取WebSocket路径
});

// WebSocket 连接监听
wss.on('connection', (ws, req) => {
  console.log('WebSocket 客户端已连接');
  
  // 监听客户端消息
  ws.on('message', async (message) => {
    console.log('收到消息:', message.toString());
    await handleMessage(ws, message.toString(), req);
  });
  
  // 监听连接关闭
  ws.on('close', (code, reason) => {
    console.log('WebSocket 客户端已断开连接, 代码:', code, '原因:', reason.toString());
    // 从用户列表中移除该用户
    removeUserFromConnectedList(ws);
    // 广播用户列表更新
    broadcastUsersUpdate();
  });
  
  // 监听连接错误
  ws.on('error', (error) => {
    console.error('WebSocket 连接错误:', error);
  });
});

// 发送文件列表给客户端
function sendFileList(ws: WebSocket) {
  try {
    const fileDir = DATA_PATHS.FILE_DIR;
    const files = fs.readdirSync(fileDir);
    const fileList = files.map(file => {
      const filePath = path.join(fileDir, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        size: stats.size,
        modified: stats.mtime.toISOString()
      };
    });
    
    // 发送文件列表消息
    ws.send(JSON.stringify({
      type: MESSAGE_TYPES.ROOM_FILES_UPDATE,
      files: fileList
    }));
  } catch (error) {
    console.error('读取文件列表失败:', error);
  }
}

// 处理客户端消息
async function handleMessage(ws: WebSocket, messageStr: string, req: any) {
  try {
    const message = JSON.parse(messageStr);
    
    switch (message.type) {
      case MESSAGE_TYPES.USER_JOINED:
        // 处理用户加入消息
        await handleUserJoined(ws, message, req);
        break;
        
      default:
        console.log('未知消息类型:', message.type);
    }
  } catch (error) {
    console.error('处理消息失败:', error);
  }
}

// 处理用户加入
async function handleUserJoined(ws: WebSocket, message: UserJoinedMessage, req: any) {
  const userName = message.user_name || '';
  const userUuid = message.user_uuid || '';
  const roomId = message.room_id || 0;
  
  // 检查用户是否已在列表中，如果存在则移除旧的
  removeUserByUuid(userUuid);
  
  // 添加用户到连接列表
  connectedUsers.push({
    userName,
    userUuid,
    socket: ws,
    roomId
  });
  
  console.log(`用户 ${userName} (${userUuid}) 加入房间 ${roomId}`);
  
  // 发送三种数据给新加入的用户
  await sendInitialDataToUser(ws, roomId);
  
  // 广播用户列表更新给所有连接的用户
  broadcastUsersUpdate();
}

// 根据WebSocket连接获取用户房间ID
function getUserRoomIdBySocket(ws: WebSocket): number | null {
  const user = connectedUsers.find(user => user.socket === ws);
  return user ? user.roomId : null;
}

// 从消息中获取房间ID（这个函数现在主要用于向后兼容）
function getRoomIdFromMessage(message: RoomTextMessage): number {
  // 如果消息中有room信息，优先使用
  if (message.room && message.room.id) {
    return message.room.id;
  }
  
  // 从URL参数获取（这里简化处理，实际应该根据连接信息获取）
  return 1; // 默认公共房间
}

// 移除用户
function removeUserByUuid(userUuid: string) {
  const index = connectedUsers.findIndex(user => user.userUuid === userUuid);
  if (index !== -1) {
    connectedUsers.splice(index, 1);
  }
}

// 移除用户从连接列表
function removeUserFromConnectedList(ws: WebSocket) {
  const index = connectedUsers.findIndex(user => user.socket === ws);
  if (index !== -1) {
    connectedUsers.splice(index, 1);
  }
}

// 发送初始数据给新加入的用户
async function sendInitialDataToUser(ws: WebSocket, roomId: number) {
  try {
    // 1. 发送房间的所有消息
    const roomMessages = await getRoomMessages(roomId, 50);
    ws.send(JSON.stringify({
      type: MESSAGE_TYPES.ROOM_TEXTS_UPDATE,
      room_texts: roomMessages
    }));
    
    // 2. 发送所有文件
    const roomFiles = getRoomFiles(roomId);
    ws.send(JSON.stringify({
      type: MESSAGE_TYPES.ROOM_FILES_UPDATE,
      files: roomFiles
    }));
    
  } catch (error) {
    console.error('发送初始数据失败:', error);
  }
}

// 获取房间文件列表
function getRoomFiles(roomId: number) {
  try {
    const fileDir = DATA_PATHS.FILE_DIR;
    const files = fs.readdirSync(fileDir);
    return files.map(file => {
      const filePath = path.join(fileDir, file);
      const stats = fs.statSync(filePath);
      return {
        filename: file,
        filesize: stats.size,
        create_time: stats.mtime.getTime()
      };
    });
  } catch (error) {
    console.error('读取文件列表失败:', error);
    return [];
  }
}

// 广播用户列表更新
function broadcastUsersUpdate() {
  const users = connectedUsers.map(user => ({
    user_name: user.userName,
    user_uuid: user.userUuid
  }));
  
  const message: UsersUpdateMessage = {
    type: MESSAGE_TYPES.USERS_UPDATE,
    users: users
  };
  
  const messageStr = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN = 1
      client.send(messageStr);
    }
  });
}

// 广播消息给所有客户端
function broadcastMessage(message: any) {
  const messageStr = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN = 1
      client.send(messageStr);
    }
  });
}

// 广播消息给指定房间的所有客户端
function broadcastMessageToRoom(roomId: number, message: any) {
  const messageStr = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN = 1
      // 检查该客户端是否在该房间
      const user = connectedUsers.find(u => u.socket === client);
      if (user && user.roomId === roomId) {
        client.send(messageStr);
      }
    }
  });
}

// 静态文件服务
app.use(express.static(path.join(__dirname, '../public')));

// 主页路由
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

