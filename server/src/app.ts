import express, { Express, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createServer } from 'http';
import { Server as WebSocketServer, WebSocket } from 'ws';
import { initializeDatabase, saveMessage, getRoomMessages, getRoomById, deleteMessage, checkRoomNameExists, createRoom } from './database';
import { DATA_PATHS } from './constants';
import { UserJoinedMessage, RoomTextMessage, RoomTextDeleteMessage, UsersUpdateMessage, RoomFileUploadMessage, RoomFileDeleteMessage, File, MESSAGE_TYPES } from '../../shared/WebSocketProtocol';

// 用户管理
interface ConnectedUser {
  userName: string;
  userUuid: string;
  socket: WebSocket;
  roomId: number;
}
const connectedUsers: ConnectedUser[] = [];

const app: Express = express();

// CORS中间件
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// 解析JSON请求体
app.use(express.json());

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
let config;
let configPath;

try {
  // 尝试从开发环境路径读取配置文件
  configPath = path.join(__dirname, '../../shared/config.json');
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
  try {
    // 尝试从生产环境路径读取配置文件
    configPath = path.join(__dirname, '../public/config.json');
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    // 如果都失败，使用默认配置
    console.error('无法读取配置文件，使用默认配置');
    config = { server: { host: '0.0.0.0', port: 3000 } };
  }
}

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
        
      case MESSAGE_TYPES.ROOM_TEXT_MESSAGE:
        // 处理房间文本消息
        await handleRoomTextMessage(ws, message);
        break;
        
      case MESSAGE_TYPES.ROOM_TEXT_MESSAGE_DELETE:
        // 处理删除房间文本消息
        await handleRoomTextMessageDelete(ws, message);
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
  
  // 检查用户是否已在列表中，如果存在则移除旧的连接
  // 这样可以确保同一用户只有一个活跃连接，避免重连时出现多个连接
  const existingUserIndex = connectedUsers.findIndex(user => user.userUuid === userUuid);
  if (existingUserIndex !== -1) {
    console.log(`检测到用户 ${userName} (${userUuid}) 重复连接，关闭旧连接`);
    const oldSocket = connectedUsers[existingUserIndex].socket;
    if (oldSocket && oldSocket.readyState === WebSocket.OPEN) {
      // 使用特殊代码标识这是重复连接，避免触发客户端的重连逻辑
      oldSocket.close(1000, 'Duplicate connection - new connection established');
    }
    // 立即从连接列表中移除旧连接，确保新连接是唯一的
    connectedUsers.splice(existingUserIndex, 1);
  }
  
  // 添加用户到连接列表
  connectedUsers.push({
    userName,
    userUuid,
    socket: ws,
    roomId
  });
  
  console.log(`用户 ${userName} (${userUuid}) 加入房间 ${roomId}`);
  
  // 发送初始数据给新加入的用户
  // 这确保了重连后用户能获得最新的完整数据，避免数据重复或丢失
  await sendInitialDataToUser(ws, roomId);
  
  // 广播用户列表更新给所有连接的用户
  broadcastUsersUpdate();
}

// 处理房间文本消息
async function handleRoomTextMessage(ws: WebSocket, message: RoomTextMessage) {
  try {
    // 获取发送者的房间ID
    const userRoomId = getUserRoomIdBySocket(ws);
    
    if (!userRoomId) {
      console.error('无法获取用户房间ID');
      return;
    }
    
    // 验证消息中的房间ID与用户当前房间ID是否匹配
    if (message.room_text.room_id === undefined || message.room_text.room_id !== userRoomId) {
      console.error(`消息房间ID(${message.room_text.room_id})与用户房间ID(${userRoomId})不匹配`);
      return;
    }
    
    // 确保timestamp存在，如果不存在则使用当前时间
    const timestamp = message.room_text.timestamp || Date.now();
    // 保存消息到数据库
    const id = await saveMessage(
      message.room_text.room_id,
      message.room_text.user_name,
      message.room_text.user_uuid,
      message.room_text.content,
      timestamp
    );

    message.room_text.id = id;
    message.room_text.timestamp = timestamp;
    
    broadcastMessageToRoom(message.room_text.room_id, message);
    console.log(`已广播房间 ${message.room_text.room_id} 的消息 ${message.room_text.id} 更新`);
  } catch (error) {
    console.error('处理房间文本消息失败:', error);
  }
}

