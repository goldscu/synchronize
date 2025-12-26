import * as sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

// 数据库文件路径
const DB_PATH = path.join(__dirname, '../data/sqlite/synchronize.db');

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
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 创建消息表
    const createMessagesTable = `
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms(id)
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

// 保存文本消息到数据库
export function saveMessage(roomId: number, username: string, content: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.run(
      'INSERT INTO messages (room_id, username, content) VALUES (?, ?, ?)',
      [roomId, username, content],
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

// 获取房间消息
export function getRoomMessages(roomId: number, limit: number = 50): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
    db.all(
      'SELECT * FROM messages WHERE room_id = ? ORDER BY created_at DESC LIMIT ?',
      [roomId, limit],
      (err: Error | null, rows: any[]) => {
        if (err) {
          console.error('获取房间消息失败:', err.message);
          reject(err);
          return;
        }
        
        // 按时间升序返回（最新的在最后）
        resolve(rows.reverse());
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