import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppHeader } from '../components/AppHeader'
import { roleById, roles } from '../data/roles'
import type { GameAction, NightPrompt, RoleId, SavedGame } from '../types/game'

interface GameRoundScreenProps {
  game: SavedGame
  onAction: (action: GameAction) => void
  onEnd: () => void
}

function RoleName({ roleId }: { roleId: RoleId }) {
  const { t } = useTranslation('roles')
  const role = roleById.get(String(roleId))
  return <>{role ? t(`${role.key}.name`) : '—'}</>
}

function PlayerCard({
  game,
  playerIndex,
  selected = false,
  disabled = false,
  label,
  onClick,
}: {
  game: SavedGame
  playerIndex: number
  selected?: boolean
  disabled?: boolean
  label?: string
  onClick?: () => void
}) {
  const progress = game.progress!
  const player = game.assignments[playerIndex]
  const role = roleById.get(String(player.roleId))
  const clickable = Boolean(onClick)
  return (
    <button
      type="button"
      className={`player-card ${progress.alive[playerIndex] ? '' : 'is-dead'} ${selected ? 'is-picked' : ''} ${clickable ? 'is-choice' : ''}`}
      aria-pressed={clickable ? selected : undefined}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="player-card-top">
        <span className="player-seat">{String(playerIndex + 1).padStart(2, '0')}</span>
        {progress.alive[playerIndex] ? <span className="alive-marker" /> : <span className="dead-marker">×</span>}
      </span>
        <span className="player-card-icon" aria-hidden="true">{role?.icon ?? '·'}</span>
      <strong className="player-card-name">{player.name || `Player ${playerIndex + 1}`}</strong>
      {label && <small className="player-card-label">{label}</small>}
    </button>
  )
}

function PlayerGrid({
  game,
  selected,
  disabled,
  label,
  onSelect,
}: {
  game: SavedGame
  selected: number[]
  disabled?: (index: number) => boolean
  label?: string
  onSelect: (index: number) => void
}) {
  return (
    <div className="player-card-grid">
      {game.assignments.map((player, index) => (
        <PlayerCard
          key={`${player.name}-${index}`}
          game={game}
          playerIndex={index}
          selected={selected.includes(index)}
          disabled={disabled?.(index)}
          label={label}
          onClick={() => onSelect(index)}
        />
      ))}
    </div>
  )
}

function NightIntro({ game, onBegin }: { game: SavedGame; onBegin: () => void }) {
  const { t } = useTranslation()
  const { t: roleT } = useTranslation('roles')
  const progress = game.progress!
  const activeRoleIds = game.assignments.flatMap((assignment, index) => progress.alive[index] ? [assignment.roleId] : [])
  const uniqueRoles = [...new Set(activeRoleIds.map(String))].map((id) => roleById.get(id)).filter((role) => role !== undefined)
  const sisters = progress.round === 1 ? game.assignments.flatMap((assignment) => roleById.get(String(assignment.roleId))?.key === 'twoSisters' ? [assignment.name] : []) : []

  return (
    <main className="game-main">
      <div className="game-topline"><span>{t('game.round', { round: progress.round })}</span><span>{t('game.night')}</span></div>
      <section className="game-intro-block">
        <div className="phase-symbol" aria-hidden="true">☾</div>
        <p className="step-label">{t('game.narrator')}</p>
        <h1>{t('game.nightTitle')}</h1>
        <p className="screen-intro">{t('game.nightInstruction')}</p>
      </section>
      <section className="game-checklist">
        <h2>{t('game.inPlay')}</h2>
        <div className="role-chip-list">
          {uniqueRoles.map((role) => {
            return <span className="role-chip" key={role.id}><span aria-hidden="true">{role.icon}</span>{roleT(`${role.key}.name`)}</span>
          })}
        </div>
      </section>
      {sisters.length > 0 && <p className="game-notice">{t('game.twoSistersReminder', { names: sisters.join(' · ') })}</p>}
      <button type="button" className="button button-primary button-large game-primary-action" onClick={onBegin}>{t('game.beginNight')} <span aria-hidden="true">→</span></button>
    </main>
  )
}

