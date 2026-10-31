import { roleById, roleSlots } from '../data/roles'
import type { EliminationRecord, GameAction, GamePhase, GameProgress, GameStage, GameTransition, NightLogKind, NightPrompt, PlayerAssignment, RoleId, SavedGame } from '../types/game'

const privateStages: GameStage[] = ['PLAYER_IDENTIFICATION', 'ROLE_REVEAL']
const narratorStages: GameStage[] = ['NARRATOR_CONFIRMATION', 'NARRATOR_DASHBOARD', 'GAME_STARTED']
const nightLogOrder: NightLogKind[] = [
  'loversChosen', 'twoSistersRecognized', 'mentorChosen', 'protected',
  'wolfAttack', 'wolfInfection', 'attackBlockedByProtector', 'attackBlockedByWitch', 'attackBlockedByShepherd', 'elderSurvived', 'littleGirlReminder',
  'seerSaw', 'witchSaved', 'witchKill', 'witchPassed', 'ravenMarked',
  'whiteWolfKill', 'whiteWolfStopped', 'sheepProtected', 'sheepAteWolf',
  'alienCorrect', 'alienWrong', 'monkeyInvestigated', 'monkeyStopped', 'bearGrowl', 'bearQuiet', 'eliminated', 'noNightEvents',
]

function reject(game: SavedGame | null, error: string): GameTransition {
  return { game, error }
}

function withActivity(game: SavedGame, values: Partial<SavedGame> = {}): GameTransition {
  return { game: { ...game, ...values, lastActivityAt: Date.now() } }
}

function shuffle<T>(values: T[]): T[] {
  const shuffled = [...values]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const upperBound = index + 1
    const limit = Math.floor(0x1_0000_0000 / upperBound) * upperBound
    const random = new Uint32Array(1)
    do {
      crypto.getRandomValues(random)
    } while (random[0] >= limit)
    const swapIndex = random[0] % upperBound
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  return shuffled
}

function roleAssignments(roleIds: RoleId[]): PlayerAssignment[] {
  const roleCards = roleIds.flatMap((id) => {
    const slots = roleById.get(String(id))?.playerSlots ?? 1
    return Array.from({ length: slots }, () => ({ name: '', roleId: id }))
  })
  return shuffle(roleCards)
}

