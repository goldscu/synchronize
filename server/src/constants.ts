import path from 'path';

// 基础数据目录路径常量
export const DATA_BASE_PATH = path.join(__dirname, '../../data');

// 数据目录路径常量（基于DATA_BASE_PATH）
export const DATA_PATHS = {
  // 项目根目录下的data文件夹
  ROOT_DATA_DIR: DATA_BASE_PATH,
  // 文件存储目录
  FILE_DIR: path.join(DATA_BASE_PATH, 'file'),
  // SQLite数据库目录
  SQLITE_DIR: path.join(DATA_BASE_PATH, 'sqlite'),
  // 数据库文件路径
  DATABASE_FILE: path.join(DATA_BASE_PATH, 'sqlite', 'synchronize.db'),
};