function getPromptTitle(prompt: NightPrompt, game: SavedGame, t: (key: string) => string, roleT: (key: string) => string) {
  const roleId = prompt.key === 'wolves' ? 20 : game.assignments[prompt.actorIndex].roleId
  const role = roleById.get(String(roleId))
  return prompt.key === 'wolves' ? t('game.werewolvesAction') : role ? roleT(`${role.key}.name`) : ''
}

function NightAction({ game, onAction }: GameRoundScreenProps) {
  const { t } = useTranslation()
  const { t: roleT } = useTranslation('roles')
  const progress = game.progress!
  const prompt = progress.nightOrder[progress.nightActionIndex]
  const [selected, setSelected] = useState<number[]>([])
  const [choice, setChoice] = useState('')
  const [guessedRoleId, setGuessedRoleId] = useState<RoleId>(1)
  const isMulti = prompt.key === 'cupid' || prompt.key === 'shepherd'
  const maxTargets = prompt.key === 'cupid' ? 2 : prompt.key === 'shepherd' ? progress.sheepRemaining : 1
  const investigatedTargets = prompt.key === 'geniusMonkey' ? progress.nightChoices[String(progress.nightActionIndex)]?.targetIndices ?? [] : []
  const fatherIndex = game.assignments.findIndex((assignment, index) => roleById.get(String(assignment.roleId))?.key === 'infectiousFather' && progress.alive[index])
  const role = roleById.get(String(game.assignments[prompt.actorIndex]?.roleId))
  const actor = prompt.key === 'wolves' ? t('game.werewolvesAction') : game.assignments[prompt.actorIndex]?.name
  const promptText = t(`game.action.${prompt.key}`)

  const selectTarget = (index: number) => {
    if (!isMulti) {
      setSelected([index])
      return
    }
    setSelected((current) => current.includes(index)
      ? current.filter((value) => value !== index)
      : current.length < maxTargets ? [...current, index] : current)
  }

  const submit = () => {
    const submittedChoice = prompt.key === 'witch' && !choice
      ? { choice: 'none' }
      : {
          ...(selected.length === 1 ? { targetIndex: selected[0] } : {}),
          ...(selected.length > 1 || isMulti ? { targetIndices: selected } : {}),
          ...(choice ? { choice } : {}),
          ...(prompt.key === 'alien' ? { guessedRoleId } : {}),
        }
    setSelected([])
    onAction({ type: 'SUBMIT_NIGHT_ACTION', choice: submittedChoice })
  }

  return (
    <main className="game-main">
      <div className="game-topline"><span>{t('game.round', { round: progress.round })}</span><span>{t('game.actionProgress', { current: progress.nightActionIndex + 1, total: progress.nightOrder.length })}</span></div>
      <section className="action-prompt-card">
        <div className="action-icon" aria-hidden="true">{prompt.key === 'wolves' ? '☾' : role?.icon}</div>
        <p className="step-label">{t('game.wake')}</p>
        <h1>{getPromptTitle(prompt, game, t, roleT)}</h1>
        <p className="screen-intro">{promptText}</p>
        <p className="action-actor">{actor}</p>
        {prompt.key === 'wolves' && game.assignments.some((assignment) => String(assignment.roleId) === '6') && <p className="game-notice">{t('game.littleGirlReminder')}</p>}
      </section>
      {prompt.key === 'witch' && (
        <section className="ability-options" aria-label={t('game.chooseAction')}>
          <button type="button" className={`ability-option ${choice === '' ? 'is-selected' : ''}`} onClick={() => { setChoice(''); setSelected([]) }}>{t('game.skipAction')}</button>
          {!progress.usedAbilities.some((value) => value.endsWith(':save')) && <button type="button" className={`ability-option ${choice === 'save' ? 'is-selected' : ''}`} onClick={() => { setChoice('save'); setSelected([]) }}>{t('game.saveVictim')}</button>}
          {!progress.usedAbilities.some((value) => value.endsWith(':kill')) && <button type="button" className={`ability-option ${choice === 'kill' ? 'is-selected' : ''}`} onClick={() => { setChoice('kill'); setSelected([]) }}>{t('game.killPotion')}</button>}
        </section>
      )}
      {(prompt.key === 'whiteWerewolf' || prompt.key === 'geniusMonkey') && (
        <section className="ability-options">
          <button type="button" className={`ability-option ${choice === 'stop' ? 'is-selected' : ''}`} onClick={() => { setChoice('stop'); setSelected([]) }}>{t(prompt.key === 'geniusMonkey' ? 'game.stopInvestigation' : 'game.stopAction')}</button>
        </section>
      )}
      {prompt.key === 'geniusMonkey' && investigatedTargets.length > 0 && <section className="night-report-section">
        <h2>{t('game.investigatedSoFar')}</h2>
        {investigatedTargets.map((targetIndex) => <p className="night-report-card" key={targetIndex}>
          <strong>{game.assignments[targetIndex]?.name}</strong>
          <small>{roleT(`${roleById.get(String(game.assignments[targetIndex]?.roleId))?.key}.name`)}</small>
        </p>)}
      </section>}
      {prompt.key === 'wolves' && fatherIndex >= 0 && !progress.usedAbilities.includes(`${fatherIndex}:infect`) && (
        <section className="ability-options">
          <button type="button" className={`ability-option ${choice === 'kill' ? 'is-selected' : ''}`} onClick={() => setChoice('kill')}>{t('game.killVictim')}</button>
          <button type="button" className={`ability-option ${choice === 'infect' ? 'is-selected' : ''}`} onClick={() => setChoice('infect')}>{t('game.infectVictim')}</button>
        </section>
      )}
      {!(prompt.key === 'witch' && choice !== 'kill') && choice !== 'stop' && <div className="target-heading"><h2>{prompt.key === 'cupid' ? t('game.chooseTwo') : prompt.key === 'shepherd' ? t('game.chooseSheepTargets', { count: progress.sheepRemaining }) : t('game.choosePlayer')}</h2>{selected.length > 0 && <span>{selected.length}{isMulti ? ` / ${maxTargets}` : ''}</span>}</div>}
      {!(prompt.key === 'witch' && choice !== 'kill') && choice !== 'stop' && <PlayerGrid
        game={game}
        selected={selected}
        disabled={(index) => !progress.alive[index]
          || (prompt.key === 'seer' && index === prompt.actorIndex)
          || (prompt.key === 'geniusMonkey' && (index === prompt.actorIndex || investigatedTargets.includes(index)))
          || (prompt.key === 'protector' && index === progress.lastProtectedIndex)
          || (prompt.key === 'wolves' && isWolfTeam(game, index))
          || (prompt.key === 'whiteWerewolf' && !isWolfTeam(game, index))
          || (prompt.key === 'alien' && index === prompt.actorIndex)
          || (prompt.key === 'cupid' && selected.includes(index))}
        onSelect={selectTarget}
      />}
      {prompt.key === 'alien' && (
        <label className="guess-select-label">{t('game.guessRole')}
          <select value={String(guessedRoleId)} onChange={(event) => setGuessedRoleId((roles.find((roleValue) => String(roleValue.id) === event.currentTarget.value)?.id ?? 1) as RoleId)}>
            {roles.map((entry) => {
              const text = t(`roles:${entry.key}`, { returnObjects: true }) as { name: string }
              return <option value={String(entry.id)} key={entry.id}>{text.name}</option>
            })}
          </select>
        </label>
      )}
      <button type="button" className="button button-primary button-large game-primary-action" disabled={prompt.key === 'witch' ? choice === 'kill' && selected.length !== 1 : choice === 'stop' ? false : prompt.key === 'shepherd' ? selected.length > maxTargets : selected.length === 0 || (prompt.key === 'cupid' && selected.length !== 2)} onClick={submit}>
        {t('game.confirmAction')} <span aria-hidden="true">→</span>
      </button>
    </main>
  )
}