// 处理删除房间文本消息
async function handleRoomTextMessageDelete(ws: WebSocket, message: RoomTextDeleteMessage) {
  try {
    // 获取发送者的房间ID
    const userRoomId = getUserRoomIdBySocket(ws);
    
    if (!userRoomId) {
      console.error('无法获取用户房间ID');
      return;
    }
    
    // 从数据库删除消息
    const success = await deleteMessage(message.id);
    
    if (success) {
      // 广播删除消息给房间内所有用户
      broadcastMessageToRoom(userRoomId, message);
      console.log(`已广播房间 ${userRoomId} 的消息删除请求，消息ID: ${message.id}`);
    } else {
      console.log(`消息ID ${message.id} 不存在或已被删除`);
    }
  } catch (error) {
    console.error('处理删除房间文本消息失败:', error);
  }
}

// 根据WebSocket连接获取用户房间ID
function getUserRoomIdBySocket(ws: WebSocket): number | null {
  const user = connectedUsers.find(user => user.socket === ws);
  return user ? user.roomId : null;
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
    console.log(`开始发送初始数据给房间 ${roomId} 的用户`);
    
    // 0. 发送当前房间信息
    const currentRoom = await getRoomById(roomId);
    console.log(`获取到房间信息: ${JSON.stringify(currentRoom)}`);
    ws.send(JSON.stringify({
      type: MESSAGE_TYPES.ROOM_UPDATE,
      room: currentRoom
    }));
    console.log(`已发送房间信息给用户`);
    
    // 1. 发送房间的所有消息
    const roomMessages = await getRoomMessages(roomId, 50);
    console.log(`获取到 ${roomMessages.room_texts.length} 条房间消息`);
    ws.send(JSON.stringify({
      type: MESSAGE_TYPES.ROOM_TEXTS_UPDATE,
      room_texts: roomMessages.room_texts
    }));
    console.log(`已发送房间消息给用户`);
    
    // 2. 发送所有文件
    const roomFiles = getRoomFiles(roomId);
    console.log(`获取到 ${roomFiles.length} 个房间文件`);
    ws.send(JSON.stringify({
      type: MESSAGE_TYPES.ROOM_FILES_UPDATE,
      files: roomFiles
    }));
    console.log(`已发送房间文件给用户`);
    
    console.log(`初始数据发送完成`);
  } catch (error) {
    console.error('发送初始数据失败:', error);
  }
}