export function transitionGame(game: SavedGame | null, action: GameAction): GameTransition {
  if (action.type === 'START_NEW') {
    const now = Date.now()
    return {
      game: {
        id: crypto.randomUUID(),
        createdAt: now,
        lastActivityAt: now,
        stage: 'GAME_SETUP',
        playerCount: 8,
        selectedRoleIds: [],
        assignments: [],
        distributionIndex: 0,
        settings: { roleConfiguration: {} },
      },
    }
  }

  if (action.type === 'RESTORE') {
    const restored = { ...action.game }
    if (privateStages.includes(restored.stage)) {
      restored.stage = 'HANDOVER'
      if (restored.assignments[restored.distributionIndex]) {
        restored.assignments[restored.distributionIndex] = {
          ...restored.assignments[restored.distributionIndex],
          name: '',
        }
      }
    } else if (narratorStages.includes(restored.stage)) {
      restored.stage = 'NARRATOR_CONFIRMATION'
    }
    if (restored.progress) {
      restored.progress = {
        ...restored.progress,
        nightLogs: restored.progress.nightLogs ?? [],
        pendingEliminationCause: restored.progress.pendingEliminationCause ?? null,
        ...( ['voting-pass', 'voting-ballot', 'vote-result'].includes(restored.progress.phase) ? {
          phase: 'day',
          votes: new Array(restored.playerCount).fill(null),
          voteIndex: -1,
          voteTarget: null,
          dayVoteResolved: false,
        } : {}),
      }
    }
    return { game: restored }
  }

  if (action.type === 'END_GAME') return { game: null }
  if (!game) return reject(game, 'noActiveGame')

  switch (action.type) {
    case 'SET_PLAYER_COUNT':
      if (game.stage !== 'GAME_SETUP') return reject(game, 'invalidTransition')
      if (!Number.isInteger(action.count) || action.count < 3 || action.count > 30) return reject(game, 'playerCountRange')
      return withActivity(game, { playerCount: action.count })
    case 'TO_ROLE_SELECTION':
      if (game.stage !== 'GAME_SETUP') return reject(game, 'invalidTransition')
      return withActivity(game, { stage: 'ROLE_SELECTION' })
    case 'TO_SETUP':
      if (game.stage !== 'ROLE_SELECTION') return reject(game, 'invalidTransition')
      return withActivity(game, { stage: 'GAME_SETUP' })
    case 'TOGGLE_ROLE': {
      if (game.stage !== 'ROLE_SELECTION') return reject(game, 'invalidTransition')
      if (!roleById.has(String(action.roleId))) return reject(game, 'unknownRole')
      const selected = game.selectedRoleIds.some((id) => id === action.roleId)
        ? game.selectedRoleIds.filter((id) => id !== action.roleId)
        : [...game.selectedRoleIds, action.roleId]
      if (roleSlots(selected) > game.playerCount) return reject(game, 'roleSlotsExceeded')
      return withActivity(game, { selectedRoleIds: selected })
    }
    case 'SET_ROLE_CONFIG':
      if (game.stage !== 'ROLE_SELECTION') return reject(game, 'invalidTransition')
      return withActivity(game, {
        settings: {
          ...game.settings,
          roleConfiguration: { ...game.settings.roleConfiguration, [action.key]: action.value },
        },
      })
    case 'BEGIN_DISTRIBUTION':
      if (game.stage !== 'ROLE_SELECTION') return reject(game, 'invalidTransition')
      if (roleSlots(game.selectedRoleIds) !== game.playerCount) return reject(game, 'roleCountMismatch')
      if (action.assignments.length !== game.playerCount) return reject(game, 'roleCountMismatch')
      return withActivity(game, { assignments: action.assignments, distributionIndex: 0, stage: 'HANDOVER' })
    case 'OPEN_IDENTIFICATION':
      if (game.stage !== 'HANDOVER') return reject(game, 'invalidTransition')
      if (game.distributionIndex >= game.assignments.length) return reject(game, 'distributionComplete')
      return withActivity(game, { stage: 'PLAYER_IDENTIFICATION' })
    case 'IDENTIFY_PLAYER': {
      if (game.stage !== 'PLAYER_IDENTIFICATION') return reject(game, 'invalidTransition')
      const name = action.name.trim().slice(0, 40)
      if (!name) return reject(game, 'nameRequired')
      const assignments = [...game.assignments]
      assignments[game.distributionIndex] = { ...assignments[game.distributionIndex], name }
      return withActivity(game, { assignments })
    }
    case 'REVEAL_ROLE':
      if (game.stage !== 'PLAYER_IDENTIFICATION') return reject(game, 'invalidTransition')
      if (!game.assignments[game.distributionIndex]?.name.trim()) return reject(game, 'nameRequired')
      return withActivity(game, { stage: 'ROLE_REVEAL' })
    case 'HIDE_ROLE':
      if (game.stage !== 'ROLE_REVEAL' && game.stage !== 'PLAYER_IDENTIFICATION') return reject(game, 'invalidTransition')
      return withActivity(game, {
        stage: 'HANDOVER',
        assignments: game.assignments.map((assignment, index) =>
          index === game.distributionIndex ? { ...assignment, name: '' } : assignment,
        ),
      })
    case 'CONFIRM_ROLE': {
      if (game.stage !== 'ROLE_REVEAL') return reject(game, 'invalidTransition')
      const nextIndex = game.distributionIndex + 1
      return withActivity(game, {
        distributionIndex: nextIndex,
        stage: nextIndex >= game.assignments.length ? 'DISTRIBUTION_COMPLETE' : 'HANDOVER',
      })
    }
    case 'DISTRIBUTION_DONE':
      if (game.stage !== 'DISTRIBUTION_COMPLETE') return reject(game, 'invalidTransition')
      return withActivity(game, { stage: 'NARRATOR_CONFIRMATION' })
    case 'OPEN_NARRATOR':
      if (game.stage !== 'DISTRIBUTION_COMPLETE' && game.stage !== 'NARRATOR_CONFIRMATION') return reject(game, 'invalidTransition')
      return withActivity(game, { stage: 'NARRATOR_CONFIRMATION' })
    case 'CONFIRM_NARRATOR':
      if (game.stage !== 'NARRATOR_CONFIRMATION') return reject(game, 'invalidTransition')
      return withActivity(game, { stage: game.progress ? 'GAME_STARTED' : 'NARRATOR_DASHBOARD' })
    case 'START_GAME': {
      if (game.stage !== 'NARRATOR_DASHBOARD') return reject(game, 'invalidTransition')
      return withActivity(game, {
        stage: 'GAME_STARTED',
        progress: {
          round: 1,
          phase: 'night-intro',
          alive: game.assignments.map(() => true),
          convertedToWerewolf: [],
          lovers: [],
          mentorIndex: null,
          nightOrder: [],
          nightActionIndex: 0,
          nightChoices: {},
          nightLogs: [],
          pendingNightDeaths: [],
          lastProtectedIndex: null,
          elderSurvivedAttack: [],
          usedAbilities: [],
          lostVotes: [],
          ravenTarget: null,
          votes: new Array(game.playerCount).fill(null),
          voteIndex: -1,
          voteNumber: 0,
          judgeUsed: [],
          ankouVotesUsed: [],
          firstVillageVoteResolved: false,
          pendingReactions: [],
          afterReaction: 'day',
          voteTarget: null,
          villagePowersDisabled: false,
          sheepRemaining: Number(game.settings.roleConfiguration.sheepCount ?? 3),
          dayVoteResolved: false,
          bearSignal: null,
          maitreSeatIndex: null,
          servantDecision: null,
          servantTargetIndex: null,
          pendingEliminationCause: null,
          eliminations: [],
          winner: null,
        },
      })
    }
    case 'BEGIN_NIGHT': {
      const progress = game.progress
      if (game.stage !== 'GAME_STARTED' || !progress || !['night-intro', 'day'].includes(progress.phase)) return reject(game, 'invalidTransition')
      const round = progress.phase === 'day' ? progress.round + 1 : progress.round
      const updated = { ...progress, round, phase: 'night-actions' as GamePhase, nightActionIndex: 0, nightChoices: {}, pendingNightDeaths: [], dayVoteResolved: false, ravenTarget: null }
      updated.nightOrder = makeNightOrder(game, updated)
      if (updated.nightOrder.length === 0) updated.phase = 'night-resolving'
      return withActivity(game, { progress: updated })
    }
    case 'SUBMIT_NIGHT_ACTION': {
      const progress = game.progress
      if (game.stage !== 'GAME_STARTED' || progress?.phase !== 'night-actions') return reject(game, 'invalidTransition')
      const prompt = progress.nightOrder[progress.nightActionIndex]
      if (!prompt) return reject(game, 'noNightAction')
      const choice = action.choice
      if (prompt.key === 'geniusMonkey') {
        const key = String(progress.nightActionIndex)
        const previousTargets = progress.nightChoices[key]?.targetIndices ?? []
        if (choice.choice === 'stop') {
          if (choice.targetIndex !== undefined || choice.targetIndices?.length) return reject(game, 'invalidTarget')
          const nightChoices = { ...progress.nightChoices, [key]: { targetIndices: previousTargets, choice: 'stop' } }
          const usedAbilities = previousTargets.length ? [...new Set([...progress.usedAbilities, `${prompt.actorIndex}:investigate`])] : progress.usedAbilities
          const nightActionIndex = progress.nightActionIndex + 1
          return withActivity(game, { progress: { ...progress, nightChoices, usedAbilities, nightActionIndex, phase: nightActionIndex >= progress.nightOrder.length ? 'night-resolving' : 'night-actions' } })
        }
        const target = choice.targetIndex
        if (target === undefined || !Number.isInteger(target) || !progress.alive[target] || target === prompt.actorIndex || previousTargets.includes(target)) return reject(game, 'invalidTarget')
        const targetIndices = [...previousTargets, target]
        const foundWerewolf = isWerewolf(game, target, progress)
        const nightChoices = { ...progress.nightChoices, [key]: { targetIndices } }
        if (!foundWerewolf) return withActivity(game, { progress: { ...progress, nightChoices } })
        const nightActionIndex = progress.nightActionIndex + 1
        const usedAbilities = [...new Set([...progress.usedAbilities, `${prompt.actorIndex}:investigate`])]
        return withActivity(game, { progress: { ...progress, nightChoices, usedAbilities, nightActionIndex, phase: nightActionIndex >= progress.nightOrder.length ? 'night-resolving' : 'night-actions' } })
      }
      const targets = choice.targetIndices ?? (choice.targetIndex === undefined ? [] : [choice.targetIndex])
      if (prompt.key !== 'wolves' && !progress.alive[prompt.actorIndex]) return reject(game, 'invalidTransition')
      if (targets.some((index) => !Number.isInteger(index) || !progress.alive[index])) return reject(game, 'invalidTarget')
      if (prompt.key === 'cupid' && (targets.length !== 2 || targets[0] === targets[1])) return reject(game, 'twoTargetsRequired')
      if (prompt.key !== 'cupid' && prompt.key !== 'shepherd' && targets.length > 1) return reject(game, 'invalidTarget')
      if (prompt.key === 'shepherd') {
        if (targets.length > progress.sheepRemaining || new Set(targets).size !== targets.length) return reject(game, 'invalidTarget')
      }
      if (prompt.key === 'wolves' && targets.length !== 1) return reject(game, 'targetRequired')
      if (['protector', 'seer', 'raven', 'alien', 'maitreOurse'].includes(prompt.key) && targets.length !== 1) return reject(game, 'targetRequired')
      if (prompt.key === 'whiteWerewolf' && choice.choice !== 'stop' && targets.length !== 1) return reject(game, 'targetRequired')
      if (prompt.key === 'whiteWerewolf' && choice.choice === 'stop' && targets.length > 0) return reject(game, 'invalidTarget')
      if (prompt.key === 'witch' && choice.choice === 'kill' && targets.length !== 1) return reject(game, 'targetRequired')
      if (prompt.key === 'witch' && choice.choice !== 'kill' && targets.length > 0) return reject(game, 'invalidTarget')
      if (prompt.key === 'witch' && choice.choice === 'kill' && targets[0] === prompt.actorIndex) return reject(game, 'invalidTarget')
      if (prompt.key === 'seer' && targets[0] === prompt.actorIndex) return reject(game, 'invalidTarget')
      if (prompt.key === 'protector' && targets[0] === progress.lastProtectedIndex) return reject(game, 'sameProtectorTarget')
      const key = String(progress.nightActionIndex)
      const nightChoices = { ...progress.nightChoices, [key]: choice }
      const nightActionIndex = progress.nightActionIndex + 1
      const phase = nightActionIndex >= progress.nightOrder.length ? 'night-resolving' : 'night-actions'
      return withActivity(game, { progress: { ...progress, nightChoices, nightActionIndex, phase } })
    }
    case 'RESOLVE_NIGHT': {
      const current = game.progress
      if (game.stage !== 'GAME_STARTED' || current?.phase !== 'night-resolving') return reject(game, 'invalidTransition')
      let progress: GameProgress = { ...current, lastProtectedIndex: current.lastProtectedIndex }
      const actionFor = (key: string) => {
        const index = progress.nightOrder.findIndex((prompt) => prompt.key === key)
        return index < 0 ? undefined : progress.nightChoices[String(index)]
      }
      const wolfChoice = actionFor('wolves')
      const wolfVictim = wolfChoice?.targetIndex
      const fatherIndex = game.assignments.findIndex((assignment, index) => roleById.get(String(assignment.roleId))?.key === 'infectiousFather' && progress.alive[index])
      let deaths: number[] = []
      const logEntries: GameProgress['nightLogs'][number]['entries'] = []
      let convertedToWerewolf = [...progress.convertedToWerewolf]
      const usedAbilities = [...progress.usedAbilities]

      if (progress.round === 1) {
        const cupidChoice = actionFor('cupid')
        if (cupidChoice?.targetIndices?.length === 2) {
          progress = { ...progress, lovers: cupidChoice.targetIndices }
          logEntries.push({ kind: 'loversChosen', playerIndices: cupidChoice.targetIndices })
        }
        const childChoice = actionFor('wildChild')
        if (childChoice?.targetIndex !== undefined) {
          progress = { ...progress, mentorIndex: childChoice.targetIndex }
          logEntries.push({ kind: 'mentorChosen', playerIndices: [childChoice.targetIndex] })
        }
        const sisters = game.assignments.flatMap((assignment, index) => roleById.get(String(assignment.roleId))?.key === 'twoSisters' ? [index] : [])
        if (sisters.length === 2) logEntries.push({ kind: 'twoSistersRecognized', playerIndices: sisters })
      }
      const protectorChoice = actionFor('protector')
      if (protectorChoice?.targetIndex !== undefined) {
        progress = { ...progress, lastProtectedIndex: protectorChoice.targetIndex }
        logEntries.push({ kind: 'protected', playerIndices: [protectorChoice.targetIndex] })
      }
      const ravenChoice = actionFor('raven')
      if (ravenChoice?.targetIndex !== undefined) {
        progress = { ...progress, ravenTarget: ravenChoice.targetIndex }
        logEntries.push({ kind: 'ravenMarked', playerIndices: [ravenChoice.targetIndex] })
      }
      const seerChoice = actionFor('seer')
      const seerIndex = progress.nightOrder.find((prompt) => prompt.key === 'seer')?.actorIndex
      if (seerChoice?.targetIndex !== undefined && seerIndex !== undefined) {
        logEntries.push({ kind: 'seerSaw', playerIndices: [seerIndex, seerChoice.targetIndex], roleId: game.assignments[seerChoice.targetIndex]?.roleId })
      }
      const maitreChoice = actionFor('maitreOurse')
      if (maitreChoice?.targetIndex !== undefined) progress = { ...progress, maitreSeatIndex: maitreChoice.targetIndex }

      const wolfInfection = wolfChoice?.choice === 'infect'
        && fatherIndex >= 0
        && !used(progress, fatherIndex, 'infect')
        && wolfVictim !== undefined
      if (wolfVictim !== undefined) logEntries.push({ kind: 'wolfAttack', playerIndices: [wolfVictim] })
      if (wolfVictim !== undefined && wolfInfection) {
        convertedToWerewolf = [...new Set([...convertedToWerewolf, wolfVictim])]
        usedAbilities.push(`${fatherIndex}:infect`)
        logEntries.push({ kind: 'wolfInfection', playerIndices: [fatherIndex, wolfVictim] })
      } else if (wolfVictim !== undefined) {
        const shepherdTargets = actionFor('shepherd')?.targetIndices ?? []
        const sheepConsumedOnWolf = shepherdTargets.includes(wolfVictim) && isWerewolf(game, wolfVictim, progress)
        const protectedByShepherd = shepherdTargets.includes(wolfVictim) && !isWerewolf(game, wolfVictim, progress)
        const protectedByProtector = protectorChoice?.targetIndex === wolfVictim
        const witchChoice = actionFor('witch')
        const witchActorIndex = progress.nightOrder.find((prompt) => prompt.key === 'witch')?.actorIndex
        const savedByWitch = witchChoice?.choice === 'save' && witchActorIndex !== undefined && !used(progress, witchActorIndex, 'save')
        const elder = roleKey(game, wolfVictim) === 'elder' && !progress.elderSurvivedAttack.includes(wolfVictim)
        if (sheepConsumedOnWolf) {
          deaths.push(wolfVictim)
        } else if (!protectedByShepherd && !protectedByProtector && !savedByWitch && !elder) {
          deaths.push(wolfVictim)
        } else if (protectedByProtector) {
          logEntries.push({ kind: 'attackBlockedByProtector', playerIndices: [wolfVictim] })
        } else if (savedByWitch) {
          logEntries.push({ kind: 'attackBlockedByWitch', playerIndices: [wolfVictim] })
        } else if (protectedByShepherd) {
          logEntries.push({ kind: 'attackBlockedByShepherd', playerIndices: [wolfVictim] })
        } else if (elder) {
          progress = { ...progress, elderSurvivedAttack: [...progress.elderSurvivedAttack, wolfVictim] }
          logEntries.push({ kind: 'elderSurvived', playerIndices: [wolfVictim] })
        }
        if (savedByWitch && witchActorIndex !== undefined) {
          usedAbilities.push(`${witchActorIndex}:save`)
          logEntries.push({ kind: 'witchSaved', playerIndices: [witchActorIndex, wolfVictim] })
        }
        if (protectedByShepherd && !protectedByProtector && !savedByWitch && !elder) {
          // A sheep protects its chosen Villager from this attack.
        }
      }

      const witchIndex = progress.nightOrder.find((prompt) => prompt.key === 'witch')?.actorIndex
      const witchChoice = actionFor('witch')
      if (witchChoice?.choice === 'kill' && witchChoice.targetIndex !== undefined && witchIndex !== undefined && !used(progress, witchIndex, 'kill')) {
        deaths.push(witchChoice.targetIndex)
        usedAbilities.push(`${witchIndex}:kill`)
        logEntries.push({ kind: 'witchKill', playerIndices: [witchIndex, witchChoice.targetIndex] })
      }
      if (witchChoice?.choice === 'none' && witchIndex !== undefined) logEntries.push({ kind: 'witchPassed', playerIndices: [witchIndex] })
      const whiteChoice = actionFor('whiteWerewolf')
      if (whiteChoice?.targetIndex !== undefined) {
        deaths.push(whiteChoice.targetIndex)
        const whiteWolfIndex = progress.nightOrder.find((prompt) => prompt.key === 'whiteWerewolf')?.actorIndex
        logEntries.push({ kind: 'whiteWolfKill', playerIndices: whiteWolfIndex === undefined ? [whiteChoice.targetIndex] : [whiteWolfIndex, whiteChoice.targetIndex] })
      }
      if (whiteChoice?.choice === 'stop') {
        const whiteWolfIndex = progress.nightOrder.find((prompt) => prompt.key === 'whiteWerewolf')?.actorIndex
        if (whiteWolfIndex !== undefined) logEntries.push({ kind: 'whiteWolfStopped', playerIndices: [whiteWolfIndex] })
      }
      const shepherdChoice = actionFor('shepherd')
      const sheepConsumed = (shepherdChoice?.targetIndices ?? []).filter((target) => isWerewolf(game, target, progress))
      deaths.push(...sheepConsumed)
      if (sheepConsumed.length) progress = { ...progress, sheepRemaining: Math.max(0, progress.sheepRemaining - sheepConsumed.length) }
      for (const target of shepherdChoice?.targetIndices ?? []) {
        if (!isWerewolf(game, target, progress)) logEntries.push({ kind: 'sheepProtected', playerIndices: [target] })
      }
      for (const target of sheepConsumed) logEntries.push({ kind: 'sheepAteWolf', playerIndices: [target] })
      const alienChoice = actionFor('alien')
      if (alienChoice?.targetIndex !== undefined) {
        const alienIndex = progress.nightOrder.find((prompt) => prompt.key === 'alien')?.actorIndex
        const correct = String(game.assignments[alienChoice.targetIndex]?.roleId) === String(alienChoice.guessedRoleId)
        if (correct) deaths.push(alienChoice.targetIndex)
        else if (alienIndex !== undefined) deaths.push(alienIndex)
        logEntries.push({ kind: correct ? 'alienCorrect' : 'alienWrong', playerIndices: alienIndex === undefined ? [alienChoice.targetIndex] : [alienIndex, alienChoice.targetIndex], roleId: game.assignments[alienChoice.targetIndex]?.roleId })
      }
      const monkeyChoice = actionFor('geniusMonkey')
      const monkeyIndex = progress.nightOrder.find((prompt) => prompt.key === 'geniusMonkey')?.actorIndex
      if (monkeyIndex !== undefined) {
        const investigatedTargets = monkeyChoice?.targetIndices ?? (monkeyChoice?.targetIndex === undefined ? [] : [monkeyChoice.targetIndex])
        if (investigatedTargets.length > 0 && !used(progress, monkeyIndex, 'investigate')) usedAbilities.push(`${monkeyIndex}:investigate`)
        for (const target of investigatedTargets) {
          logEntries.push({ kind: 'monkeyInvestigated', playerIndices: [monkeyIndex, target], roleId: game.assignments[target]?.roleId })
          if (isWerewolf(game, target, progress)) {
            deaths.push(monkeyIndex)
            break
          }
        }
        if (monkeyChoice?.choice === 'stop') logEntries.push({ kind: 'monkeyStopped', playerIndices: [monkeyIndex] })
      }
      const littleGirlIndex = game.assignments.findIndex((assignment, index) => roleById.get(String(assignment.roleId))?.key === 'littleGirl' && progress.alive[index])
      if (littleGirlIndex >= 0 && wolfVictim !== undefined) logEntries.push({ kind: 'littleGirlReminder', playerIndices: [littleGirlIndex] })
      const bearIndex = game.assignments.findIndex((assignment, index) => roleById.get(String(assignment.roleId))?.key === 'bearTamer' && progress.alive[index])
      const maitreIndex = game.assignments.findIndex((assignment, index) => roleById.get(String(assignment.roleId))?.key === 'maitreOurse' && progress.alive[index])
      const bearSeat = maitreIndex >= 0 ? maitreChoice?.targetIndex : bearIndex
      let bearSignal: boolean | null = null
      if (bearSeat !== undefined && bearSeat >= 0) {
        const leftSeat = (bearSeat + game.playerCount - 1) % game.playerCount
        const rightSeat = (bearSeat + 1) % game.playerCount
        bearSignal = [leftSeat, rightSeat].some((index) => progress.alive[index] && isWerewolf(game, index, progress))
        logEntries.push({ kind: bearSignal ? 'bearGrowl' : 'bearQuiet', playerIndices: [bearSeat] })
      }
      const uniqueDeaths = [...new Set(deaths)]
      const colossusIndex = wolfVictim !== undefined && uniqueDeaths.includes(wolfVictim) && roleKey(game, wolfVictim) === 'colossus' ? wolfVictim : undefined
      const applied = startDeathResolution(game, { ...progress, convertedToWerewolf, usedAbilities, ravenTarget: progress.ravenTarget, bearSignal }, uniqueDeaths, 'night', 'morning', colossusIndex)
      const newDeaths = applied.progress.eliminations.filter((entry) =>
        entry.round === progress.round && !progress.eliminations.some((previous) => previous.round === entry.round && previous.playerIndex === entry.playerIndex),
      )
      for (const death of newDeaths) {
        logEntries.push({ kind: 'eliminated', playerIndices: [death.playerIndex], roleId: game.assignments[death.playerIndex]?.roleId, cause: death.cause })
      }
      if (logEntries.length === 0) logEntries.push({ kind: 'noNightEvents', playerIndices: [] })
      logEntries.sort((first, second) => nightLogOrder.indexOf(first.kind) - nightLogOrder.indexOf(second.kind))
      const nightLogs = [...applied.progress.nightLogs.filter((log) => log.round !== progress.round), { round: progress.round, entries: logEntries }]
      applied.progress.nightLogs = nightLogs
      let nextProgress = applied.progress
      if (nextProgress.phase !== 'death-reaction' && nextProgress.phase !== 'game-over' && nextProgress.mentorIndex !== null && !nextProgress.alive[nextProgress.mentorIndex]) {
        const childIndex = game.assignments.findIndex((assignment, index) => roleById.get(String(assignment.roleId))?.key === 'wildChild' && nextProgress.alive[index])
        if (childIndex >= 0) nextProgress = { ...nextProgress, convertedToWerewolf: [...new Set([...nextProgress.convertedToWerewolf, childIndex])] }
      }
      return withActivity(game, { progress: nextProgress })
    }
    case 'BEGIN_DAY': {
      const progress = game.progress
      if (game.stage !== 'GAME_STARTED' || progress?.phase !== 'morning') return reject(game, 'invalidTransition')
      const next = checkWinner(game, { ...progress, phase: 'day' })
      return withActivity(game, { progress: next })
    }
    case 'NARRATOR_ELIMINATE': {
      const progress = game.progress
      const target = action.targetIndex
      if (game.stage !== 'GAME_STARTED' || progress?.phase !== 'day' || progress.dayVoteResolved || !progress.alive[target]) return reject(game, 'invalidTransition')
      if (action.cause === 'vote' && roleKey(game, target) === 'angel' && !progress.firstVillageVoteResolved) {
        return withActivity(game, { progress: { ...progress, firstVillageVoteResolved: true, dayVoteResolved: true, winner: 'angel', phase: 'game-over' } })
      }
      if (action.cause === 'vote' && roleKey(game, target) === 'villageIdiot') {
        return withActivity(game, { progress: { ...progress, lostVotes: [...new Set([...progress.lostVotes, target])], firstVillageVoteResolved: true, dayVoteResolved: true, voteTarget: target } })
      }
      const servantIndex = action.cause === 'vote'
        ? game.assignments.findIndex((assignment, index) => roleById.get(String(assignment.roleId))?.key === 'devotedServant' && progress.alive[index] && !used(progress, index, 'servant'))
        : -1
      if (servantIndex >= 0) {
        return withActivity(game, { progress: { ...progress, phase: 'servant-choice', servantTargetIndex: target, pendingEliminationCause: action.cause } })
      }
      const villagePowersDisabled = progress.villagePowersDisabled || (action.cause === 'vote' && roleKey(game, target) === 'elder')
      const applied = startDeathResolution(game, {
        ...progress,
        villagePowersDisabled,
        firstVillageVoteResolved: progress.firstVillageVoteResolved || action.cause === 'vote',
        dayVoteResolved: true,
        voteTarget: target,
      }, [target], action.cause, 'day')
      return withActivity(game, { progress: applied.progress })
    }
    case 'NO_DAY_ELIMINATION': {
      if (game.stage !== 'GAME_STARTED' || game.progress?.phase !== 'day' || game.progress.dayVoteResolved) return reject(game, 'invalidTransition')
      return withActivity(game, { progress: { ...game.progress, dayVoteResolved: true } })
    }
    case 'SECOND_VOTE': {
      const progress = game.progress
      if (game.stage !== 'GAME_STARTED' || progress?.phase !== 'day' || !progress.dayVoteResolved) return reject(game, 'invalidTransition')
      const judgeIndex = game.assignments.findIndex((assignment, index) => roleById.get(String(assignment.roleId))?.key === 'stutteringJudge' && progress.alive[index] && !progress.judgeUsed.includes(index))
      if (judgeIndex < 0) return reject(game, 'judgeUnavailable')
      return withActivity(game, { progress: { ...progress, dayVoteResolved: false, judgeUsed: [...progress.judgeUsed, judgeIndex], usedAbilities: [...progress.usedAbilities, `${judgeIndex}:judge`] } })
    }
    case 'DEATH_REACTION': {
      const progress = game.progress
      const reaction = progress?.pendingReactions[0]
      if (game.stage !== 'GAME_STARTED' || progress?.phase !== 'death-reaction' || !reaction) return reject(game, 'invalidTransition')
      if (!Number.isInteger(action.targetIndex) || !progress.alive[action.targetIndex] || action.targetIndex === reaction.actorIndex) return reject(game, 'invalidTarget')
      if (reaction.cause === 'colossus' && !isWerewolf(game, action.targetIndex, progress)) return reject(game, 'invalidTarget')
      let nextProgress = { ...progress, pendingReactions: progress.pendingReactions.slice(1), phase: progress.pendingReactions.length > 1 ? 'death-reaction' as GamePhase : progress.afterReaction }
      const applied = startDeathResolution(game, nextProgress, [action.targetIndex], reaction.cause === 'hunter' ? 'hunter' : 'ability', progress.afterReaction)
      nextProgress = applied.progress
      if (nextProgress.pendingReactions.length === 0 && nextProgress.phase !== 'game-over') {
        nextProgress = checkWinner(game, { ...nextProgress, phase: progress.afterReaction })
      }
      return withActivity(game, { progress: nextProgress })
    }
    case 'END_DAY': {
      if (game.stage !== 'GAME_STARTED' || game.progress?.phase !== 'day') return reject(game, 'invalidTransition')
      return withActivity(game, { progress: { ...game.progress, phase: 'night-intro' } })
    }
    case 'BARBER_ELIMINATE': {
      const progress = game.progress
      const barberIndex = game.assignments.findIndex((assignment, index) => roleById.get(String(assignment.roleId))?.key === 'barber' && progress?.alive[index] && !used(progress, index, 'barber'))
      if (game.stage !== 'GAME_STARTED' || progress?.phase !== 'day' || barberIndex < 0 || !progress.alive[action.targetIndex] || action.targetIndex === barberIndex) return reject(game, 'invalidTransition')
      const isTargetWolf = isWerewolf(game, action.targetIndex, progress)
      const deaths = isTargetWolf ? [action.targetIndex] : [action.targetIndex, barberIndex]
      const applied = startDeathResolution(game, { ...progress, usedAbilities: [...progress.usedAbilities, `${barberIndex}:barber`] }, deaths, 'ability', 'day')
      return withActivity(game, { progress: applied.progress })
    }
    case 'REBOUTEUX_RESTORE': {
      const progress = game.progress
      const rebouteuxIndex = game.assignments.findIndex((assignment, index) => roleById.get(String(assignment.roleId))?.key === 'rebouteux' && progress?.alive[index] && !used(progress, index, 'rebouteux'))
      const token = `${action.targetIndex}:${action.abilityKey}`
      if (game.stage !== 'GAME_STARTED' || progress?.phase !== 'day' || rebouteuxIndex < 0 || !progress.alive[action.targetIndex] || action.targetIndex === rebouteuxIndex || !progress.usedAbilities.includes(token)) return reject(game, 'invalidAbilityRestore')
      const usedAbilities = progress.usedAbilities.filter((value) => value !== token)
      const judgeUsed = action.abilityKey === 'judge' ? progress.judgeUsed.filter((index) => index !== action.targetIndex) : progress.judgeUsed
      return withActivity(game, { progress: { ...progress, usedAbilities: [...usedAbilities, `${rebouteuxIndex}:rebouteux`], judgeUsed } })
    }
    case 'SERVANT_TAKE_ROLE':
    case 'SERVANT_DECLINE': {
      const progress = game.progress
      const target = progress?.servantTargetIndex
      if (game.stage !== 'GAME_STARTED' || progress?.phase !== 'servant-choice' || target === null || target === undefined) return reject(game, 'invalidTransition')
      const assignments = [...game.assignments]
      const servantIndex = assignments.findIndex((assignment, index) => roleById.get(String(assignment.roleId))?.key === 'devotedServant' && progress.alive[index] && !used(progress, index, 'servant'))
      const takingRole = action.type === 'SERVANT_TAKE_ROLE'
      if (takingRole && servantIndex >= 0) assignments[servantIndex] = { ...assignments[servantIndex], roleId: assignments[target].roleId }
      const eliminationCause = progress.pendingEliminationCause ?? 'vote'
      const villagePowersDisabled = progress.villagePowersDisabled || (eliminationCause === 'vote' && roleKey(game, target) === 'elder')
      const applied = startDeathResolution(game, {
        ...progress,
        villagePowersDisabled,
        servantDecision: takingRole ? 'take' : 'decline',
        usedAbilities: servantIndex >= 0 ? [...progress.usedAbilities, `${servantIndex}:servant`] : progress.usedAbilities,
        servantTargetIndex: null,
        pendingEliminationCause: null,
        firstVillageVoteResolved: true,
        dayVoteResolved: true,
      }, [target], eliminationCause, 'day')
      return withActivity(game, { assignments, progress: applied.progress })
    }
  }
}