function isWolfTeam(game: SavedGame, playerIndex: number) {
  const roleKey = roleById.get(String(game.assignments[playerIndex]?.roleId))?.key
  return roleKey === 'regularWerewolf' || roleKey === 'infectiousFather' || Boolean(game.progress?.convertedToWerewolf.includes(playerIndex))
}

function DawnScreen({ game, onAction }: GameRoundScreenProps) {
  const { t } = useTranslation()
  const progress = game.progress!
  const tonightDeaths = progress.eliminations.filter((entry) => entry.round === progress.round && entry.cause === 'night')
  return (
    <main className="game-main">
      <div className="game-topline"><span>{t('game.round', { round: progress.round })}</span><span>{t('game.morning')}</span></div>
      <section className="game-intro-block">
        <div className="phase-symbol phase-sun" aria-hidden="true">◯</div>
        <p className="step-label">{t('game.narrator')}</p>
        <h1>{t('game.morningTitle')}</h1>
        <p className="screen-intro">{tonightDeaths.length ? t('game.morningDeaths', { count: tonightDeaths.length }) : t('game.noDeaths')}</p>
      </section>
      {tonightDeaths.length > 0 && <div className="player-card-grid">
        {tonightDeaths.map((death) => <div className="outcome-card" key={`${death.playerIndex}-${death.round}`}>
          <span className="outcome-seat">{String(death.playerIndex + 1).padStart(2, '0')}</span>
          <strong>{game.assignments[death.playerIndex].name}</strong>
          <small><RoleName roleId={game.assignments[death.playerIndex].roleId} /></small>
        </div>)}
      </div>}
      {game.selectedRoleIds.includes('shepherd') && <p className="game-notice">{t('game.sheepRemaining', { count: progress.sheepRemaining })}</p>}
      {progress.villagePowersDisabled && <p className="game-notice">{t('game.villagePowersDisabled')}</p>}
      <NightLogPanel game={game} />
      <PlayerRoster game={game} />
      <button type="button" className="button button-primary button-large game-primary-action" onClick={() => onAction({ type: 'BEGIN_DAY' })}>{t('game.openDay')} <span aria-hidden="true">→</span></button>
    </main>
  )
}

