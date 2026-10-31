import { openDB } from 'idb'
import type { SavedGame } from '../types/game'

const databaseName = 'loupgarou-local'
const storeName = 'games'
const currentGameKey = 'current'

const database = openDB(databaseName, 1, {
  upgrade(db) {
    db.createObjectStore(storeName)
  },
})

export async function readSavedGame() {
  return (await database).get(storeName, currentGameKey) as Promise<SavedGame | undefined>
}

export async function saveGame(game: SavedGame) {
  return (await database).put(storeName, game, currentGameKey)
}

export async function clearSavedGame() {
  return (await database).delete(storeName, currentGameKey)
}

export const gameRecoveryWindowMs = 30 * 60 * 1000