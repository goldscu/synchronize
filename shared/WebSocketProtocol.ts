/**
 * Shared types and protocols for WebSocket communication
 */

export type RoomType = 'public' | 'private';

// WebSocket消息类型常量
export const MESSAGE_TYPES = {
  // 用户相关消息
  USER_JOINED: 'user_joined',
  USERS_UPDATE: 'users_update',
  USER_EXIT: 'user_exit',
  
  // 房间文本消息
  ROOM_TEXT_MESSAGE: 'room_text_message',
  ROOM_TEXTS_UPDATE: 'room_texts_update',
  
  // 房间文件消息
  ROOM_FILES_UPDATE: 'room_files_update'
} as const;

// 消息类型联合类型
export type MessageType = typeof MESSAGE_TYPES[keyof typeof MESSAGE_TYPES];

export function getRoomTypeWithRoomName(roomName: string): RoomType {
  return roomName.length === 0 ? 'private' : 'public';
}

export interface Room {
  id: number
  name: string
  description?: string
  created_at: number
}

export interface WebSocketMessage {
  type: string
  user_name: string
  user_uuid: string
  room?: Room
  timestamp?: number
}

export interface UserJoinedMessage {
  type: typeof MESSAGE_TYPES.USER_JOINED
  user_name: string
  user_uuid: string
  room_id: number
}

export interface UsersUpdateMessage {
  type: typeof MESSAGE_TYPES.USERS_UPDATE
  users: {
    user_name: string
    user_uuid: string
  }[]
}

export interface UserExitMessage extends WebSocketMessage {
  type: typeof MESSAGE_TYPES.USER_EXIT
}

export interface RoomTextMessage extends WebSocketMessage {
  type: typeof MESSAGE_TYPES.ROOM_TEXT_MESSAGE
  content: string
}

export interface RoomTextsUpdateMessage {
  type: typeof MESSAGE_TYPES.ROOM_TEXTS_UPDATE
  room_texts: [RoomTextMessage]
}

export interface RoomFilesUpdateMessage {
  type: typeof MESSAGE_TYPES.ROOM_FILES_UPDATE
  files: [{
    filename: string
    filesize: number
    create_time: number
  }]
}