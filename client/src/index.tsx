import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n'; // 导入i18n配置
import { ThemeProvider } from './ThemeContext';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);