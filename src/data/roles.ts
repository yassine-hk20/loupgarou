import type { RoleId } from '../types/game'

export type RoleCategory =
  | 'village'
  | 'werewolf'
  | 'independent'
  | 'changing'
  | 'professions'
  | 'custom'

export interface RoleDefinition {
  id: RoleId
  key: string
  icon: string
  category: RoleCategory
  custom: boolean
  expansion: boolean
  playerSlots: number
  configuration?: 'sheepCount'
}

export const roles: RoleDefinition[] = [
  { id: 1, key: 'simpleVillager', icon: '🧑‍🌾', category: 'village', custom: false, expansion: false, playerSlots: 1 },
  { id: 2, key: 'seer', icon: '🔮', category: 'village', custom: false, expansion: false, playerSlots: 1 },
  { id: 3, key: 'witch', icon: '🧙', category: 'village', custom: false, expansion: false, playerSlots: 1 },
  { id: 4, key: 'hunter', icon: '🏹', category: 'village', custom: false, expansion: false, playerSlots: 1 },
  { id: 5, key: 'cupid', icon: '💘', category: 'village', custom: false, expansion: false, playerSlots: 1 },
  { id: 6, key: 'littleGirl', icon: '👁️', category: 'village', custom: false, expansion: false, playerSlots: 1 },
  { id: 7, key: 'protector', icon: '🛡️', category: 'village', custom: false, expansion: false, playerSlots: 1 },
  { id: 8, key: 'elder', icon: '🧓', category: 'village', custom: false, expansion: false, playerSlots: 1 },
  { id: 10, key: 'villageIdiot', icon: '🤡', category: 'village', custom: false, expansion: false, playerSlots: 1 },
  { id: 12, key: 'bearTamer', icon: '🐻', category: 'village', custom: false, expansion: false, playerSlots: 1 },
  { id: 14, key: 'raven', icon: '🐦‍⬛', category: 'village', custom: false, expansion: false, playerSlots: 1 },
  { id: 15, key: 'twoSisters', icon: '👭', category: 'village', custom: false, expansion: false, playerSlots: 2 },
  { id: 17, key: 'villageVillage', icon: '🏠', category: 'village', custom: false, expansion: false, playerSlots: 1 },
  { id: 18, key: 'stutteringJudge', icon: '⚖️', category: 'village', custom: false, expansion: false, playerSlots: 1 },
  { id: 19, key: 'devotedServant', icon: '🗝️', category: 'village', custom: false, expansion: false, playerSlots: 1 },
  { id: 30, key: 'colossus', icon: '🗿', category: 'village', custom: false, expansion: false, playerSlots: 1 },
  { id: 31, key: 'geniusMonkey', icon: '🐒', category: 'village', custom: false, expansion: false, playerSlots: 1 },
  { id: 20, key: 'regularWerewolf', icon: '🐺', category: 'werewolf', custom: false, expansion: false, playerSlots: 1 },
  { id: 22, key: 'infectiousFather', icon: '🐺', category: 'werewolf', custom: false, expansion: false, playerSlots: 1 },
  { id: 23, key: 'whiteWerewolf', icon: '🌕', category: 'independent', custom: false, expansion: false, playerSlots: 1 },
  { id: 25, key: 'angel', icon: '👼', category: 'independent', custom: false, expansion: false, playerSlots: 1 },
  { id: 50, key: 'ankou', icon: '🪦', category: 'independent', custom: false, expansion: false, playerSlots: 1 },
  { id: 26, key: 'wildChild', icon: '🐾', category: 'changing', custom: false, expansion: false, playerSlots: 1 },
  { id: 35, key: 'rebouteux', icon: '🩹', category: 'professions', custom: false, expansion: true, playerSlots: 1 },
  { id: 37, key: 'barber', icon: '✂️', category: 'professions', custom: false, expansion: true, playerSlots: 1 },
  { id: 'shepherd', key: 'shepherd', icon: '🐑', category: 'custom', custom: true, expansion: false, playerSlots: 1, configuration: 'sheepCount' },
  { id: 'alien', key: 'alien', icon: '👽', category: 'custom', custom: true, expansion: false, playerSlots: 1 },
  { id: 'maitre-ourse', key: 'maitreOurse', icon: '🐻‍❄️', category: 'custom', custom: true, expansion: false, playerSlots: 1 },
]

export const roleById = new Map(roles.map((role) => [String(role.id), role]))

export function roleSlots(roleIds: RoleId[]) {
  return roleIds.reduce<number>((total, id) => total + (roleById.get(String(id))?.playerSlots ?? 1), 0)
}