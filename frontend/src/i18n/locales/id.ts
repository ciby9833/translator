export default {
  translation: {
    title: 'Cargo Alat Terjemahan',
    upload: {
      title: 'Unggah Dokumen',
      drag: 'Seret dan lepas file di sini, atau klik untuk memilih',
      drop: 'Letakkan file di sini',
      selected: 'File yang dipilih: {{filename}}',
      formats: 'Format yang didukung: PDF, DOCX, PPTX',
      largeFileWarning: '（File besar mungkin memerlukan waktu unggah yang lebih lama）',
      fileTooLarge: 'File terlalu besar, maksimal 30MB',
      maxSize: 'Ukuran file maksimum: 30MB'
    },
    language: {
      title: 'Bahasa Target',
      select: 'Pilih bahasa target'
    },
    status: {
      uploading: 'Mengunggah dokumen...',
      translating: 'Menerjemahkan...',
      downloading: 'Menyiapkan unduhan...',
      completed: 'Terjemahan selesai!',
      autoDownloaded: 'Dokumen telah diunduh secara otomatis.',
      error: 'Kesalahan: {{message}}'
    },
    button: {
      translate: 'Terjemahkan Dokumen',
      copy: 'Salin'
    },
    translator: {
      title: 'Layanan Terjemahan',
      select: 'Pilih layanan terjemahan',
      unavailable: '(tidak tersedia)',
      deepl: 'DeepL',
      google: 'Google Translate'
    },
    textTranslate: {
      sourcePlaceholder: "Masukkan teks di sini",
      translatedPlaceholder: "Hasil terjemahan akan muncul di sini",
      translate: "Terjemahkan",
      translating: "Menerjemahkan...",
      characterLimit: "Batas karakter: {count}/3000"
    },
    footer: {
      allRightsReserved: 'Hak Cipta Dilindungi'
    },
    error: {
        characterLimit: 'Batas karakter terlampaui. Silakan hubungi administrator.',
        timeout: 'Waktu terjemahan habis',
        emptyFile: 'Dokumen yang diterima kosong',
        unexpected: 'Terjadi kesalahan yang tidak diketahui',
        uploadTimeout: 'Upload timeout, please try uploading a smaller file or check your network connection',
        fileTooLarge: 'File too large, maximum support 30MB'
      },
    or: "atau",
    mode: {
      text: "Terjemahan Teks",
      document: "Terjemahan Dokumen"
    }
  }
}
