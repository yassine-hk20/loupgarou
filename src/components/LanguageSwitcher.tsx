import { useTranslation } from 'react-i18next'

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const language = i18n.language.startsWith('ar') ? 'ar' : 'en'

  return (
    <div className="language-switch" aria-label={t('language')}>
      <button
        type="button"
        className={language === 'en' ? 'is-active' : ''}
        aria-pressed={language === 'en'}
        onClick={() => void i18n.changeLanguage('en')}
      >
        {t('english')}
      </button>
      <button
        type="button"
        className={language === 'ar' ? 'is-active' : ''}
        aria-pressed={language === 'ar'}
        onClick={() => void i18n.changeLanguage('ar')}
      >
        {t('arabic')}
      </button>
    </div>
  )
}