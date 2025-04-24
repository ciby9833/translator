// frontend/src/components/TranslationStatus.tsx   翻译状态
import { useTranslation } from 'react-i18next'
import type { TranslationStatus as Status } from '../App'

interface TranslationStatusProps {
  status: Status
  errorMessage: string
}

const TranslationStatus = ({ status, errorMessage }: TranslationStatusProps) => {
  const { t } = useTranslation()

  if (status === 'error' && errorMessage) {
    return (
      <div className="translation-status error">
        <p className="error-message">{errorMessage}</p>
      </div>
    )
  }

  if (status === 'idle' || status === 'completed') {
    return null
  }

  return (
    <div className="translation-status">
      <p>{t(`status.${status}`)}</p>
    </div>
  )
}

export default TranslationStatus