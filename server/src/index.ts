import { ChatServer } from './server';
import * as path from 'path';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;
const DB_PATH = path.join(__dirname, '..', 'chat.db');
const FILES_DIR = path.join(__dirname, '..', 'files');

const server = new ChatServer(PORT, DB_PATH, FILES_DIR);

// 优雅关闭
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  server.close();
  process.exit(0);
});

console.log(`Secure Chat Server running on port ${PORT}`);