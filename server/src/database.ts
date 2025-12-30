import * as sqlite3 from 'sqlite3';
import { DATA_PATHS } from './constants';
// @ts-ignore
import { MESSAGE_TYPES, RoomTextMessage, RoomTextsUpdateMessage } from '../../shared/WebSocketProtocol';

// 数据库文件路径
const DB_PATH = DATA_PATHS.DATABASE_FILE;

// 数据库实例
let db: sqlite3.Database | null = null;

// 初始化数据库连接
export function initializeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('数据库连接失败:', err.message);
        reject(err);
      } else {
        console.log('数据库连接成功');
        createTables()
          .then(() => createDefaultRoom())
          .then(() => resolve())
          .catch(reject);
      }
    });
  });
}

// 创建表
function createTables(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('数据库未初始化'));
      return;
    }

    // 创建房间表
    const createRoomsTable = `
      CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 创建消息表 - 根据WebSocketProtocol.ts中的RoomTextMessage接口设计
    const createMessagesTable = `
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room INTEGER NOT NULL,
        user_name TEXT NOT NULL,
        user_uuid TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (room) REFERENCES rooms (id) ON DELETE CASCADE
      )
    `;

    db.serialize(() => {
      if (!db) {
        reject(new Error('数据库连接未初始化'));
        return;
      }
      
      db.run(createRoomsTable, (err) => {
        if (err) {
          console.error('创建房间表失败:', err.message);
          reject(err);
          return;
        }
        console.log('房间表创建成功');
      });

      db.run(createMessagesTable, (err) => {
        if (err) {
          console.error('创建消息表失败:', err.message);
          reject(err);
          return;
        }
        console.log('消息表创建成功');
        resolve();
      });
    });
  });
}

// 创建默认房间（公开房间）
function createDefaultRoom(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('数据库未初始化'));
      return;
    }

    // 检查是否已存在默认房间
    db.get('SELECT * FROM rooms WHERE name = ""', (err: Error | null, row: any) => {
      if (err) {
        console.error('查询默认房间失败:', err.message);
        reject(err);
        return;
      }

      if (row) {
        console.log('默认房间已存在');
        resolve();
        return;
      }

      // 创建默认房间
      if (!db) {
        reject(new Error('数据库连接未初始化'));
        return;
      }
      
      db.run('INSERT INTO rooms (name, description) VALUES ("", "公开房间")', (err) => {
        if (err) {
          console.error('创建默认房间失败:', err.message);
          reject(err);
          return;
        }
        console.log('默认房间创建成功');
        resolve();
      });
    });
  });
}

// 获取数据库实例
export function getDatabase(): sqlite3.Database {
  if (!db) {
    throw new Error('数据库未初始化，请先调用 initializeDatabase()');
  }
  return db;
}

// 保存文本消息到数据库 - 支持RoomTextMessage接口
export function saveMessage(room: number, userName: string, userUuid: string, content: string, timestamp: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.run(
      'INSERT INTO messages (room, user_name, user_uuid, content, timestamp) VALUES (?, ?, ?, ?, ?)',
      [room, userName, userUuid, content, timestamp],
      function(this: sqlite3.RunResult, err: Error | null) {
        if (err) {
          console.error('保存消息失败:', err.message);
          reject(err);
          return;
        }
        
        console.log(`消息已保存，ID: ${this.lastID}`);
        resolve(this.lastID);
      }
    );
  });
}

// 获取房间消息 - 返回RoomTextMessage格式的数据
export function getRoomMessages(roomId: number, limit: number = 100): Promise<RoomTextsUpdateMessage> {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
    db.all(
      'SELECT id, room, user_name, user_uuid, content, timestamp FROM messages WHERE room = ? ORDER BY timestamp ASC LIMIT ?',
      [roomId, limit],
      (err: Error | null, rows: any[]) => {
        if (err) {
          console.error('获取房间消息失败:', err.message);
          reject(err);
          return;
        }
        
        const messages = rows.map(row => ({
          id: row.id,
          user_name: row.user_name,
          user_uuid: row.user_uuid,
          room_id: row.room,
          content: row.content,
          timestamp: row.timestamp
        }));
        
        resolve({
          type: MESSAGE_TYPES.ROOM_TEXTS_UPDATE,
          room_texts: messages
        });
      }
    );
  });
}

// 获取所有房间
export function getAllRooms(): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
    db.all('SELECT * FROM rooms ORDER BY created_at', (err: Error | null, rows: any[]) => {
      if (err) {
        console.error('获取房间列表失败:', err.message);
        reject(err);
        return;
      }
      
      resolve(rows);
    });
  });
}

// 获取房间ID（根据房间名称）
export function getRoomIdByName(name: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
    db.get('SELECT id FROM rooms WHERE name = ?', [name], (err: Error | null, row: any) => {
      if (err) {
        console.error('获取房间ID失败:', err.message);
        reject(err);
        return;
      }
      
      if (!row) {
        reject(new Error(`房间 "${name}" 不存在`));
        return;
      }
      
      resolve(row.id);
    });
  });
}

// 根据房间ID获取房间信息
export function getRoomById(roomId: number): Promise<any> {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
    db.get('SELECT * FROM rooms WHERE id = ?', [roomId], (err: Error | null, row: any) => {
      if (err) {
        console.error('获取房间信息失败:', err.message);
        reject(err);
        return;
      }
      
      if (!row) {
        reject(new Error(`房间ID ${roomId} 不存在`));
        return;
      }
      
      resolve(row);
    });
  });
}

// 删除消息
export function deleteMessage(messageId: number): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
    db.run('DELETE FROM messages WHERE id = ?', [messageId], function(this: sqlite3.RunResult, err: Error | null) {
      if (err) {
        console.error('删除消息失败:', err.message);
        reject(err);
        return;
      }
      
      if (this.changes === 0) {
        console.log(`消息ID ${messageId} 不存在或已被删除`);
        resolve(false);
        return;
      }
      
      console.log(`消息ID ${messageId} 已删除`);
      resolve(true);
    });
  });
}

// 检查房间名是否存在
export function checkRoomNameExists(name: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
    db.get('SELECT id FROM rooms WHERE name = ?', [name], (err: Error | null, row: any) => {
      if (err) {
        console.error('检查房间名失败:', err.message);
        reject(err);
        return;
      }
      
      resolve(!!row);
    });
  });
}

// 创建新房间
export function createRoom(name: string, description?: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.run(
      'INSERT INTO rooms (name, description) VALUES (?, ?)',
      [name, description || ''],
      function(this: sqlite3.RunResult, err: Error | null) {
        if (err) {
          console.error('创建房间失败:', err.message);
          reject(err);
          return;
        }
        
        console.log(`房间已创建，ID: ${this.lastID}`);
        resolve(this.lastID);
      }
    );
  });
}

// 关闭数据库连接
export function closeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve();
      return;
    }
    
    db.close((err) => {
      if (err) {
        console.error('关闭数据库失败:', err.message);
        reject(err);
        return;
      }
      
      console.log('数据库连接已关闭');
      db = null;
      resolve();
    });
  });
}