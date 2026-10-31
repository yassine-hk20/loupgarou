import { useTranslation } from 'react-i18next'
import { AppHeader } from '../components/AppHeader'
import { roleById } from '../data/roles'
import type { SavedGame } from '../types/game'

interface NarratorProps {
  game: SavedGame
  onConfirm?: () => void
  onStart?: () => void
  onEnd?: () => void
}

export function NarratorConfirmationScreen({ onConfirm }: NarratorProps) {
  const { t } = useTranslation()

  return (
    <div className="app-shell narrator-shell">
      <AppHeader />
      <main className="private-stage narrator-confirm-stage">
        <p className="eyebrow">{t('narratorWarningTitle')}</p>
        <div className="narrator-lock" aria-hidden="true">▣</div>
        <h1>{t('narratorWarningTitle')}</h1>
        <p className="screen-intro">{t('narratorWarningBody')}</p>
        <button type="button" className="button button-primary button-large" onClick={onConfirm}>{t('showDashboard')} <span aria-hidden="true">→</span></button>
      </main>
    </div>
  )
}

export function NarratorDashboard({ game, onStart, onEnd }: NarratorProps) {
  const { t } = useTranslation()

  return (
    <div className="app-shell dashboard-shell">
      <AppHeader />
      <main className="flow-main dashboard-main">
        <p className="step-label">{t('narratorWarningTitle')}</p>
        <h1>{t('dashboardTitle')}</h1>
        <section className="dashboard-section">
          <div className="section-heading"><h2>{t('assignedRoles')}</h2><span>{game.assignments.length}</span></div>
          <div className="assignment-card-grid">
            {game.assignments.map((assignment, index) => {
              const role = roleById.get(String(assignment.roleId))
              const roleText = role ? t(`roles:${role.key}`, { returnObjects: true }) as { name: string } : null
              return (
                <article className="assignment-card" key={`${assignment.roleId}-${index}`}>
                  <span className="assignment-card-index">{String(index + 1).padStart(2, '0')}</span>
                  <span className="assignment-card-icon" aria-hidden="true">{role?.icon}</span>
                  <strong>{assignment.name || '—'}</strong>
                  <small>{roleText?.name}</small>
                </article>
              )
            })}
          </div>
        </section>
        <section className="dashboard-section config-section">
          <div className="section-heading"><h2>{t('configuration')}</h2></div>
          {Object.entries(game.settings.roleConfiguration).map(([key, value]) => (
            <p className="config-value" key={key}><span>{t(key)}</span><strong>{String(value)}</strong></p>
          ))}
          {Object.keys(game.settings.roleConfiguration).length === 0 && <p className="empty-config">—</p>}
        </section>
        <div className="dashboard-actions">
          <button type="button" className="button button-primary button-large" onClick={onStart}>{t('beginGame')} <span aria-hidden="true">→</span></button>
          <button type="button" className="button button-danger-quiet" onClick={onEnd}>{t('endGame')}</button>
        </div>
      </main>
    </div>
  )
}

export function GameStartedScreen({ onEnd }: NarratorProps) {
  const { t } = useTranslation()

  return (
    <div className="app-shell">
      <AppHeader />
      <main className="private-stage completion-stage">
        <div className="moon-mark game-moon" aria-hidden="true"><span /></div>
        <p className="eyebrow">{t('offlineReady')}</p>
        <h1>{t('gameStarted')}</h1>
        <p className="screen-intro">{t('gameStartedBody')}</p>
        <button type="button" className="button button-danger-quiet" onClick={onEnd}>{t('endGame')}</button>
      </main>
    </div>
  )
}