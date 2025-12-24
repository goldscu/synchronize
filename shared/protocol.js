export var MessageType;
(function (MessageType) {
    // 连接管理
    MessageType["CONNECT"] = "connect";
    MessageType["CONNECT_ACK"] = "connect_ack";
    MessageType["DISCONNECT"] = "disconnect";
    MessageType["RECONNECT"] = "reconnect";
    // 房间管理
    MessageType["CREATE_ROOM"] = "create_room";
    MessageType["JOIN_ROOM"] = "join_room";
    MessageType["ROOM_JOINED"] = "room_joined";
    MessageType["ROOM_ERROR"] = "room_error";
    MessageType["ROOM_ONLINE_COUNT"] = "room_online_count";
    // 消息管理
    MessageType["TEXT_MESSAGE"] = "text_message";
    MessageType["FILE_MESSAGE"] = "file_message";
    MessageType["FILE_CHUNK"] = "file_chunk";
    MessageType["FILE_CHUNK_ACK"] = "file_chunk_ack";
    MessageType["DELETE_MESSAGE"] = "delete_message";
    MessageType["MESSAGE_DELETED"] = "message_deleted";
    // 错误处理
    MessageType["ERROR"] = "error";
})(MessageType || (MessageType = {}));
// WebSocket 状态
export var ConnectionStatus;
(function (ConnectionStatus) {
    ConnectionStatus["DISCONNECTED"] = "disconnected";
    ConnectionStatus["CONNECTING"] = "connecting";
    ConnectionStatus["CONNECTED"] = "connected";
    ConnectionStatus["RECONNECTING"] = "reconnecting";
})(ConnectionStatus || (ConnectionStatus = {}));
