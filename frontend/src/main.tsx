import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './style.css'
import './i18n'  // 导入 i18n 配置
import 'antd/dist/reset.css';  // 更新为新的导入方式

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
