import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppHeader } from '../components/AppHeader'
import { roleById } from '../data/roles'
import type { SavedGame } from '../types/game'

interface DistributionProps {
  game: SavedGame
  onReady?: () => void
  onReveal?: (name: string) => void
  onConfirm?: () => void
  onContinue?: () => void
}

export function HandoverScreen({ game, onReady }: DistributionProps) {
  const { t } = useTranslation()
  const current = game.distributionIndex + 1

  return (
    <div className="app-shell distribution-shell">
      <AppHeader />
      <main className="private-stage">
        <div className="pass-icon" aria-hidden="true"><span>↻</span></div>
        <p className="step-label">{t('playerProgress', { current, total: game.assignments.length })}</p>
        <h1>{t('handoverTitle')}</h1>
        <p className="screen-intro">{t('handoverBody')}</p>
        <button type="button" className="button button-primary button-large" onClick={onReady}>{t('ready')} <span aria-hidden="true">→</span></button>
      </main>
    </div>
  )
}

export function IdentificationScreen({ game, onReveal }: DistributionProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const current = game.distributionIndex + 1

  return (
    <div className="app-shell distribution-shell">
      <AppHeader />
      <main className="private-stage identify-stage">
        <p className="step-label">{t('playerProgress', { current, total: game.assignments.length })}</p>
        <h1>{t('yourName')}</h1>
        <label className="input-label" htmlFor="player-name">{t('yourName')}</label>
        <input
          autoComplete="off"
          autoFocus
          className="text-input"
          id="player-name"
          maxLength={40}
          placeholder={t('namePlaceholder')}
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && name.trim()) onReveal?.(name)
          }}
        />
        <button type="button" className="button button-primary button-large" disabled={!name.trim()} onClick={() => onReveal?.(name)}>{t('revealRole')} <span aria-hidden="true">→</span></button>
      </main>
    </div>
  )
}

export function RevealScreen({ game, onConfirm }: DistributionProps) {
  const { t } = useTranslation()
  const assignment = game.assignments[game.distributionIndex]
  const role = assignment ? roleById.get(String(assignment.roleId)) : undefined
  const roleText = role ? t(`roles:${role.key}`, { returnObjects: true }) as { name: string; detail: string } : null

  if (!role || !roleText) return null

  return (
    <div className="app-shell reveal-shell">
      <AppHeader />
      <main className="reveal-stage" aria-live="polite">
        <p className="step-label">{t('roleRevealHint')}</p>
        <div className="reveal-emblem" aria-hidden="true">{role.icon}</div>
        <p className="revealed-player">{assignment.name}</p>
        <h1>{roleText.name}</h1>
        <p className="role-full-description">{roleText.detail}</p>
        <button type="button" className="button button-primary button-large" onClick={onConfirm}>{t('gotIt')}</button>
      </main>
    </div>
  )
}

export function DistributionCompleteScreen({ onContinue }: DistributionProps) {
  const { t } = useTranslation()

  return (
    <div className="app-shell distribution-shell">
      <AppHeader />
      <main className="private-stage completion-stage">
        <div className="complete-mark" aria-hidden="true">✓</div>
        <h1>{t('distributionComplete')}</h1>
        <p className="screen-intro">{t('distributionCompleteBody')}</p>
        <button type="button" className="button button-primary button-large" onClick={onContinue}>{t('returnToNarrator')} <span aria-hidden="true">→</span></button>
      </main>
    </div>
  )
}