export function assignmentsForRoles(roleIds: RoleId[]) {
  return roleAssignments(roleIds)
}

export function safeStageForStorage(game: SavedGame): SavedGame {
  if (game.stage === 'GAME_STARTED' && game.progress) {
    const progress = {
      ...game.progress,
      nightLogs: game.progress.nightLogs ?? [],
      pendingEliminationCause: game.progress.pendingEliminationCause ?? null,
    }
    if (['voting-pass', 'voting-ballot', 'vote-result'].includes(progress.phase)) {
      return { ...game, progress: { ...progress, phase: 'day', votes: new Array(game.playerCount).fill(null), voteIndex: -1, voteTarget: null, dayVoteResolved: false } }
    }
    return { ...game, progress }
  }
  if (!privateStages.includes(game.stage)) return game
  const assignments = game.assignments.map((assignment, index) =>
    index === game.distributionIndex ? { ...assignment, name: '' } : assignment,
  )
  return { ...game, stage: 'HANDOVER', assignments }
}

function roleKey(game: SavedGame, index: number) {
  return roleById.get(String(game.assignments[index]?.roleId))?.key
}

function isWerewolf(game: SavedGame, index: number, progress = game.progress) {
  return roleKey(game, index) === 'regularWerewolf'
    || roleKey(game, index) === 'infectiousFather'
    || Boolean(progress?.convertedToWerewolf.includes(index))
}

