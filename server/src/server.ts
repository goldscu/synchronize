import WebSocket, { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';
import { DatabaseManager } from './database';
import {
  Message,
  MessageType,
  ConnectData,
  ConnectAckData,
  CreateRoomData,
  JoinRoomData,
  RoomJoinedData,
  RoomErrorData,
  RoomOnlineCountData,
  TextMessageData,
  FileMessageData,
  FileChunkData,
  FileChunkAckData,
  DeleteMessageData,
  MessageDeletedData,
  ErrorData
} from '../../shared/protocol';

interface Client {
  id: string;
  ws: WebSocket;
  roomName?: string;
  connected: boolean;
}

export class ChatServer {
  private wss: WebSocketServer;
  private db: DatabaseManager;
  private clients: Map<string, Client> = new Map();
  private rooms: Map<string, Set<string>> = new Map();
  private filesDir: string;

  constructor(port: number, dbPath: string, filesDir: string) {
    this.wss = new WebSocketServer({ port });
    this.db = new DatabaseManager(dbPath);
    this.filesDir = filesDir;

    // 确保文件目录存在
    if (!fs.existsSync(this.filesDir)) {
      fs.mkdirSync(this.filesDir, { recursive: true });
    }

    this.setupEventHandlers();
    console.log(`Server started on port ${port}`);
  }

  private setupEventHandlers(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      const client = this.createClient(ws);
      this.handleClientConnection(client);
    });

    this.wss.on('error', (error: Error) => {
      console.error('WebSocket server error:', error);
    });
  }

  private createClient(ws: WebSocket): Client {
    const id = uuidv4();
    const client: Client = {
      id,
      ws,
      connected: true
    };
    this.clients.set(id, client);
    return client;
  }

  private handleClientConnection(client: Client): void {
    client.ws.on('message', (data: Buffer) => {
      try {
        const message: Message = JSON.parse(data.toString());
        this.handleMessage(client, message);
      } catch (error) {
        console.error('Error parsing message:', error);
        this.sendError(client, 'INVALID_MESSAGE', 'Invalid message format');
      }
    });

    client.ws.on('close', () => {
      this.handleClientDisconnect(client);
    });

    client.ws.on('error', (error: Error) => {
      console.error('Client error:', error);
      this.handleClientDisconnect(client);
    });
  }

  private handleClientDisconnect(client: Client): void {
    if (client.roomName) {
      this.removeClientFromRoom(client);
    }
    this.clients.delete(client.id);
    client.connected = false;
  }

  private async handleMessage(client: Client, message: Message): Promise<void> {
    switch (message.type) {
      case MessageType.CONNECT:
        await this.handleConnect(client, message.data as ConnectData);
        break;
      case MessageType.CREATE_ROOM:
        await this.handleCreateRoom(client, message.data as CreateRoomData);
        break;
      case MessageType.JOIN_ROOM:
        await this.handleJoinRoom(client, message.data as JoinRoomData);
        break;
      case MessageType.TEXT_MESSAGE:
        await this.handleTextMessage(client, message.data as TextMessageData);
        break;
      case MessageType.FILE_MESSAGE:
        await this.handleFileMessage(client, message.data as FileMessageData);
        break;
      case MessageType.FILE_CHUNK:
        await this.handleFileChunk(client, message.data as FileChunkData);
        break;
      case MessageType.DELETE_MESSAGE:
        await this.handleDeleteMessage(client, message.data as DeleteMessageData);
        break;
      default:
        this.sendError(client, 'UNKNOWN_MESSAGE_TYPE', 'Unknown message type');
    }
  }

  private async handleConnect(client: Client, data: ConnectData): Promise<void> {
    const response: Message = {
      type: MessageType.CONNECT_ACK,
      data: {
        clientId: client.id,
        serverTime: Date.now()
      } as ConnectAckData,
      timestamp: Date.now()
    };
    this.sendMessage(client, response);
  }

  private async handleCreateRoom(client: Client, data: CreateRoomData): Promise<void> {
    const { roomName, isPrivate } = data;
    
    // 检查房间是否已存在
    const existingRoom = await this.db.getRoom(roomName);
    if (existingRoom) {
      this.sendRoomError(client, 'ROOM_EXISTS', 'Room already exists');
      return;
    }

    // 创建新房间
    const success = await this.db.createRoom(roomName, isPrivate);
    if (!success) {
      this.sendRoomError(client, 'CREATE_FAILED', 'Failed to create room');
      return;
    }

    // 加入房间
    await this.joinRoom(client, roomName);
  }

  private async handleJoinRoom(client: Client, data: JoinRoomData): Promise<void> {
    const { roomName } = data;
    
    // 检查房间是否存在
    const room = await this.db.getRoom(roomName);
    if (!room) {
      this.sendRoomError(client, 'ROOM_NOT_FOUND', 'Room not found');
      return;
    }

    // 加入房间
    await this.joinRoom(client, roomName);
  }

  private async joinRoom(client: Client, roomName: string): Promise<void> {
    // 从当前房间移除
    if (client.roomName) {
      this.removeClientFromRoom(client);
    }

    // 添加到新房间
    client.roomName = roomName;
    if (!this.rooms.has(roomName)) {
      this.rooms.set(roomName, new Set());
    }
    this.rooms.get(roomName)!.add(client.id);

    // 获取房间历史消息
    const messages = await this.db.getMessages(roomName);
    
    // 发送房间加入确认
    const response: Message = {
      type: MessageType.ROOM_JOINED,
      data: {
        roomName,
        isPrivate: messages.length > 0 ? messages[0].is_private : false,
        messages: messages.map(msg => ({
          id: msg.id,
          roomName: msg.room_name,
          clientId: msg.client_id,
          title: msg.message_type === 'text_message' ? JSON.parse(msg.content).title : undefined,
          content: msg.content,
          fileName: msg.file_name,
          fileSize: msg.file_size,
          fileType: msg.file_type,
          chunks: msg.chunks,
          chunkSize: msg.chunk_size,
          timestamp: msg.timestamp,
          isEncrypted: msg.message_type === 'text_message',
          uploadComplete: msg.upload_complete
        }))
      } as RoomJoinedData,
      timestamp: Date.now()
    };
    this.sendMessage(client, response);

    // 更新在线人数
    this.updateRoomOnlineCount(roomName);
  }

  private removeClientFromRoom(client: Client): void {
    if (!client.roomName) return;

    const roomClients = this.rooms.get(client.roomName);
    if (roomClients) {
      roomClients.delete(client.id);
      if (roomClients.size === 0) {
        this.rooms.delete(client.roomName);
      } else {
        this.updateRoomOnlineCount(client.roomName);
      }
    }

    client.roomName = undefined;
  }

  private async handleTextMessage(client: Client, data: TextMessageData): Promise<void> {
    if (!client.roomName) {
      this.sendError(client, 'NOT_IN_ROOM', 'Not in a room');
      return;
    }

    // 保存消息到数据库
    const message: TextMessageData = {
      ...data,
      id: data.id || uuidv4(),
      roomName: client.roomName,
      clientId: client.id,
      timestamp: Date.now()
    };

    await this.db.saveMessage({
      id: message.id,
      room_name: message.roomName,
      client_id: message.clientId,
      message_type: MessageType.TEXT_MESSAGE,
      content: message.content,
      timestamp: message.timestamp
    });

    // 广播消息
    this.broadcastToRoom(client.roomName, {
      type: MessageType.TEXT_MESSAGE,
      data: message,
      timestamp: Date.now()
    });
  }

  private async handleFileMessage(client: Client, data: FileMessageData): Promise<void> {
    if (!client.roomName) {
      this.sendError(client, 'NOT_IN_ROOM', 'Not in a room');
      return;
    }

    const fileMessage: FileMessageData = {
      ...data,
      id: data.id || uuidv4(),
      roomName: client.roomName,
      clientId: client.id,
      timestamp: Date.now(),
      uploadComplete: false
    };

    // 保存文件消息元数据
    await this.db.saveMessage({
      id: fileMessage.id,
      room_name: fileMessage.roomName,
      client_id: fileMessage.clientId,
      message_type: MessageType.FILE_MESSAGE,
      file_name: fileMessage.fileName,
      file_size: fileMessage.fileSize,
      file_type: fileMessage.fileType,
      chunks: fileMessage.chunks,
      chunk_size: fileMessage.chunkSize,
      timestamp: fileMessage.timestamp
    });

    // 广播文件消息
    this.broadcastToRoom(client.roomName, {
      type: MessageType.FILE_MESSAGE,
      data: fileMessage,
      timestamp: Date.now()
    });
  }

  private async handleFileChunk(client: Client, data: FileChunkData): Promise<void> {
    if (!client.roomName) {
      this.sendError(client, 'NOT_IN_ROOM', 'Not in a room');
      return;
    }

    const { messageId, chunkIndex, totalChunks, chunkData } = data;

    // 保存chunk到数据库
    await this.db.saveFileChunk(messageId, chunkIndex, totalChunks);

    // 保存chunk到磁盘
    this.db.saveFileChunkToDisk(messageId, chunkIndex, chunkData, this.filesDir);

    // 发送确认
    const ack: Message = {
      type: MessageType.FILE_CHUNK_ACK,
      data: {
        messageId,
        chunkIndex,
        received: true
      } as FileChunkAckData,
      timestamp: Date.now()
    };
    this.sendMessage(client, ack);

    // 检查是否所有chunk都已接收
    const chunks = await this.db.getFileChunks(messageId);
    if (chunks.length === totalChunks) {
      // 获取文件元数据
      const messages = await this.db.getMessages(client.roomName);
      const fileMessage = messages.find(msg => msg.id === messageId);
      
      if (fileMessage) {
        // 重建文件
        await this.db.reconstructFile(messageId, fileMessage.file_name!, this.filesDir);
        
        // 标记上传完成
        await this.db.markFileComplete(messageId);

        // 广播文件上传完成
        this.broadcastToRoom(client.roomName, {
          type: MessageType.FILE_MESSAGE,
          data: {
            ...fileMessage,
            uploadComplete: true
          },
          timestamp: Date.now()
        });
      }
    }
  }

  private async handleDeleteMessage(client: Client, data: DeleteMessageData): Promise<void> {
    if (!client.roomName) {
      this.sendError(client, 'NOT_IN_ROOM', 'Not in a room');
      return;
    }

    const { messageId } = data;

    // 获取消息
    const messages = await this.db.getMessages(client.roomName);
    const message = messages.find(msg => msg.id === messageId);

    if (!message) {
      this.sendError(client, 'MESSAGE_NOT_FOUND', 'Message not found');
      return;
    }

    // 删除文件（如果是文件消息）
    if (message.message_type === MessageType.FILE_MESSAGE && message.file_name) {
      this.db.deleteFile(messageId, message.file_name, this.filesDir);
    }

    // 从数据库删除消息
    await this.db.deleteMessage(messageId);

    // 广播删除消息
    this.broadcastToRoom(client.roomName, {
      type: MessageType.MESSAGE_DELETED,
      data: {
        messageId,
        roomName: client.roomName,
        timestamp: Date.now()
      } as MessageDeletedData,
      timestamp: Date.now()
    });
  }

  private sendMessage(client: Client, message: Message): void {
    if (client.connected && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  private broadcastToRoom(roomName: string, message: Message): void {
    const roomClients = this.rooms.get(roomName);
    if (!roomClients) return;

    roomClients.forEach(clientId => {
      const client = this.clients.get(clientId);
      if (client) {
        this.sendMessage(client, message);
      }
    });
  }

  private sendError(client: Client, code: string, message: string): void {
    const errorMessage: Message = {
      type: MessageType.ERROR,
      data: {
        code,
        message
      } as ErrorData,
      timestamp: Date.now()
    };
    this.sendMessage(client, errorMessage);
  }

  private sendRoomError(client: Client, code: string, message: string): void {
    const errorMessage: Message = {
      type: MessageType.ROOM_ERROR,
      data: {
        code,
        message
      } as RoomErrorData,
      timestamp: Date.now()
    };
    this.sendMessage(client, errorMessage);
  }

  private updateRoomOnlineCount(roomName: string): void {
    const roomClients = this.rooms.get(roomName);
    const count = roomClients ? roomClients.size : 0;

    const message: Message = {
      type: MessageType.ROOM_ONLINE_COUNT,
      data: {
        roomName,
        count
      } as RoomOnlineCountData,
      timestamp: Date.now()
    };

    this.broadcastToRoom(roomName, message);
  }

  close(): void {
    this.wss.close();
    this.db.close();
  }
}