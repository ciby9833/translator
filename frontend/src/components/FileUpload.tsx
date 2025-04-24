// frontend/src/components/FileUpload.tsx   文件上传
import { useTranslation } from 'react-i18next'
import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

interface FileUploadProps {
  onFileSelect: (file: File | null) => void
  selectedFile: File | null
  disabled?: boolean
}

const FileUpload = ({ onFileSelect, selectedFile, disabled }: FileUploadProps) => {
  const { t } = useTranslation()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      if (file.size > 30 * 1024 * 1024) { // 30MB
        alert(t('upload.fileTooLarge'))
        return
      }
      onFileSelect(file)
    }
  }, [onFileSelect, t])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx']
    },
    multiple: false,
    maxSize: 30 * 1024 * 1024, // 30MB
    onDropRejected: (fileRejections) => {
      const error = fileRejections[0]?.errors[0]
      if (error?.code === 'file-too-large') {
        alert(t('upload.fileTooLarge'))
      } else if (error?.code === 'file-invalid-type') {
        alert(t('upload.invalidType'))
      }
    }
  })

  return (
    <div className="file-upload">
      <div 
        {...getRootProps()} 
        className={`dropzone ${isDragActive ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
      >
        <input {...getInputProps()} />
        {selectedFile ? (
          <div>
            <p>{t('upload.selected', { filename: selectedFile.name })}</p>
            <p className="file-size">
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          </div>
        ) : (
          <p>
            {isDragActive
              ? t('upload.drop')
              : t('upload.drag')}
          </p>
        )}
      </div>
      <div className="file-info">
        <p className="file-hint">{t('upload.formats')}</p>
        <p className="file-hint">{t('upload.maxSize')}</p>
      </div>
    </div>
  )
}

export default FileUpload