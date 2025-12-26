import express, { Express, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer } from 'http';
import { Server as WebSocketServer } from 'ws';

const app: Express = express();

// 读取配置文件
const configPath = path.join(__dirname, '../../shared/config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const { host, port } = config.server;

// 创建 HTTP 服务器
const server = createServer(app);

// 设置服务器监听选项
server.listen({ port, host }, () => {
  console.log(`HTTP 和 WebSocket 服务器运行在 http://${host}:${port}`);
});

// 创建 WebSocket 服务器
const wss = new WebSocketServer({ 
  server,
  path: config.websocket?.path || '/' // 从配置文件读取WebSocket路径
});

// WebSocket 连接监听
wss.on('connection', (ws) => {
  console.log('WebSocket 客户端已连接');
  
  // 监听客户端消息
  ws.on('message', (message) => {
    console.log('收到消息:', message.toString());
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

// 静态文件服务
app.use(express.static(path.join(__dirname, '../public')));

// 主页路由
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

