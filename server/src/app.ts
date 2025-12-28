import express, { Express, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer } from 'http';
import { Server as WebSocketServer } from 'ws';
import { initializeDatabase, saveMessage, getRoomMessages } from './database';
import { DATA_PATHS } from './constants';

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
wss.on('connection', (ws) => {
  console.log('WebSocket 客户端已连接');
  
  // 发送文件列表给新连接的客户端
  sendFileList(ws);
  
  // 监听客户端消息
  ws.on('message', async (message) => {
    console.log('收到消息:', message.toString());
    await handleMessage(ws, message.toString());
  });
  
  // 监听连接关闭
  ws.on('close', (code, reason) => {
    console.log('WebSocket 客户端已断开连接, 代码:', code, '原因:', reason.toString());
  });
  
  // 监听连接错误
  ws.on('error', (error) => {
    console.error('WebSocket 连接错误:', error);
  });
});

// 发送文件列表给客户端
function sendFileList(ws: any) {
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
      type: 'fileList',
      files: fileList
    }));
  } catch (error) {
    console.error('读取文件列表失败:', error);
  }
}

// 处理客户端消息
async function handleMessage(ws: any, messageStr: string) {
  try {
    const message = JSON.parse(messageStr);
    
    switch (message.type) {
      case 'text':
        // 保存文本消息到数据库 - 使用RoomTextMessage格式
        const timestamp = Date.now();
        await saveMessage(1, message.username, message.user_uuid || '', message.content, timestamp);
        
        // 广播消息给所有客户端
        broadcastMessage({
          type: 'text',
          username: message.username,
          user_uuid: message.user_uuid || '',
          content: message.content,
          timestamp: timestamp
        });
        break;
        
      case 'file':
        // 文件消息不保存到数据库，直接广播
        broadcastMessage({
          type: 'file',
          username: message.username,
          fileName: message.fileName,
          fileSize: message.fileSize,
          fileData: message.fileData,
          timestamp: new Date().toISOString()
        });
        break;
        
      default:
        console.log('未知消息类型:', message.type);
    }
  } catch (error) {
    console.error('处理消息失败:', error);
  }
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

// 静态文件服务
app.use(express.static(path.join(__dirname, '../public')));

// 主页路由
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

