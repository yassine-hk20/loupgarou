import { useCallback, useEffect, useRef, useState } from 'react'
import { clearSavedGame, gameRecoveryWindowMs, readSavedGame, saveGame } from '../services/database'
import { safeStageForStorage, transitionGame } from '../services/gameMachine'
import type { GameAction, SavedGame } from '../types/game'

export function useGame() {
  const [game, setGame] = useState<SavedGame | null>(null)
  const [savedGame, setSavedGame] = useState<SavedGame | null>(null)
  const [expiredGame, setExpiredGame] = useState<SavedGame | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [storageError, setStorageError] = useState(false)
  const gameRef = useRef<SavedGame | null>(null)
  const savedRef = useRef<SavedGame | null>(null)
  const writeQueue = useRef<Promise<void>>(Promise.resolve())

  const queueSave = useCallback((nextGame: SavedGame | null) => {
    writeQueue.current = writeQueue.current.then(async () => {
      if (nextGame) await saveGame(safeStageForStorage(nextGame))
      else await clearSavedGame()
    }).catch(() => setStorageError(true))
  }, [])

  useEffect(() => {
    let active = true
    void readSavedGame().then((stored) => {
      if (!active || !stored) return
      if (Date.now() - stored.lastActivityAt > gameRecoveryWindowMs) {
        setExpiredGame(stored)
      } else {
        const safeSaved = safeStageForStorage(stored)
        setSavedGame(safeSaved)
        savedRef.current = safeSaved
        if (safeSaved.stage !== stored.stage || safeSaved.assignments !== stored.assignments) {
          void saveGame(safeSaved).catch(() => setStorageError(true))
        }
      }
    }).catch(() => {
      if (active) setStorageError(true)
    }).finally(() => {
      if (active) setIsLoading(false)
    })
    return () => { active = false }
  }, [])

  const dispatch = useCallback((action: GameAction) => {
    const currentGame = gameRef.current
    if (currentGame && Date.now() - currentGame.lastActivityAt > gameRecoveryWindowMs) {
      setExpiredGame(currentGame)
      return 'sessionExpired'
    }
    const result = transitionGame(currentGame, action)
    if (result.error) return result.error
    gameRef.current = result.game
    setGame(result.game)
    if (result.game) {
      savedRef.current = result.game
      setSavedGame(result.game)
      setExpiredGame(null)
      queueSave(result.game)
    } else {
      savedRef.current = null
      setSavedGame(null)
      setExpiredGame(null)
      queueSave(null)
    }
    return null
  }, [queueSave])

  const resume = useCallback(() => {
    const candidate = savedRef.current
    if (!candidate) return
    const result = transitionGame(null, { type: 'RESTORE', game: candidate })
    gameRef.current = result.game
    setGame(result.game)
    if (result.game) queueSave(result.game)
  }, [queueSave])

  const startAfterExpiry = useCallback(() => {
    const result = transitionGame(null, { type: 'START_NEW' })
    gameRef.current = result.game
    setGame(result.game)
    setSavedGame(result.game)
    savedRef.current = result.game
    setExpiredGame(null)
    if (result.game) queueSave(result.game)
  }, [queueSave])

  const clearExpired = useCallback(async () => {
    try {
      await clearSavedGame()
      setExpiredGame(null)
      setSavedGame(null)
      savedRef.current = null
    } catch {
      setStorageError(true)
    }
  }, [])

  return {
    game,
    savedGame,
    expiredGame,
    isLoading,
    storageError,
    dispatch,
    resume,
    startAfterExpiry,
    clearExpired,
    clearStorageError: () => setStorageError(false),
  }
}