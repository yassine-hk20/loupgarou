import { useTranslation } from 'react-i18next'
import { AppHeader } from '../components/AppHeader'
import { RoleCard } from '../components/RoleCard'
import { roles, roleSlots, type RoleCategory } from '../data/roles'
import type { GameSettings, RoleId } from '../types/game'

const categories: RoleCategory[] = ['village', 'werewolf', 'independent', 'changing', 'professions', 'custom']

interface RoleSelectionScreenProps {
  playerCount: number
  selectedRoleIds: RoleId[]
  settings: GameSettings
  error?: string
  onToggleRole: (roleId: RoleId) => void
  onSetConfig: (key: string, value: number) => void
  onBack: () => void
  onStart: () => void
}

export function RoleSelectionScreen({ playerCount, selectedRoleIds, settings, error, onToggleRole, onSetConfig, onBack, onStart }: RoleSelectionScreenProps) {
  const { t } = useTranslation()
  const selectedSlots = roleSlots(selectedRoleIds)
  const isExact = selectedSlots === playerCount

  return (
    <div className="app-shell role-selection-shell">
      <AppHeader />
      <main className="flow-main role-selection-main">
        <div className="step-label">02 / 02</div>
        <div className="role-selection-heading">
          <div>
            <h1>{t('chooseRoles')}</h1>
            <p className="screen-intro">{t('roleCountMismatch', { count: playerCount })}</p>
          </div>
          <div className={`slot-counter ${isExact ? 'is-complete' : ''}`} aria-live="polite">
            <strong>{selectedSlots}<span> / {playerCount}</span></strong>
            <small>{t('roleCount')}</small>
          </div>
        </div>
        <div className="slot-track" aria-hidden="true"><span style={{ width: `${Math.min(100, (selectedSlots / playerCount) * 100)}%` }} /></div>
        {!isExact && <p className="validation-message" role="status">{t('remaining')}: {playerCount - selectedSlots}</p>}
        {error && <p className="error-message" role="alert">{t(error)}</p>}
        <div className="role-groups">
          {categories.map((category) => {
            const categoryRoles = roles.filter((role) => role.category === category)
            return (
              <section className="role-group" key={category}>
                <h2>{t(`categories.${category}`)}</h2>
                <div className="role-list">
                  {categoryRoles.map((role) => {
                    const selected = selectedRoleIds.includes(role.id)
                    return (
                      <div className="role-item" key={role.id}>
                        <RoleCard role={role} selected={selected} onToggle={onToggleRole} />
                        {role.configuration === 'sheepCount' && selected && (
                          <label className="role-config">
                            <span>{t('sheepCount')}</span>
                            <input
                              type="number"
                              min={0}
                              max={playerCount}
                              value={Number(settings.roleConfiguration.sheepCount ?? 3)}
                              onChange={(event) => onSetConfig('sheepCount', Math.max(0, Math.min(playerCount, Number(event.currentTarget.value))))}
                            />
                          </label>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
        <div className="sticky-actions">
          <button type="button" className="button button-quiet" onClick={onBack}>{t('back')}</button>
          <button type="button" className="button button-primary" disabled={!isExact} onClick={onStart}>{t('startDistribution')} <span aria-hidden="true">→</span></button>
        </div>
      </main>
    </div>
  )
}