// 直接在client中定义ConnectionStatus枚举
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting'
}

import CryptoJS from 'crypto-js';
import {
  Message,
  MessageType,
  ConnectData,
  CreateRoomData,
  JoinRoomData,
  TextMessageData,
  FileMessageData,
  FileChunkData,
  DeleteMessageData
} from '../../shared/protocol';

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private clientId: string = '';
  private roomName: string = '';
  private roomKey: string = '';
  private status: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectInterval: number = 2000;
  private eventHandlers: Map<string, Function[]> = new Map();
  private fileUploads: Map<string, FileUpload> = new Map();

  constructor(url: string) {
    this.url = url;
    this.initEventHandlers();
  }

  private initEventHandlers(): void {
    const events = ['connect', 'disconnect', 'message', 'error', 'roomJoined', 'roomError', 'onlineCount'];
    events.forEach(event => {
      this.eventHandlers.set(event, []);
    });
  }

  on(event: string, handler: Function): void {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event)!.push(handler);
    }
  }

  off(event: string, handler: Function): void {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event)!;
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(event: string, ...args: any[]): void {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event)!.forEach(handler => {
        handler(...args);
      });
    }
  }

  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.status = ConnectionStatus.CONNECTING;
    this.emit('connect', this.status);

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.status = ConnectionStatus.CONNECTED;
        this.reconnectAttempts = 0;
        this.emit('connect', this.status);
        
        // 发送连接消息
        const connectMessage: Message = {
          type: MessageType.CONNECT,
          data: {
            clientId: this.clientId || CryptoJS.lib.WordArray.random(16).toString(),
            version: '1.0.0'
          } as ConnectData,
          timestamp: Date.now()
        };
        this.send(connectMessage);
      };

      this.ws.onmessage = (event) => {
        try {
          const message: Message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      this.ws.onclose = () => {
        this.status = ConnectionStatus.DISCONNECTED;
        this.emit('disconnect');
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
      };
    } catch (error) {
      console.error('Failed to connect:', error);
      this.status = ConnectionStatus.DISCONNECTED;
      this.emit('error', error);
      this.emit('connect', this.status);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.status = ConnectionStatus.DISCONNECTED;
    this.emit('connect', this.status);
  }

  reconnect(): void {
    this.reconnectAttempts = 0;
    this.connect();
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    this.status = ConnectionStatus.RECONNECTING;
    this.emit('connect', this.status);

    setTimeout(() => {
      this.connect();
    }, this.reconnectInterval * this.reconnectAttempts);
  }

  private handleMessage(message: Message): void {
    switch (message.type) {
      case MessageType.CONNECT_ACK:
        this.clientId = message.data.clientId;
        break;
      
      case MessageType.ROOM_JOINED:
        this.roomName = message.data.roomName;
        this.emit('roomJoined', message.data);
        break;
      
      case MessageType.ROOM_ERROR:
        this.emit('roomError', message.data);
        break;
      
      case MessageType.ROOM_ONLINE_COUNT:
        this.emit('onlineCount', message.data.count);
        break;
      
      case MessageType.TEXT_MESSAGE:
      case MessageType.FILE_MESSAGE:
      case MessageType.MESSAGE_DELETED:
        this.emit('message', message);
        break;
      
      case MessageType.FILE_CHUNK_ACK:
        this.handleFileChunkAck(message.data);
        break;
      
      case MessageType.ERROR:
        this.emit('error', message.data);
        break;
    }
  }

  send(message: Message): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket not connected');
    }
  }

  // 房间管理
  createRoom(roomName: string, isPrivate: boolean): void {
    const message: Message = {
      type: MessageType.CREATE_ROOM,
      data: {
        roomName,
        isPrivate
      } as CreateRoomData,
      timestamp: Date.now()
    };
    this.send(message);
  }

  joinRoom(roomName: string, key?: string): void {
    this.roomKey = key || '';
    const message: Message = {
      type: MessageType.JOIN_ROOM,
      data: {
        roomName,
        key
      } as JoinRoomData,
      timestamp: Date.now()
    };
    this.send(message);
  }

  // 消息发送
  sendTextMessage(title: string, content: string): void {
    if (!this.roomName || !this.roomKey) {
      console.error('Not in a room or no room key');
      return;
    }

    // 加密消息内容
    const encryptedContent = this.encryptMessage(content, this.roomKey);
    
    const message: Message = {
      type: MessageType.TEXT_MESSAGE,
      data: {
        id: CryptoJS.lib.WordArray.random(16).toString(),
        roomName: this.roomName,
        clientId: this.clientId,
        title,
        content: JSON.stringify({ title, content: encryptedContent }),
        timestamp: Date.now(),
        isEncrypted: true
      } as TextMessageData,
      timestamp: Date.now()
    };
    this.send(message);
  }

  // 文件发送
  async sendFile(file: File): Promise<void> {
    if (!this.roomName) {
      console.error('Not in a room');
      return;
    }

    const chunkSize = 1024 * 1024; // 1MB chunks
    const chunks = Math.ceil(file.size / chunkSize);
    const messageId = CryptoJS.lib.WordArray.random(16).toString();

    // 发送文件消息元数据
    const fileMessage: Message = {
      type: MessageType.FILE_MESSAGE,
      data: {
        id: messageId,
        roomName: this.roomName,
        clientId: this.clientId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        chunks,
        chunkSize,
        timestamp: Date.now(),
        uploadComplete: false
      } as FileMessageData,
      timestamp: Date.now()
    };
    this.send(fileMessage);

    // 创建文件上传管理器
    const upload = new FileUpload(file, messageId, chunks, chunkSize);
    this.fileUploads.set(messageId, upload);

    // 开始上传
    await this.uploadFileChunks(upload);
  }

  private async uploadFileChunks(upload: FileUpload): Promise<void> {
    const { file, messageId, totalChunks, chunkSize } = upload;

    for (let i = upload.currentChunk; i < totalChunks; i++) {
      if (upload.paused) {
        break;
      }

      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);

      try {
        const chunkData = await this.readFileChunk(chunk);
        const chunkMessage: Message = {
          type: MessageType.FILE_CHUNK,
          data: {
            messageId,
            roomName: this.roomName,
            chunkIndex: i,
            totalChunks: totalChunks,
            chunkData
          } as FileChunkData,
          timestamp: Date.now()
        };
        this.send(chunkMessage);

        upload.currentChunk = i + 1;
        upload.progress = (upload.currentChunk / totalChunks) * 100;
      } catch (error) {
        console.error('Error uploading chunk:', error);
        upload.failed = true;
        break;
      }
    }
  }

  private readFileChunk(chunk: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(chunk);
    });
  }

  private handleFileChunkAck(data: any): void {
    const upload = this.fileUploads.get(data.messageId);
    if (upload && data.received) {
      // 检查是否所有chunk都已上传
      if (upload.currentChunk >= upload.totalChunks) {
        upload.complete = true;
        this.fileUploads.delete(data.messageId);
      }
    }
  }

  resumeFileUpload(messageId: string): void {
    const upload = this.fileUploads.get(messageId);
    if (upload && upload.paused) {
      upload.paused = false;
      upload.failed = false;
      this.uploadFileChunks(upload);
    }
  }

  pauseFileUpload(messageId: string): void {
    const upload = this.fileUploads.get(messageId);
    if (upload) {
      upload.paused = true;
    }
  }

  // 删除消息
  deleteMessage(messageId: string): void {
    if (!this.roomName) {
      console.error('Not in a room');
      return;
    }

    const message: Message = {
      type: MessageType.DELETE_MESSAGE,
      data: {
        messageId,
        roomName: this.roomName
      } as DeleteMessageData,
      timestamp: Date.now()
    };
    this.send(message);
  }

  // 加密解密
  encryptMessage(message: string, key: string): string {
    return CryptoJS.AES.encrypt(message, key).toString();
  }

  decryptMessage(encryptedMessage: string, key: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedMessage, key);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Error decrypting message:', error);
      return 'Decryption failed';
    }
  }

  // Getters
  getStatus(): ConnectionStatus {
    return this.status;
  }

  getClientId(): string {
    return this.clientId;
  }

  getRoomName(): string {
    return this.roomName;
  }

  getRoomKey(): string {
    return this.roomKey;
  }

  getFileUpload(messageId: string): FileUpload | undefined {
    return this.fileUploads.get(messageId);
  }
}

export class FileUpload {
  file: File;
  messageId: string;
  totalChunks: number;
  chunkSize: number;
  currentChunk: number = 0;
  progress: number = 0;
  complete: boolean = false;
  paused: boolean = false;
  failed: boolean = false;

  constructor(file: File, messageId: string, totalChunks: number, chunkSize: number) {
    this.file = file;
    this.messageId = messageId;
    this.totalChunks = totalChunks;
    this.chunkSize = chunkSize;
  }
}