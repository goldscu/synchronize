/**
 * Shared types and protocols for WebSocket communication
 */

export type RoomType = 'public' | 'private';

export interface WebSocketMessage {
  type: string;
  username: string;
  timestamp?: number;
  data: any;
}

export interface UserJoinedMessage extends WebSocketMessage {
  type: 'user_joined';
  data: {};
}

export interface UserExitMessage extends WebSocketMessage {
  type: 'user_exit';
  data: {};
}

export interface RoomTextMessage extends WebSocketMessage {
  type: 'room_text_message';
  roomname: string;
  data: {
    title: string;
    content: string;
  };
}

export interface RoomFileMessage extends WebSocketMessage {
  type: 'room_file_message';
  roomname: string;
  data: {
    filename: string;
  };
}