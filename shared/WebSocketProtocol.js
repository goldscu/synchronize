"use strict";
/**
 * Shared types and protocols for WebSocket communication
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MESSAGE_TYPES = void 0;
exports.getRoomTypeWithRoomName = getRoomTypeWithRoomName;
// WebSocket消息类型常量
exports.MESSAGE_TYPES = {
    // 用户相关消息
    USER_JOINED: 'user_joined',
    USERS_UPDATE: 'users_update',
    USER_EXIT: 'user_exit',
    // 房间相关消息
    ROOM_UPDATE: 'room_update',
    // 房间文本消息
    ROOM_TEXT_MESSAGE: 'room_text_message',
    ROOM_TEXTS_UPDATE: 'room_texts_update',
    ROOM_TEXT_MESSAGE_DELETE: 'room_text_message_delete',
    // 房间文件消息
    ROOM_FILES_UPDATE: 'room_files_update',
    ROOM_FILE_DELETE: 'room_file_delete',
    ROOM_FILE_UPLOAD: 'room_file_upload',
};
function getRoomTypeWithRoomName(roomName) {
    return roomName.length === 0 ? 'private' : 'public';
}