// 获取房间文件列表
function getRoomFiles(roomId: number) {
  try {
    const fileDir = DATA_PATHS.FILE_DIR;
    const files = fs.readdirSync(fileDir);
    const fileList = files.map(file => {
      const filePath = path.join(fileDir, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        size: stats.size,
        create_time: stats.mtime.getTime()
      };
    });
    
    return fileList.sort((a, b) => b.create_time - a.create_time);
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

// 广播文件上传消息给所有客户端
function broadcastFileUploadMessage(filename: string, size: number) {
  const file: File = {
    name: filename,
    size: size,
    create_time: Date.now()
  };
  
  const roomFileUploadMessage: RoomFileUploadMessage = {
    type: MESSAGE_TYPES.ROOM_FILE_UPLOAD,
    file: file
  };
  
  broadcastMessage(roomFileUploadMessage);
  console.log(`文件上传消息已广播给所有客户端: ${filename}`);
}

// 广播文件删除消息给所有客户端
function broadcastFileDeleteMessage(filename: string) {
  const roomFileDeleteMessage: RoomFileDeleteMessage = {
    type: MESSAGE_TYPES.ROOM_FILE_DELETE,
    file_name: filename
  };
  
  broadcastMessage(roomFileDeleteMessage);
  console.log(`文件删除消息已广播给所有客户端: ${filename}`);
}

// 广播消息给指定房间的所有客户端
function broadcastMessageToRoom(roomId: number, message: RoomTextMessage | RoomTextDeleteMessage) {
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

// 文件下载路由（支持断点续传）
app.get('/api/download/:filename', (req: Request, res: Response) => {
  const filename = req.params.filename;
  const filePath = path.join(DATA_PATHS.FILE_DIR, filename);
  
  // 检查文件是否存在
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    // 获取文件信息
    fs.stat(filePath, (err, stats) => {
      if (err) {
        return res.status(500).json({ error: '无法获取文件信息' });
      }
      
      const fileSize = stats.size;
      const range = req.headers.range;
      
      // 如果没有Range请求头，则发送整个文件
      if (!range) {
        res.setHeader('Content-Length', fileSize);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        
        fileStream.on('error', (error) => {
          console.error('文件下载错误:', error);
          if (!res.headersSent) {
            res.status(500).json({ error: '文件下载失败' });
          }
        });
        return;
      }
      
      // 解析Range请求头
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      
      // 验证范围是否有效
      if (start >= fileSize || end >= fileSize || start > end) {
        return res.status(416).json({ error: '请求的Range范围无效' });
      }
      
      // 设置响应头
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', chunksize);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.status(206); // 206 Partial Content
      
      // 创建指定范围的文件流
      const fileStream = fs.createReadStream(filePath, { start, end });
      fileStream.pipe(res);
      
      fileStream.on('error', (error) => {
        console.error('文件下载错误:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: '文件下载失败' });
        }
      });
    });
  });
});

// 配置multer存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DATA_PATHS.FILE_DIR);
  },
  filename: (req, file, cb) => {
    // 使用URL参数中的文件名，而不是原始文件名
    const filename = req.params.filename;
    cb(null, filename);
  }
});

// 创建multer实例
const upload = multer({ storage });

