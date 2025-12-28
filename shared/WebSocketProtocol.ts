/**
 * Shared types and protocols for WebSocket communication
 */

export type RoomType = 'public' | 'private';

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

export interface UserJoinedMessage extends WebSocketMessage {
  type: 'user_joined'
}

export interface UsersUpdateMessage {
  type: 'users_update'
  users: [{
    user_name: string
    user_uuid: string
  }]
}

export interface UserExitMessage extends WebSocketMessage {
  type: 'user_exit'
}

export interface RoomTextMessage extends WebSocketMessage {
  type: 'room_text_message'
  content: string
}

export interface RoomTextsUpdateMessage {
  type: 'room_texts_update'
  room_texts: [RoomTextMessage]
}

export interface RoomFilesUpdateMessage {
  type: 'room_files_update'
  files: [{
    filename: string
    filesize: number
    create_time: number
  }]
}