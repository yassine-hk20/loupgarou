import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from './LanguageSwitcher'

export function AppHeader({ onHome, canGoHome = false }: { onHome?: () => void; canGoHome?: boolean }) {
  const { t } = useTranslation()

  return (
    <header className="app-header">
      <button type="button" className="brand" onClick={canGoHome ? onHome : undefined} disabled={!canGoHome}>
        <span className="brand-mark" aria-hidden="true">L</span>
        <span className="brand-copy">
          <strong>{t('appName')}</strong>
          <small>{t('tagline')}</small>
        </span>
      </button>
      <LanguageSwitcher />
    </header>
  )
}