import { useTranslation } from 'react-i18next'
import { AppHeader } from '../components/AppHeader'

interface PlayerCountScreenProps {
  playerCount: number
  onSetCount: (count: number) => void
  onContinue: () => void
}

export function PlayerCountScreen({ playerCount, onSetCount, onContinue }: PlayerCountScreenProps) {
  const { t } = useTranslation()

  return (
    <div className="app-shell">
      <AppHeader />
      <main className="flow-main count-main">
        <div className="step-label">01 / 02</div>
        <h1>{t('playerCount')}</h1>
        <p className="screen-intro">{t('playerCountHint')}</p>
        <div className="count-control" dir="ltr">
          <button type="button" className="count-step" aria-label="Decrease player count" disabled={playerCount <= 3} onClick={() => onSetCount(playerCount - 1)}>−</button>
          <input
            aria-label={t('playerCount')}
            type="number"
            min={3}
            max={30}
            value={playerCount}
            onChange={(event) => onSetCount(Number(event.currentTarget.value))}
          />
          <button type="button" className="count-step" aria-label="Increase player count" disabled={playerCount >= 30} onClick={() => onSetCount(playerCount + 1)}>＋</button>
        </div>
        <p className="count-caption">{t('players')}</p>
        <button type="button" className="button button-primary button-large flow-continue" onClick={onContinue}>{t('continue')} <span aria-hidden="true">→</span></button>
      </main>
    </div>
  )
}