function NightLogPanel({ game }: { game: SavedGame }) {
  const { t } = useTranslation()
  const { t: roleT } = useTranslation('roles')
  const logs = [...(game.progress?.nightLogs ?? [])].sort((first, second) => second.round - first.round)
  if (!logs.length) return null
  const renderLog = (round: number, entries: NonNullable<SavedGame['progress']>['nightLogs'][number]['entries']) => (
    <section className="night-log-round" key={round}>
      <h3>{t('game.round', { round })}</h3>
      <ol className="night-log-list">
        {entries.map((entry, index) => {
          const names = entry.playerIndices.map((playerIndex) => game.assignments[playerIndex]?.name || t('game.playerNumber', { number: playerIndex + 1 }))
          const role = entry.roleId === undefined ? '' : roleT(`${roleById.get(String(entry.roleId))?.key}.name`)
          const text = t(`game.log.${entry.kind}`, {
            name: names[0] ?? '',
            actor: names[0] ?? '',
            target: names[1] ?? names[0] ?? '',
            role,
            cause: entry.cause ? t(`game.cause.${entry.cause}`) : '',
          })
          return <li className="night-log-entry" key={`${entry.kind}-${index}`}><span className="log-marker" aria-hidden="true">{entry.kind === 'eliminated' ? '×' : '·'}</span><p>{text}</p></li>
        })}
      </ol>
    </section>
  )

  return <section className="night-log-panel">
    <div className="night-log-heading"><span aria-hidden="true">☾</span><h2>{t('game.nightLog')}</h2></div>
    {renderLog(logs[0].round, logs[0].entries)}
    {logs.length > 1 && <details className="older-logs">
      <summary>{t('game.olderNightLogs', { count: logs.length - 1 })}</summary>
      {logs.slice(1).map((log) => renderLog(log.round, log.entries))}
    </details>}
  </section>
}

