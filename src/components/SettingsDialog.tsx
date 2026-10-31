import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from './LanguageSwitcher'

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="confirm-dialog settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <p className="eyebrow">{t('appName')}</p>
        <h2 id="settings-title">{t('settingsTitle')}</h2>
        <div className="settings-row"><span>{t('language')}</span><LanguageSwitcher /></div>
        <p className="privacy-copy">{t('privacyNote')}</p>
        <button type="button" className="button button-primary" onClick={onClose}>{t('close')}</button>
      </section>
    </div>
  )
}