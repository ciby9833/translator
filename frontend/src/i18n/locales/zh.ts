export default {
  translation: {
    title: 'Cargo翻译神器',
    upload: {
      title: '上传文档',
      drag: '拖拽文件到此处，或点击选择文件',
      drop: '将文件放在这里',
      selected: '已选择文件：{{filename}}',
      formats: '支持的格式：PDF、DOCX、PPTX',
      fileTooLarge: '文件太大，最大支持30MB',
      largeFileWarning: '（大文件可能需要较长上传时间）',
      maxSize: '最大文件大小：30MB'
    },
    language: {
      title: '目标语言',
      select: '选择目标语言'
    },
    status: {
      uploading: '正在上传文档...',
      translating: '正在翻译...',
      downloading: '准备下载...',
      completed: '翻译完成！',
      autoDownloaded: '文件已自动下载。',
      error: '错误：{{message}}'
    },
    button: {
      translate: '翻译文档',
      copy: '复制'
    },
    translator: {
        title: '翻译服务',
        select: '选择翻译服务',
        unavailable: '(不可用)',
        deepl: 'DeepL',
        google: '谷歌翻译'
      },
    textTranslate: {
      sourcePlaceholder: "在此输入文本",
      translatedPlaceholder: "翻译结果将显示在这里",
      translate: "翻译",
      translating: "正在翻译...",
      characterLimit: "字符数限制：{count}/3000"
    },
    footer: {
        allRightsReserved: '版权所有'
      },
    error: {
        characterLimit: '本月翻译字数已达上限，请联系管理员',
        timeout: '翻译超时',
        emptyFile: '收到的文件为空',
        uploadTimeout: '上传超时，请尝试上传小一点的文件或检查网络连接',
        fileTooLarge: '文件太大，最大支持30MB',
        unexpected: '发生未知错误'
      },
    or: "或",
    mode: {
      text: "文本翻译",
      document: "文档翻译"
    }
  }
}