function isEligibleForNight(game: SavedGame, index: number) {
  return Boolean(game.progress?.alive[index])
}

function used(progress: GameProgress, playerIndex: number, ability: string) {
  return progress.usedAbilities.includes(`${playerIndex}:${ability}`)
}

function makeNightOrder(game: SavedGame, progress: GameProgress): NightPrompt[] {
  const order: NightPrompt[] = []
  const firstAlive = (key: string) => game.assignments.findIndex((assignment, index) =>
    roleById.get(String(assignment.roleId))?.key === key && isEligibleForNight(game, index),
  )
  const addOne = (key: NightPrompt['key'], roleName: string) => {
    const actorIndex = firstAlive(roleName)
    if (actorIndex >= 0) order.push({ key, actorIndex })
  }

  if (progress.round === 1) {
    addOne('cupid', 'cupid')
    addOne('wildChild', 'wildChild')
  }
  if (!progress.villagePowersDisabled) addOne('protector', 'protector')
  if (game.assignments.some((_, index) => isEligibleForNight(game, index) && isWerewolf(game, index))) {
    order.push({ key: 'wolves', actorIndex: game.assignments.findIndex((_, index) => isEligibleForNight(game, index) && isWerewolf(game, index)) })
  }
  if (!progress.villagePowersDisabled) {
    addOne('seer', 'seer')
    const witchIndex = firstAlive('witch')
    if (witchIndex >= 0 && (!used(progress, witchIndex, 'save') || !used(progress, witchIndex, 'kill'))) {
      order.push({ key: 'witch', actorIndex: witchIndex })
    }
    addOne('raven', 'raven')
  }
  if (progress.round % 2 === 0) addOne('whiteWerewolf', 'whiteWerewolf')
  addOne('shepherd', 'shepherd')
  addOne('alien', 'alien')
  addOne('maitreOurse', 'maitreOurse')
  const monkeyIndex = firstAlive('geniusMonkey')
  if (monkeyIndex >= 0 && !used(progress, monkeyIndex, 'investigate')) order.push({ key: 'geniusMonkey', actorIndex: monkeyIndex })
  return order
}