// 文件上传路由（支持断点续传）
app.post('/api/upload/:filename', upload.single('file'), (req: Request, res: Response) => {
  const filename = req.params.filename;
  const filePath = path.join(DATA_PATHS.FILE_DIR, filename);
  const contentRange = req.headers['content-range'];
  
  if (!req.file) {
    return res.status(400).json({ error: '没有上传文件' });
  }
  
  const uploadedFile = req.file; // 确保TypeScript知道文件已定义
  
  // 如果有Content-Range头，则是断点续传上传
  if (contentRange) {
    // 解析Content-Range头，格式为 "bytes start-end/total"
    const rangeMatch = contentRange.match(/bytes (\d+)-(\d+)\/(\d+)/);
    if (!rangeMatch) {
      return res.status(400).json({ error: '无效的Content-Range格式' });
    }
    
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    const total = parseInt(rangeMatch[3], 10);
    
    // 检查文件是否已存在
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        // 文件不存在，创建新文件
        fs.rename(uploadedFile.path, filePath, (renameErr) => {
          if (renameErr) {
            return res.status(500).json({ error: '文件保存失败' });
          }
          
          res.status(201).json({ 
            success: true, 
            message: '文件创建成功',
            filename: filename,
            size: uploadedFile.size,
            range: `bytes 0-${uploadedFile.size - 1}/${uploadedFile.size}`
          });
        });
      } else {
        // 文件存在，检查是否需要追加内容
        fs.stat(filePath, (statErr, stats) => {
          if (statErr) {
            return res.status(500).json({ error: '无法获取文件信息' });
          }
          
          const currentSize = stats.size;
          
          // 如果请求的起始位置不等于当前文件大小，返回冲突
          if (start !== currentSize) {
            fs.unlink(uploadedFile.path, () => {}); // 删除临时文件
            return res.status(409).json({ 
              error: '文件续传位置不匹配',
              expected: currentSize,
              received: start
            });
          }
          
          // 追加文件内容
          const readStream = fs.createReadStream(uploadedFile.path);
          const writeStream = fs.createWriteStream(filePath, { flags: 'a' });
          
          readStream.pipe(writeStream);
          
          writeStream.on('finish', () => {
            fs.unlink(uploadedFile.path, () => {}); // 删除临时文件
            
            // 检查是否上传完成
            const newSize = currentSize + uploadedFile.size;
            const isComplete = newSize === total;
            
            res.status(isComplete ? 200 : 206).json({ 
              success: true, 
              message: isComplete ? '文件上传完成' : '文件片段上传成功',
              filename: filename,
              size: newSize,
              total: total,
              range: `bytes 0-${newSize - 1}/${total}`,
              complete: isComplete
            });

            // 如果文件上传完成，广播给所有客户端
            if (isComplete) {
              broadcastFileUploadMessage(filename, newSize);
            }
          });
          
          writeStream.on('error', (writeErr) => {
            fs.unlink(uploadedFile.path, () => {}); // 删除临时文件
            res.status(500).json({ error: '文件写入失败' });
          });
        });
      }
    });
  } else {
    // 普通上传，直接保存文件
    fs.rename(uploadedFile.path, filePath, (err) => {
      if (err) {
        return res.status(500).json({ error: '文件保存失败' });
      }
      
      res.json({ 
        success: true, 
        message: '文件上传成功',
        filename: filename,
        size: uploadedFile.size
      });

      // 广播文件上传消息给所有客户端
      broadcastFileUploadMessage(filename, uploadedFile.size);
    });
  }
});

// 获取文件上传状态路由
app.head('/api/upload/:filename', (req: Request, res: Response) => {
  const filename = req.params.filename;
  const filePath = path.join(DATA_PATHS.FILE_DIR, filename);
  
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // 文件不存在
      res.setHeader('Accept-Ranges', 'bytes');
      return res.status(404).end();
    }
    
    // 文件存在，返回当前大小
    fs.stat(filePath, (statErr, stats) => {
      if (statErr) {
        return res.status(500).end();
      }
      
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', '0');
      res.setHeader('Upload-Offset', stats.size.toString());
      res.setHeader('Upload-Length', stats.size.toString());
      res.status(200).end();
    });
  });
});

// 删除文件路由
app.delete('/api/file/:filename', (req: Request, res: Response) => {
  const filename = req.params.filename;
  const filePath = path.join(DATA_PATHS.FILE_DIR, filename);
  
  // 检查文件是否存在
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    // 删除文件
    fs.unlink(filePath, (unlinkErr) => {
      if (unlinkErr) {
        console.error('删除文件失败:', unlinkErr);
        return res.status(500).json({ error: '删除文件失败' });
      }
      
      res.json({ 
        success: true, 
        message: '文件删除成功',
        filename: filename
      });

      // 广播文件删除消息给所有客户端
      broadcastFileDeleteMessage(filename);
    });
  });
});

// 创建房间路由
app.post('/api/room/create', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    
    // 参数验证
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: '房间名不能为空' });
    }
    
    // 检查房间名是否已存在
    const exists = await checkRoomNameExists(name);
    if (exists) {
      return res.status(400).json({ error: '房间名已存在' });
    }
    
    // 创建房间
    const roomId = await createRoom(name, '');
    
    // 获取新创建的房间信息
    const newRoom = await getRoomById(roomId);
    
    res.status(201).json(newRoom);
  } catch (error) {
    console.error('创建房间失败:', error);
    res.status(500).json({ error: '创建房间失败' });
  }
});

