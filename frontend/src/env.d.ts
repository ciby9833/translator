/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }

// 添加资源模块声明
declare module '*.svg' {
  const content: any;
  export default content;
}

declare module '*.png' {
  const content: any;
  export default content;
}