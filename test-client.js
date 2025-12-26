const WebSocket = require('./server/node_modules/ws');

// 连接到WebSocket服务器
const ws = new WebSocket('ws://localhost:3000/synchronize');

ws.on('open', function open() {
  console.log('已连接到服务器');
  
  // 发送文本消息
  const textMessage = {
    type: 'text',
    username: 'TestUser',
    content: '这是一条测试消息'
  };
  
  ws.send(JSON.stringify(textMessage));
  console.log('已发送文本消息:', textMessage);
  
  // 等待一秒后发送文件消息
  setTimeout(() => {
    const fileMessage = {
      type: 'file',
      username: 'TestUser',
      fileName: 'test.txt',
      fileSize: 1024,
      fileData: 'data:text/plain;base64,SGVsbG8gV29ybGQ=' // "Hello World" in base64
    };
    
    ws.send(JSON.stringify(fileMessage));
    console.log('已发送文件消息:', fileMessage);
    
    // 等待一秒后关闭连接
    setTimeout(() => {
      ws.close();
    }, 1000);
  }, 1000);
});

ws.on('message', function message(data) {
  console.log('收到服务器消息:', data.toString());
});

ws.on('close', function close() {
  console.log('已断开连接');
  process.exit(0);
});

ws.on('error', function error(err) {
  console.error('WebSocket错误:', err);
  process.exit(1);
});