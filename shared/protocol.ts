// WebSocket 协议定义
export interface Message {
  type: MessageType;
  data: any;
  timestamp: number;
}

export enum MessageType {
  // 连接管理
  CONNECT = 'connect',
  CONNECT_ACK = 'connect_ack',
  DISCONNECT = 'disconnect',
  RECONNECT = 'reconnect',
  
  // 房间管理
  CREATE_ROOM = 'create_room',
  JOIN_ROOM = 'join_room',
  ROOM_JOINED = 'room_joined',
  ROOM_ERROR = 'room_error',
  ROOM_ONLINE_COUNT = 'room_online_count',
  
  // 消息管理
  TEXT_MESSAGE = 'text_message',
  FILE_MESSAGE = 'file_message',
  FILE_CHUNK = 'file_chunk',
  FILE_CHUNK_ACK = 'file_chunk_ack',
  DELETE_MESSAGE = 'delete_message',
  MESSAGE_DELETED = 'message_deleted',
  
  // 错误处理
  ERROR = 'error'
}

// 连接相关
export interface ConnectData {
  clientId: string;
  version: string;
}

export interface ConnectAckData {
  clientId: string;
  serverTime: number;
}

// 房间相关
export interface CreateRoomData {
  roomName: string;
  isPrivate: boolean;
}

export interface JoinRoomData {
  roomName: string;
  key?: string;
}

export interface RoomJoinedData {
  roomName: string;
  isPrivate: boolean;
  messages: Array<TextMessageData | FileMessageData>;
}

export interface RoomErrorData {
  code: string;
  message: string;
}

export interface RoomOnlineCountData {
  roomName: string;
  count: number;
}

// 文本消息
export interface TextMessageData {
  id: string;
  roomName: string;
  clientId: string;
  title: string;
  content: string; // 加密后的内容
  timestamp: number;
  isEncrypted: boolean;
}

// 文件消息
export interface FileMessageData {
  id: string;
  roomName: string;
  clientId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  chunks: number;
  chunkSize: number;
  timestamp: number;
  uploadComplete: boolean;
}

export interface FileChunkData {
  messageId: string;
  roomName: string;
  chunkIndex: number;
  totalChunks: number;
  chunkData: string; // Base64
}

export interface FileChunkAckData {
  messageId: string;
  chunkIndex: number;
  received: boolean;
}

// 删除消息
export interface DeleteMessageData {
  messageId: string;
  roomName: string;
}

export interface MessageDeletedData {
  messageId: string;
  roomName: string;
  timestamp: number;
}

// 错误消息
export interface ErrorData {
  code: string;
  message: string;
  details?: any;
}

// WebSocket 状态
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting'
}