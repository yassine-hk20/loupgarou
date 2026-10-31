export type Language = 'en' | 'ar'

export type GameStage =
  | 'HOME'
  | 'GAME_SETUP'
  | 'ROLE_SELECTION'
  | 'HANDOVER'
  | 'PLAYER_IDENTIFICATION'
  | 'ROLE_REVEAL'
  | 'DISTRIBUTION_COMPLETE'
  | 'NARRATOR_CONFIRMATION'
  | 'NARRATOR_DASHBOARD'
  | 'GAME_STARTED'

export type GamePhase =
  | 'night-intro'
  | 'night-actions'
  | 'night-resolving'
  | 'morning'
  | 'day'
  | 'voting-pass'
  | 'voting-ballot'
  | 'vote-result'
  | 'servant-choice'
  | 'death-reaction'
  | 'game-over'

export type NightActionKey =
  | 'cupid'
  | 'wildChild'
  | 'wolves'
  | 'protector'
  | 'seer'
  | 'witch'
  | 'raven'
  | 'whiteWerewolf'
  | 'shepherd'
  | 'alien'
  | 'geniusMonkey'
  | 'maitreOurse'

export interface NightPrompt {
  key: NightActionKey
  actorIndex: number
}

export interface NightChoice {
  targetIndex?: number
  targetIndices?: number[]
  choice?: string
  guessedRoleId?: RoleId
}

export interface EliminationRecord {
  playerIndex: number
  cause: 'night' | 'vote' | 'ability' | 'hunter' | 'alien' | 'barber' | 'lover'
  round: number
}

export type NightLogKind =
  | 'loversChosen'
  | 'mentorChosen'
  | 'twoSistersRecognized'
  | 'littleGirlReminder'
  | 'seerSaw'
  | 'protected'
  | 'wolfAttack'
  | 'wolfInfection'
  | 'attackBlockedByProtector'
  | 'attackBlockedByWitch'
  | 'attackBlockedByShepherd'
  | 'elderSurvived'
  | 'witchKill'
  | 'witchPassed'
  | 'witchSaved'
  | 'ravenMarked'
  | 'whiteWolfKill'
  | 'whiteWolfStopped'
  | 'sheepProtected'
  | 'sheepAteWolf'
  | 'alienCorrect'
  | 'alienWrong'
  | 'monkeyInvestigated'
  | 'monkeyStopped'
  | 'bearGrowl'
  | 'bearQuiet'
  | 'eliminated'
  | 'noNightEvents'

export interface NightLogEntry {
  kind: NightLogKind
  playerIndices: number[]
  roleId?: RoleId
  cause?: EliminationRecord['cause']
}

export interface NightLog {
  round: number
  entries: NightLogEntry[]
}

export interface GameProgress {
  round: number
  phase: GamePhase
  alive: boolean[]
  convertedToWerewolf: number[]
  lovers: number[]
  mentorIndex: number | null
  nightOrder: NightPrompt[]
  nightActionIndex: number
  nightChoices: Record<string, NightChoice>
  nightLogs: NightLog[]
  pendingNightDeaths: number[]
  lastProtectedIndex: number | null
  elderSurvivedAttack: number[]
  usedAbilities: string[]
  lostVotes: number[]
  ravenTarget: number | null
  votes: (number | null)[]
  voteIndex: number
  voteNumber: number
  judgeUsed: number[]
  ankouVotesUsed: number[]
  firstVillageVoteResolved: boolean
  pendingReactions: { actorIndex: number; cause: 'hunter' | 'colossus' }[]
  afterReaction: GamePhase
  voteTarget: number | null
  villagePowersDisabled: boolean
  sheepRemaining: number
  dayVoteResolved: boolean
  bearSignal: boolean | null
  maitreSeatIndex: number | null
  servantDecision: 'take' | 'decline' | null
  servantTargetIndex: number | null
  pendingEliminationCause: 'vote' | 'ability' | 'hunter' | 'alien' | null
  eliminations: EliminationRecord[]
  winner: 'village' | 'werewolves' | 'angel' | 'whiteWerewolf' | null
}

export type RoleId = number | 'shepherd' | 'alien' | 'maitre-ourse'

export interface PlayerAssignment {
  name: string
  roleId: RoleId
}

export interface GameSettings {
  roleConfiguration: Record<string, number | string | boolean>
}

export interface SavedGame {
  id: string
  createdAt: number
  lastActivityAt: number
  stage: GameStage
  playerCount: number
  selectedRoleIds: RoleId[]
  assignments: PlayerAssignment[]
  distributionIndex: number
  settings: GameSettings
  progress?: GameProgress
}

export type GameAction =
  | { type: 'START_NEW' }
  | { type: 'SET_PLAYER_COUNT'; count: number }
  | { type: 'TO_ROLE_SELECTION' }
  | { type: 'TO_SETUP' }
  | { type: 'TOGGLE_ROLE'; roleId: RoleId }
  | { type: 'SET_ROLE_CONFIG'; key: string; value: number | string | boolean }
  | { type: 'BEGIN_DISTRIBUTION'; assignments: PlayerAssignment[] }
  | { type: 'OPEN_IDENTIFICATION' }
  | { type: 'IDENTIFY_PLAYER'; name: string }
  | { type: 'REVEAL_ROLE' }
  | { type: 'CONFIRM_ROLE' }
  | { type: 'DISTRIBUTION_DONE' }
  | { type: 'OPEN_NARRATOR' }
  | { type: 'CONFIRM_NARRATOR' }
  | { type: 'HIDE_ROLE' }
  | { type: 'START_GAME' }
  | { type: 'BEGIN_NIGHT' }
  | { type: 'SUBMIT_NIGHT_ACTION'; choice: NightChoice }
  | { type: 'RESOLVE_NIGHT' }
  | { type: 'BEGIN_DAY' }
  | { type: 'SECOND_VOTE' }
  | { type: 'DEATH_REACTION'; targetIndex: number }
  | { type: 'END_DAY' }
  | { type: 'NARRATOR_ELIMINATE'; targetIndex: number; cause: 'vote' | 'ability' | 'hunter' | 'alien' }
  | { type: 'NO_DAY_ELIMINATION' }
  | { type: 'BARBER_ELIMINATE'; targetIndex: number }
  | { type: 'REBOUTEUX_RESTORE'; targetIndex: number; abilityKey: string }
  | { type: 'SERVANT_TAKE_ROLE' }
  | { type: 'SERVANT_DECLINE' }
  | { type: 'RESTORE'; game: SavedGame }
  | { type: 'END_GAME' }

export interface GameTransition {
  game: SavedGame | null
  error?: string
}