function PlayerRoster({ game }: { game: SavedGame }) {
  const { t } = useTranslation()
  const progress = game.progress!
  return (
    <section className="roster-section">
      <div className="target-heading"><h2>{t('game.players')}</h2><span>{progress.alive.filter(Boolean).length} / {game.playerCount}</span></div>
      <div className="player-card-grid">
        {game.assignments.map((assignment, index) => <div className={`roster-card ${progress.alive[index] ? '' : 'is-dead'}`} key={`${assignment.name}-${index}`}>
          <span className="player-card-top"><span className="player-seat">{String(index + 1).padStart(2, '0')}</span>{progress.alive[index] ? <span className="alive-marker" /> : <span className="dead-marker">×</span>}</span>
          <span className="player-card-icon" aria-hidden="true">{roleById.get(String(assignment.roleId))?.icon}</span>
          <strong className="player-card-name">{assignment.name}</strong>
          <small className="roster-role"><RoleName roleId={assignment.roleId} /></small>
          {progress.lovers.includes(index) && <small className="player-card-label">{t('game.lovers')}</small>}
          {progress.convertedToWerewolf.includes(index) && <small className="player-card-label">{t('game.converted')}</small>}
          {roleById.get(String(assignment.roleId))?.key === 'villageVillage' && <small className="player-card-label">{t('game.publicVillager')}</small>}
        </div>)}
      </div>
    </section>
  )
}

