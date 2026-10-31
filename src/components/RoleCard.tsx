import { useTranslation } from 'react-i18next'
import type { RoleDefinition } from '../data/roles'
import type { RoleId } from '../types/game'

interface RoleCardProps {
  role: RoleDefinition
  selected: boolean
  onToggle: (roleId: RoleId) => void
}

export function RoleCard({ role, selected, onToggle }: RoleCardProps) {
  const { t } = useTranslation()
  const roleText = t(`roles:${role.key}`, { returnObjects: true }) as { name: string; short: string }
  const idLabel = typeof role.id === 'number' ? `#${role.id}` : t('customRole')

  return (
    <label className={`role-card ${selected ? 'is-selected' : ''}`}>
      <input type="checkbox" checked={selected} onChange={() => onToggle(role.id)} />
      <span className="role-checkbox" aria-hidden="true">{selected ? '✓' : ''}</span>
      <span className="role-icon" aria-hidden="true">{role.icon}</span>
      <span className="role-card-copy">
        <span className="role-card-heading"><strong>{roleText.name}</strong><small>{idLabel}</small></span>
        <span className="role-card-description">{roleText.short}</span>
        <span className="role-badges">
          {role.playerSlots > 1 && <span>{role.playerSlots} {t('players')}</span>}
          {role.custom && <span>{t('customRole')}</span>}
          {role.expansion && <span>{t('expansionRole')}</span>}
        </span>
      </span>
    </label>
  )
}