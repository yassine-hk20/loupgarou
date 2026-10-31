import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from './components/ConfirmDialog'
import { SettingsDialog } from './components/SettingsDialog'
import { assignmentsForRoles } from './services/gameMachine'
import { useGame } from './hooks/useGame'
import { DistributionCompleteScreen, HandoverScreen, IdentificationScreen, RevealScreen } from './screens/DistributionScreens'
import { HomeScreen } from './screens/HomeScreen'
import { NarratorConfirmationScreen, NarratorDashboard } from './screens/NarratorScreens'
import { GameRoundScreen } from './screens/GameRoundScreen'
import { PlayerCountScreen } from './screens/PlayerCountScreen'
import { RoleSelectionScreen } from './screens/RoleSelectionScreen'
import './App.css'

function App() {
  const { t } = useTranslation()
  const { game, savedGame, expiredGame, isLoading, storageError, dispatch, resume, startAfterExpiry, clearExpired, clearStorageError } = useGame()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [confirmNew, setConfirmNew] = useState(false)
  const [errorCode, setErrorCode] = useState<string | null>(null)

  const send = useCallback((action: Parameters<typeof dispatch>[0]) => {
    const error = dispatch(action)
    setErrorCode(error)
    return error === null
  }, [dispatch])

  useEffect(() => {
    const isRoleReveal = game?.stage === 'ROLE_REVEAL' || game?.stage === 'PLAYER_IDENTIFICATION'
    if (!isRoleReveal) return
    const hidePrivateScreen = () => {
      if (document.visibilityState !== 'hidden' && !window.location.hash) return
      if (isRoleReveal) send({ type: 'HIDE_ROLE' })
    }
    document.addEventListener('visibilitychange', hidePrivateScreen)
    window.addEventListener('pagehide', hidePrivateScreen)
    window.addEventListener('popstate', hidePrivateScreen)
    return () => {
      document.removeEventListener('visibilitychange', hidePrivateScreen)
      window.removeEventListener('pagehide', hidePrivateScreen)
      window.removeEventListener('popstate', hidePrivateScreen)
    }
  }, [game?.stage, send])

  const startNewGame = () => {
    if (savedGame) {
      setConfirmNew(true)
      return
    }
    send({ type: 'START_NEW' })
  }

  const replaceSavedGame = () => {
    setConfirmNew(false)
    send({ type: 'START_NEW' })
  }

  const revealPlayerRole = (name: string) => {
    if (!send({ type: 'IDENTIFY_PLAYER', name })) return
    send({ type: 'REVEAL_ROLE' })
  }

  const startDistribution = () => {
    if (!game) return
    send({ type: 'BEGIN_DISTRIBUTION', assignments: assignmentsForRoles(game.selectedRoleIds) })
  }

  const endGame = () => {
    setConfirmEnd(false)
    send({ type: 'END_GAME' })
  }

  if (isLoading) {
    return <main className="loading-screen" aria-live="polite"><span className="loading-mark">L</span></main>
  }

  let screen
  if (!game) {
    screen = <HomeScreen hasSavedGame={Boolean(savedGame)} onNewGame={startNewGame} onContinue={resume} onSettings={() => setSettingsOpen(true)} />
  } else {
    switch (game.stage) {
      case 'GAME_SETUP':
        screen = <PlayerCountScreen playerCount={game.playerCount} onSetCount={(count) => send({ type: 'SET_PLAYER_COUNT', count })} onContinue={() => send({ type: 'TO_ROLE_SELECTION' })} />
        break
      case 'ROLE_SELECTION':
        screen = <RoleSelectionScreen
          playerCount={game.playerCount}
          selectedRoleIds={game.selectedRoleIds}
          settings={game.settings}
          error={errorCode ?? undefined}
          onToggleRole={(roleId) => send({ type: 'TOGGLE_ROLE', roleId })}
          onSetConfig={(key, value) => send({ type: 'SET_ROLE_CONFIG', key, value })}
          onBack={() => send({ type: 'TO_SETUP' })}
          onStart={startDistribution}
        />
        break
      case 'HANDOVER':
        screen = <HandoverScreen game={game} onReady={() => send({ type: 'OPEN_IDENTIFICATION' })} />
        break
      case 'PLAYER_IDENTIFICATION':
        screen = <IdentificationScreen game={game} onReveal={revealPlayerRole} />
        break
      case 'ROLE_REVEAL':
        screen = <RevealScreen game={game} onConfirm={() => send({ type: 'CONFIRM_ROLE' })} />
        break
      case 'DISTRIBUTION_COMPLETE':
        screen = <DistributionCompleteScreen game={game} onContinue={() => send({ type: 'OPEN_NARRATOR' })} />
        break
      case 'NARRATOR_CONFIRMATION':
        screen = <NarratorConfirmationScreen game={game} onConfirm={() => send({ type: 'CONFIRM_NARRATOR' })} />
        break
      case 'NARRATOR_DASHBOARD':
        screen = <NarratorDashboard game={game} onStart={() => send({ type: 'START_GAME' })} onEnd={() => setConfirmEnd(true)} />
        break
      case 'GAME_STARTED':
        screen = <GameRoundScreen game={game} onAction={send} onEnd={() => setConfirmEnd(true)} />
        break
      default:
        screen = <HomeScreen hasSavedGame={Boolean(savedGame)} onNewGame={startNewGame} onContinue={resume} onSettings={() => setSettingsOpen(true)} />
    }
  }

  return (
    <>
      {screen}
      {storageError && <div className="toast-message" role="alert"><span>{t('loadError')}</span><button type="button" onClick={clearStorageError} aria-label={t('close')}>×</button></div>}
      {errorCode && errorCode !== 'sessionExpired' && <div className="toast-message" role="alert"><span>{t(errorCode)}</span><button type="button" onClick={() => setErrorCode(null)} aria-label={t('close')}>×</button></div>}
      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
      {confirmNew && <ConfirmDialog title={t('replaceSavedQuestion')} message={t('replaceSavedBody')} confirmLabel={t('newGame')} onConfirm={replaceSavedGame} onCancel={() => setConfirmNew(false)} destructive />}
      {confirmEnd && <ConfirmDialog title={t('endGame')} message={t('endGameConfirm')} confirmLabel={t('confirmEnd')} onConfirm={endGame} onCancel={() => setConfirmEnd(false)} destructive />}
      {expiredGame && <ConfirmDialog title={t('expiredQuestion')} message={t('savedGameExpired')} confirmLabel={t('startFresh')} cancelLabel="clearExpired" onConfirm={startAfterExpiry} onCancel={() => void clearExpired()} destructive />}
    </>
  )
}

export default App