function DayScreen({ game, onAction }: GameRoundScreenProps) {
  const { t } = useTranslation()
  const progress = game.progress!
  const [barberTarget, setBarberTarget] = useState<number | null>(null)
  const [restoreChoice, setRestoreChoice] = useState<{ targetIndex: number; abilityKey: string } | null>(null)
  const [eliminationTarget, setEliminationTarget] = useState<number | null>(null)
  const [eliminationCause, setEliminationCause] = useState<'vote' | 'ability' | 'hunter' | 'alien'>('vote')
  const barberIndex = game.assignments.findIndex((assignment, index) => roleById.get(String(assignment.roleId))?.key === 'barber' && progress.alive[index] && !progress.usedAbilities.includes(`${index}:barber`))
  const rebouteuxIndex = game.assignments.findIndex((assignment, index) => roleById.get(String(assignment.roleId))?.key === 'rebouteux' && progress.alive[index] && !progress.usedAbilities.includes(`${index}:rebouteux`))
  const restoreOptions = progress.usedAbilities.flatMap((token) => {
    const [targetValue, abilityKey] = token.split(':')
    const targetIndex = Number(targetValue)
    return progress.alive[targetIndex] && targetIndex !== rebouteuxIndex && ['save', 'kill', 'infect', 'judge', 'barber', 'investigate'].includes(abilityKey)
      ? [{ targetIndex, abilityKey }]
      : []
  })
  const judgeIndex = game.assignments.findIndex((assignment, index) => roleById.get(String(assignment.roleId))?.key === 'stutteringJudge' && progress.alive[index] && !progress.judgeUsed.includes(index))
  return (
    <main className="game-main">
      <div className="game-topline"><span>{t('game.round', { round: progress.round })}</span><span>{t('game.day')}</span></div>
      <section className="game-intro-block day-heading">
        <p className="step-label">{t('game.narrator')}</p>
        <h1>{t('game.dayTitle', { round: progress.round })}</h1>
        <p className="screen-intro">{t('game.dayInstruction')}</p>
      </section>
      {progress.ravenTarget !== null && progress.alive[progress.ravenTarget] && <p className="game-notice">{t('game.ravenVotesNotice', { name: game.assignments[progress.ravenTarget]?.name })}</p>}
      <PlayerRoster game={game} />
      {!progress.dayVoteResolved ? <>
        <section className="special-action-panel narrator-elimination-panel">
          <h2>{t('game.recordDayElimination')}</h2>
          <p>{t('game.offlineVoteInstruction')}</p>
          <div className="elimination-causes" role="group" aria-label={t('game.eliminationCause')}>
            {(['vote', 'ability', 'hunter', 'alien'] as const).map((cause) => (
              <button type="button" className={`ability-option ${eliminationCause === cause ? 'is-selected' : ''}`} aria-pressed={eliminationCause === cause} key={cause} onClick={() => setEliminationCause(cause)}>{t(`game.cause.${cause}`)}</button>
            ))}
          </div>
          <div className="target-heading"><h2>{t('game.chooseEliminatedPlayer')}</h2></div>
          <PlayerGrid game={game} selected={eliminationTarget === null ? [] : [eliminationTarget]} disabled={(index) => !progress.alive[index]} onSelect={setEliminationTarget} />
          <div className="narrator-elimination-actions">
            <button type="button" className="button button-primary" disabled={eliminationTarget === null} onClick={() => {
              if (eliminationTarget !== null) onAction({ type: 'NARRATOR_ELIMINATE', targetIndex: eliminationTarget, cause: eliminationCause })
              setEliminationTarget(null)
            }}>{t('game.confirmDayElimination')} <span aria-hidden="true">→</span></button>
            <button type="button" className="button button-quiet" onClick={() => onAction({ type: 'NO_DAY_ELIMINATION' })}>{t('game.noDayElimination')}</button>
          </div>
        </section>
        {barberIndex >= 0 && <section className="special-action-panel">
          <h2>{t('game.barberAbility')}</h2>
          <p>{t('game.barberInstruction')}</p>
          <PlayerGrid game={game} selected={barberTarget === null ? [] : [barberTarget]} disabled={(index) => !progress.alive[index] || index === barberIndex} onSelect={setBarberTarget} />
          <button type="button" className="button button-outline" disabled={barberTarget === null} onClick={() => {
            if (barberTarget !== null) onAction({ type: 'BARBER_ELIMINATE', targetIndex: barberTarget })
            setBarberTarget(null)
          }}>{t('game.useBarber')}</button>
        </section>}
        {rebouteuxIndex >= 0 && restoreOptions.length > 0 && <section className="special-action-panel">
          <h2>{t('game.rebouteuxAbility')}</h2>
          <p>{t('game.rebouteuxInstruction')}</p>
          <div className="ability-options">
            {restoreOptions.map((option) => <button type="button" className={`ability-option ${restoreChoice?.targetIndex === option.targetIndex && restoreChoice.abilityKey === option.abilityKey ? 'is-selected' : ''}`} key={`${option.targetIndex}:${option.abilityKey}`} onClick={() => setRestoreChoice(option)}>
              {game.assignments[option.targetIndex]?.name} · {t(`game.ability.${option.abilityKey}`)}
            </button>)}
          </div>
          <button type="button" className="button button-outline" disabled={!restoreChoice} onClick={() => {
            if (restoreChoice) onAction({ type: 'REBOUTEUX_RESTORE', ...restoreChoice })
            setRestoreChoice(null)
          }}>{t('game.restoreAbility')}</button>
        </section>}
      </> : <>
        {judgeIndex >= 0 && <button type="button" className="button button-outline game-primary-action" onClick={() => onAction({ type: 'SECOND_VOTE' })}>{t('game.judgeSecondVote')}</button>}
        <button type="button" className="button button-primary button-large game-primary-action" onClick={() => onAction({ type: 'END_DAY' })}>{t('game.beginNight')} <span aria-hidden="true">→</span></button>
      </>}
    </main>
  )
}

