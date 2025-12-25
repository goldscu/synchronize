/**
 * Shared types and protocols for WebSocket communication
 */

export type RoomType = 'public' | 'private';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp?: number;
}

export interface RoomMessage extends WebSocketMessage {
  room: RoomType;
}

export interface UserJoinedMessage extends RoomMessage {
  type: 'user_joined';
  data: {
    username: string;
  };
}

export interface UserExitMessage extends RoomMessage {
  type: 'user_exit';
  data: {
    username: string;
  };
}

export interface ChatMessage extends RoomMessage {
  type: 'chat_message';
  data: {
    username: string;
    title: string;
    content: string;
  };
}