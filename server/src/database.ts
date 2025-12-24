import { Database } from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

export class DatabaseManager {
  private db: Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.initTables();
  }

  private initTables(): void {
    // 创建房间表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_name TEXT UNIQUE NOT NULL,
        is_private BOOLEAN NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);

    // 创建消息表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        room_name TEXT NOT NULL,
        client_id TEXT NOT NULL,
        message_type TEXT NOT NULL,
        content TEXT,
        file_name TEXT,
        file_size INTEGER,
        file_type TEXT,
        chunks INTEGER,
        chunk_size INTEGER,
        upload_complete BOOLEAN DEFAULT FALSE,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (room_name) REFERENCES rooms (room_name)
      )
    `);

    // 创建文件chunk表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS file_chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        total_chunks INTEGER NOT NULL,
        received BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (message_id) REFERENCES messages (id),
        UNIQUE (message_id, chunk_index)
      )
    `);
  }

  // 房间相关操作
  async createRoom(roomName: string, isPrivate: boolean): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO rooms (room_name, is_private, created_at) VALUES (?, ?, ?)',
        [roomName, isPrivate, Date.now()],
        (err) => {
          if (err) {
            resolve(false);
          } else {
            resolve(true);
          }
        }
      );
    });
  }

  async getRoom(roomName: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM rooms WHERE room_name = ?',
        [roomName],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }

  // 消息相关操作
  async saveMessage(message: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const { id, roomName, clientId, messageType, content, fileName, fileSize, fileType, chunks, chunkSize, timestamp } = message;
      
      this.db.run(
        `INSERT INTO messages (id, room_name, client_id, message_type, content, file_name, file_size, file_type, chunks, chunk_size, timestamp) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, roomName, clientId, messageType, content, fileName, fileSize, fileType, chunks, chunkSize, timestamp],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  async getMessages(roomName: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM messages WHERE room_name = ? ORDER BY timestamp ASC',
        [roomName],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  }

  async deleteMessage(messageId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM messages WHERE id = ?',
        [messageId],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  // 文件chunk相关操作
  async saveFileChunk(messageId: string, chunkIndex: number, totalChunks: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT OR IGNORE INTO file_chunks (message_id, chunk_index, total_chunks, received) VALUES (?, ?, ?, ?)',
        [messageId, chunkIndex, totalChunks, true],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  async getFileChunks(messageId: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM file_chunks WHERE message_id = ? ORDER BY chunk_index',
        [messageId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  }

  async markFileComplete(messageId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE messages SET upload_complete = TRUE WHERE id = ?',
        [messageId],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  // 文件系统操作
  saveFileChunkToDisk(messageId: string, chunkIndex: number, chunkData: string, filesDir: string): void {
    const chunkDir = path.join(filesDir, messageId);
    if (!fs.existsSync(chunkDir)) {
      fs.mkdirSync(chunkDir, { recursive: true });
    }

    const chunkPath = path.join(chunkDir, `${chunkIndex}.chunk`);
    fs.writeFileSync(chunkPath, chunkData, 'base64');
  }

  async reconstructFile(messageId: string, fileName: string, filesDir: string): Promise<string> {
    const chunkDir = path.join(filesDir, messageId);
    const chunks = fs.readdirSync(chunkDir).map(f => parseInt(f.split('.')[0]));
    chunks.sort((a, b) => a - b);

    const filePath = path.join(filesDir, fileName);
    const fileStream = fs.createWriteStream(filePath);

    for (const chunkIndex of chunks) {
      const chunkPath = path.join(chunkDir, `${chunkIndex}.chunk`);
      const chunkData = fs.readFileSync(chunkPath, 'base64');
      fileStream.write(Buffer.from(chunkData, 'base64'));
    }

    fileStream.end();
    
    // 清理chunk文件
    fs.rmSync(chunkDir, { recursive: true, force: true });

    return filePath;
  }

  deleteFile(messageId: string, fileName: string, filesDir: string): void {
    const filePath = path.join(filesDir, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const chunkDir = path.join(filesDir, messageId);
    if (fs.existsSync(chunkDir)) {
      fs.rmSync(chunkDir, { recursive: true, force: true });
    }
  }

  close(): void {
    this.db.close();
  }
}