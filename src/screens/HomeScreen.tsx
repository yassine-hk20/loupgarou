import { useTranslation } from 'react-i18next'
import { AppHeader } from '../components/AppHeader'

interface HomeScreenProps {
  hasSavedGame: boolean
  onNewGame: () => void
  onContinue: () => void
  onSettings: () => void
}

export function HomeScreen({ hasSavedGame, onNewGame, onContinue, onSettings }: HomeScreenProps) {
  const { t } = useTranslation()

  return (
    <div className="app-shell home-shell">
      <AppHeader />
      <main className="home-main">
        <div className="home-kicker"><span className="kicker-line" /> {t('offlineReady')}</div>
        <div className="home-title-wrap">
          <div className="moon-mark" aria-hidden="true"><span /></div>
          <h1>{t('appName')}</h1>
          <p>{t('tagline')}</p>
        </div>
        <div className="home-actions">
          <button type="button" className="button button-primary button-large" onClick={onNewGame}>
            <span aria-hidden="true">＋</span>{t('newGame')}
          </button>
          {hasSavedGame && (
            <button type="button" className="button button-outline button-large" onClick={onContinue}>
              <span aria-hidden="true">↗</span>{t('continueGame')}
            </button>
          )}
          <button type="button" className="settings-link" onClick={onSettings}>{t('settings')}</button>
        </div>
      </main>
      <footer className="app-footer"><span className="footer-rule" />{t('privacyNote')}</footer>
    </div>
  )
}