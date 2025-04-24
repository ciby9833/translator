export default {
  translation: {
    title: 'Cargo Translation Tool',
    upload: {
      title: 'Upload Document',
      drag: 'Drag and drop a file here, or click to select',
      drop: 'Drop the file here',
      selected: 'Selected file: {{filename}}',
      formats: 'Supported formats: PDF, DOCX, PPTX',
      largeFileWarning: '（Large files may require longer upload times）',
      fileTooLarge: 'File too large, maximum support 30MB',
      maxSize: 'Maximum file size: 30MB'
    },
    language: {
      title: 'Target Language',
      select: 'Select target language'
    },
    status: {
      uploading: 'Uploading document...',
      translating: 'Translating...',
      downloading: 'Preparing download...',
      completed: 'Translation completed!',
      autoDownloaded: 'File has been automatically downloaded.',
      error: 'Error: {{message}}'
    },
    button: {
      translate: 'Translate Document',
      copy: 'Copy'
    },
    translator: {
      title: 'Translation Service',
      select: 'Select translation service',
      unavailable: '(unavailable)',
      deepl: 'DeepL',
      google: 'Google Translate'
    },
    textTranslate: {
      sourcePlaceholder: "Enter text here",
      translatedPlaceholder: "Translation will appear here",
      translate: "Translate",
      translating: "Translating...",
      characterLimit: "Character limit: {count}/3000"
    },
    footer: {
      allRightsReserved: 'All rights reserved'
    },
    error: {
        characterLimit: 'Monthly translation limit reached. Please contact administrator.',
        timeout: 'Translation timeout',
        emptyFile: 'Received empty file',
        uploadTimeout: 'Upload timeout, please try uploading a smaller file or check your network connection',
        fileTooLarge: 'File too large, maximum support 30MB',
        unexpected: 'An unexpected error occurred'
      },
    or: "or",
    mode: {
      text: "Text Translation",
      document: "Document Translation"
    }
  }
}
