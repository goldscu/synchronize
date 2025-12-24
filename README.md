# Secure Chat App

一个基于 Node.js + WebSocket + React 的安全聊天应用，支持端到端加密、文件传输和多语言。

## 项目结构

```
secure-chat-app/
├── server/          # Node.js 后端服务
├── client/          # React 前端应用
└── shared/          # 前后端共享代码
```

## 技术栈

- **后端**: Node.js, TypeScript, WebSocket, SQLite
- **前端**: React, TypeScript, Tailwind CSS
- **加密**: AES 加密（使用 crypto-js）
- **国际化**: i18next

## 功能特性

### 安全特性
- 端到端加密的文本消息
- 私有房间和公开房间
- 服务器只存储密文
- 房间密钥仅存在于客户端

### 消息功能
- 文本消息（标题 + 内容，支持换行）
- 大文件传输（支持断点续传）
- 消息历史记录
- 消息复制和删除

### 用户体验
- 实时在线设备数量显示
- WebSocket 连接状态指示
- 暗黑模式支持
- 中英文双语支持
- 响应式设计

## 快速开始

### 启动服务器

1. 进入服务器目录
```bash
cd server
```

2. 安装依赖
```bash
npm install
```

3. 启动服务器
```bash
npm run dev
```

服务器将在 `ws://localhost:8080` 上运行。

### 启动客户端

1. 进入客户端目录
```bash
cd client
```

2. 安装依赖
```bash
npm install
```

3. 启动开发服务器
```bash
npm run dev
```

客户端将在 `http://localhost:3000` 上运行。

## 使用说明

### 创建房间
1. 选择 "创建私有房间"
2. 输入房间名称
3. 设置房间密钥（私有房间必需）
4. 点击 "创建房间"

### 加入房间
1. 选择 "加入现有房间"
2. 输入房间名称
3. 如有房间密钥，输入密钥
4. 点击 "加入房间"

### 发送消息
1. 输入消息标题和内容
2. 点击 "发送消息"

### 发送文件
1. 点击 "附加文件"
2. 选择要发送的文件
3. 点击 "发送"

### 设置
- 切换语言：在设置中选择 "English" 或 "中文"
- 切换主题：在设置中切换 "深色模式" 或 "浅色模式"

## 项目配置

### 服务器配置
- 端口：8080（可通过环境变量 PORT 修改）
- 数据库：SQLite（chat.db）
- 文件存储：./files/

### 客户端配置
- WebSocket 地址：ws://localhost:8080
- 文件下载地址：http://localhost:8080/files/

## 开发说明

### 协议定义
所有 WebSocket 协议定义都在 `shared/protocol.ts` 中。

### 数据库结构
- `rooms`: 存储房间信息
- `messages`: 存储消息元数据
- `file_chunks`: 存储文件上传状态

### 安全注意事项
- 不要在不安全的网络上传输房间密钥
- 建议定期更换房间密钥
- 文件传输不加密，仅文本消息加密

## 许可证

MIT License