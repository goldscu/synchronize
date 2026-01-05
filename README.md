# Real-time Synchronization Application

## Overview
This is a real-time data synchronization application built with modern web technologies. It enables seamless data sharing and synchronization between multiple clients through WebSocket connections.

## Features
- Real-time data synchronization using WebSockets
- Client-server architecture with shared protocol definitions
- Modern React frontend with TypeScript
- Express backend with WebSocket support
- SQLite database for data persistence
- Responsive design with dark mode support
- Multi-language support
- File upload functionality

## Demo
Project demo website: https://clip.goldscu3.serv00.net

## Technology Stack

### Frontend
- React 18
- TypeScript
- Webpack
- i18next (internationalization)
- React Router

### Backend
- Node.js
- Express
- WebSockets (ws library)
- SQLite3
- Multer (file uploads)
- TypeScript
- Webpack

### Shared
- TypeScript definitions
- WebSocket protocol specifications
- Configuration management

## Project Structure
```
├── client/          # React frontend
├── server/          # Express backend with WebSockets
├── shared/          # Shared code and protocols
└── README.md        # This file
```

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd synchronize
```

2. **Install dependencies for all modules**

For frontend:
```bash
cd client
npm install
```

For backend:
```bash
cd ../server
npm install
```

3. **Configuration**

Update the configuration file in `shared/config.json` according to your needs:
```json
{
  "server": {
    "host": "0.0.0.0",
    "port": 3000
  }
}
```

## Development

### Running the Frontend
```bash
cd client
npm run dev
```

This will start the frontend in development mode with hot reload.

### Running the Backend
```bash
cd server
npm run dev
```

This will start the backend server with nodemon for automatic restarts.

### Building for Production

#### Frontend
```bash
cd client
npm run build
```

The built files will be output to `../server/public` directory.

#### Backend
```bash
cd server
npm run build
```

The built files will be output to `dist` directory.

## Deployment

1. **Build both frontend and backend**
```bash
# Build frontend
cd client
npm run build

# Build backend
cd ../server
npm run build
```

2. **Run the production server**
```bash
cd server/dist
node app.js
```

## WebSocket Protocol
The application uses a custom WebSocket protocol defined in `shared/WebSocketProtocol.ts`. This ensures consistent communication between the client and server.

## License
ISC

---

# 实时同步应用

## 概述
这是一个使用现代Web技术构建的实时数据同步应用。它通过WebSocket连接实现多个客户端之间的无缝数据共享和同步。

## 功能特性
- 使用WebSocket进行实时数据同步
- 客户端-服务器架构，带有共享协议定义
- 基于React的现代前端，使用TypeScript
- 支持WebSocket的Express后端
- SQLite数据库用于数据持久化
- 响应式设计，支持深色模式
- 多语言支持
- 文件上传功能

## 演示
项目演示网站：https://clip.goldscu3.serv00.net

## 技术栈

### 前端
- React 18
- TypeScript
- Webpack
- i18next（国际化）
- React Router

### 后端
- Node.js
- Express
- WebSockets（ws库）
- SQLite3
- Multer（文件上传）
- TypeScript
- Webpack

### 共享
- TypeScript定义
- WebSocket协议规范
- 配置管理

## 项目结构
```
├── client/          # React前端
├── server/          # 带有WebSocket的Express后端
├── shared/          # 共享代码和协议
└── README.md        # 此文件
```

## 安装与设置

### 前提条件
- Node.js (v16或更高版本)
- npm或yarn

### 安装

1. **克隆仓库**
```bash
git clone <repository-url>
cd synchronize
```

2. **安装所有模块的依赖**

安装前端依赖：
```bash
cd client
npm install
```

安装后端依赖：
```bash
cd ../server
npm install
```

3. **配置**

根据您的需要更新`shared/config.json`中的配置文件：
```json
{
  "server": {
    "host": "0.0.0.0",
    "port": 3000
  }
}
```

## 开发

### 运行前端
```bash
cd client
npm run dev
```

这将以开发模式启动前端，支持热重载。

### 运行后端
```bash
cd server
npm run dev
```

这将启动后端服务器，并使用nodemon实现自动重启。

### 构建生产版本

#### 前端
```bash
cd client
npm run build
```

构建后的文件将输出到`../server/public`目录。

#### 后端
```bash
cd server
npm run build
```

构建后的文件将输出到`dist`目录。

## 部署

1. **构建前端和后端**
```bash
# 构建前端
cd client
npm run build

# 构建后端
cd ../server
npm run build
```

2. **运行生产服务器**
```bash
cd server/dist
node app.js
```

## WebSocket协议
应用程序使用在`shared/WebSocketProtocol.ts`中定义的自定义WebSocket协议，确保客户端和服务器之间的通信一致。

## 许可证
ISC