// frontend/src/components/LanguageSelect.tsx   语言选择器
interface LanguageSelectProps {
    value: string
    onChange: (value: string) => void
    disabled?: boolean
    compact?: boolean
  }
  
  const LANGUAGES = [
    { code: 'EN', name: 'English' },
    { code: 'ZH', name: '中文' },
    { code: 'ID', name: 'Bahasa Indonesia' },
  ] as const
  
  const LanguageSelect = ({ value, onChange, disabled, compact }: LanguageSelectProps) => {
    return (
      <div className={`language-select ${compact ? 'compact' : ''}`}>
        {!compact && <label htmlFor="language">Target Language:</label>}
        <select
          id="language"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={compact ? 'compact' : ''}
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>
    )
  }
  
  export default LanguageSelect