function checkWinner(game: SavedGame, progress: GameProgress): GameProgress {
  const aliveIndices = progress.alive.flatMap((alive, index) => alive ? [index] : [])
  if (aliveIndices.length === 1 && roleKey(game, aliveIndices[0]) === 'whiteWerewolf') {
    return { ...progress, phase: 'game-over', winner: 'whiteWerewolf' }
  }
  const wolves = aliveIndices.filter((index) => isWerewolf(game, index, progress)).length
  const village = aliveIndices.filter((index) => !isWerewolf(game, index, progress) && roleKey(game, index) !== 'whiteWerewolf').length
  if (wolves === 0) return { ...progress, phase: 'game-over', winner: 'village' }
  if (wolves >= village) return { ...progress, phase: 'game-over', winner: 'werewolves' }
  return progress
}

function startDeathResolution(
  game: SavedGame,
  progress: GameProgress,
  playerIndices: number[],
  cause: EliminationRecord['cause'],
  afterReaction: GamePhase,
  colossusIndex?: number,
) {
  const alive = [...progress.alive]
  const eliminations = [...progress.eliminations]
  const deaths: number[] = []
  const pending = [...progress.pendingReactions]
  const kill = (index: number, deathCause: EliminationRecord['cause']) => {
    if (index < 0 || !alive[index]) return
    alive[index] = false
    deaths.push(index)
    eliminations.push({ playerIndex: index, cause: deathCause, round: progress.round })
    if (progress.lovers.includes(index)) {
      const partnerIndex = progress.lovers.find((lover) => lover !== index)
      if (partnerIndex !== undefined && alive[partnerIndex]) kill(partnerIndex, 'lover')
    }
  }
  playerIndices.forEach((index) => kill(index, cause))
  let convertedToWerewolf = [...progress.convertedToWerewolf]
  if (progress.mentorIndex !== null && !alive[progress.mentorIndex]) {
    const childIndex = game.assignments.findIndex((assignment, index) => roleById.get(String(assignment.roleId))?.key === 'wildChild' && alive[index])
    if (childIndex >= 0) convertedToWerewolf = [...new Set([...convertedToWerewolf, childIndex])]
  }
  deaths.forEach((index) => {
    const key = roleKey(game, index)
    if (key === 'hunter') pending.push({ actorIndex: index, cause: 'hunter' })
    if (index === colossusIndex && key === 'colossus') pending.push({ actorIndex: index, cause: 'colossus' })
  })
  let next: GameProgress = {
    ...progress,
    alive,
    convertedToWerewolf,
    eliminations,
    pendingReactions: pending,
    afterReaction,
    phase: pending.length ? 'death-reaction' : afterReaction,
  }
  if (!pending.length) next = checkWinner(game, next)
  return { progress: next, deaths }
}