function ServantChoice({ game, onAction }: GameRoundScreenProps) {
  const { t } = useTranslation()
  const targetIndex = game.progress?.servantTargetIndex
  if (targetIndex === null || targetIndex === undefined) return null
  return <main className="game-main">
    <div className="game-topline"><span>{t('game.round', { round: game.progress?.round })}</span><span>{t('game.narrator')}</span></div>
    <section className="action-prompt-card">
      <div className="action-icon" aria-hidden="true">⚿</div>
      <p className="step-label">{t('game.servantTitle')}</p>
      <h1>{t('game.servantChoice')}</h1>
      <p className="screen-intro">{t('game.servantHint', { name: game.assignments[targetIndex]?.name })}</p>
    </section>
    <div className="servant-actions">
      <button type="button" className="button button-primary button-large" onClick={() => onAction({ type: 'SERVANT_TAKE_ROLE' })}>{t('game.servantTake')}</button>
      <button type="button" className="button button-outline" onClick={() => onAction({ type: 'SERVANT_DECLINE' })}>{t('game.servantDecline')}</button>
    </div>
  </main>
}

function DeathReaction({ game, onAction }: GameRoundScreenProps) {
  const { t } = useTranslation()
  const progress = game.progress!
  const reaction = progress.pendingReactions[0]
  const [target, setTarget] = useState<number | null>(null)
  if (!reaction) return null
  const targetIsAllowed = (index: number) => reaction.cause === 'colossus' && !isWolfTeam(game, index)
  return <main className="game-main">
    <div className="game-topline"><span>{t('game.round', { round: progress.round })}</span><span>{t('game.elimination')}</span></div>
    <section className="action-prompt-card"><div className="action-icon">{reaction.cause === 'hunter' ? '➶' : '♜'}</div><p className="step-label">{game.assignments[reaction.actorIndex]?.name}</p><h1>{t(`game.reaction.${reaction.cause}`)}</h1><p className="screen-intro">{t(`game.reactionHint.${reaction.cause}`)}</p></section>
    <PlayerGrid game={game} selected={target === null ? [] : [target]} disabled={(index) => !progress.alive[index] || index === reaction.actorIndex || targetIsAllowed(index)} onSelect={setTarget} />
    <button type="button" className="button button-primary button-large game-primary-action" disabled={target === null} onClick={() => target !== null && onAction({ type: 'DEATH_REACTION', targetIndex: target })}>{t('game.confirmAction')} <span aria-hidden="true">→</span></button>
  </main>
}

function GameOver({ game, onEnd }: GameRoundScreenProps) {
  const { t } = useTranslation()
  const progress = game.progress!
  return <main className="game-main game-over-main">
    <div className="phase-symbol" aria-hidden="true">✦</div>
    <p className="step-label">{t('game.gameOver')}</p>
    <h1>{t(`game.winner.${progress.winner ?? 'village'}`)}</h1>
    <PlayerRoster game={game} />
    <button type="button" className="button button-danger-quiet game-primary-action" onClick={onEnd}>{t('endGame')}</button>
  </main>
}

export function GameRoundScreen(props: GameRoundScreenProps) {
  const { game, onAction } = props
  const progress = game.progress
  useEffect(() => {
    if (progress?.phase === 'night-resolving') onAction({ type: 'RESOLVE_NIGHT' })
  }, [progress?.phase, onAction])
  if (!progress) return null
  return <div className="app-shell game-shell"><AppHeader /><div className="game-nav"><span aria-hidden="true">●</span><span>{progress.phase === 'night-intro' || progress.phase === 'night-actions' || progress.phase === 'morning' ? '☾' : '◯'}</span></div>
    {progress.phase === 'night-intro' && <NightIntro game={game} onBegin={() => props.onAction({ type: 'BEGIN_NIGHT' })} />}
    {progress.phase === 'night-actions' && <NightAction key={progress.nightActionIndex} {...props} />}
    {progress.phase === 'morning' && <DawnScreen {...props} />}
    {progress.phase === 'day' && <DayScreen key={`${progress.round}-${progress.dayVoteResolved}`} {...props} />}
    {progress.phase === 'servant-choice' && <ServantChoice {...props} />}
    {progress.phase === 'death-reaction' && <DeathReaction {...props} />}
    {progress.phase === 'game-over' && <GameOver {...props} />}
  </div>
}