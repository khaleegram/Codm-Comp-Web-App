'use client'

import { cn } from '@/lib/utils'
import type { Match } from '@/lib/types'
import { useTournament } from '@/components/tournament-provider'
import { getMatchRoomNumber } from '@/lib/types'

interface MatchCardProps {
  match: Match | null
  showConnector?: boolean
  isCompact?: boolean
}

export function MatchCard({ match, showConnector = false, isCompact = false }: MatchCardProps) {
  const { players } = useTournament()

  if (!match) {
    return (
      <div className={cn(
        "rounded-lg border border-border bg-card/50 relative",
        isCompact ? "p-2" : "p-3"
      )}>
        <div className="flex flex-col gap-1">
          <PlayerSlot name="TBD" score={null} isWinner={false} isCompact={isCompact} />
          <div className="h-px bg-border" />
          <PlayerSlot name="TBD" score={null} isWinner={false} isCompact={isCompact} />
        </div>
        {showConnector && <Connector />}
      </div>
    )
  }

  const isLive = match.status === 'in_progress'
  const isCompleted = match.status === 'completed'

  // Calculate total scores for display
  const p1TotalGames = countGamesWon(match, 'p1')
  const p2TotalGames = countGamesWon(match, 'p2')

  const p1IsWinner = match.winner_id !== null && match.player1_id === match.winner_id
  const p2IsWinner = match.winner_id !== null && match.player2_id === match.winner_id

  // Lookup player seeds
  const p1Seed = match.player1_id ? players.find(p => p.id === match.player1_id)?.seed : null
  const p2Seed = match.player2_id ? players.find(p => p.id === match.player2_id)?.seed : null

  return (
    <div className={cn(
      "rounded-lg border relative transition-all duration-200",
      isLive && "border-primary ring-1 ring-primary/50 bg-card",
      isCompleted && "border-accent/50 bg-card",
      !isLive && !isCompleted && "border-border bg-card/50",
      isCompact ? "p-2" : "p-3"
    )}>
      {isLive && (
        <div className="absolute -top-2 left-3 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-bold rounded uppercase tracking-wider">
          Live
        </div>
      )}
      
      <div className="absolute -top-2 right-3 px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded font-medium shadow-sm">
        Room {getMatchRoomNumber(match)}
      </div>


      <div className="flex flex-col gap-1">
        <PlayerSlot 
          name={match.player1_name || 'TBD'} 
          score={isCompleted || isLive ? p1TotalGames : null}
          isWinner={p1IsWinner}
          isCompact={isCompact}
          seed={p1Seed}
        />
        <div className="h-px bg-border" />
        <PlayerSlot 
          name={match.player2_name || 'TBD'} 
          score={isCompleted || isLive ? p2TotalGames : null}
          isWinner={p2IsWinner}
          isCompact={isCompact}
          seed={p2Seed}
        />
      </div>

      {/* Game scores tooltip/detail */}
      {(isLive || isCompleted) && (
        <div className={cn(
          "flex justify-center gap-2 pt-2 border-t border-border mt-2",
          isCompact && "text-xs"
        )}>
          <GameScore 
            label="G1" 
            p1={match.game1_p1_score} 
            p2={match.game1_p2_score} 
          />
          <GameScore 
            label="G2" 
            p1={match.game2_p1_score} 
            p2={match.game2_p2_score} 
          />
          {(match.game3_p1_score !== null || match.game3_p2_score !== null) && (
            <GameScore 
              label="G3" 
              p1={match.game3_p1_score} 
              p2={match.game3_p2_score} 
            />
          )}
        </div>
      )}

      {showConnector && <Connector />}
    </div>
  )
}

function PlayerSlot({ 
  name, 
  score, 
  isWinner,
  isCompact,
  seed
}: { 
  name: string
  score: number | null
  isWinner: boolean
  isCompact?: boolean
  seed?: number | null
}) {
  const isTBD = name === 'TBD'
  
  return (
    <div className={cn(
      "flex items-center justify-between gap-2",
      isCompact ? "min-h-6" : "min-h-8"
    )}>
      <div className="flex items-center gap-1.5 min-w-0">
        {seed !== undefined && seed !== null && (
          <span className="text-[10px] px-1 py-0.5 rounded bg-muted-foreground/15 text-muted-foreground font-mono font-semibold">
            #{seed}
          </span>
        )}
        <span className={cn(
          "truncate font-medium",
          isCompact ? "text-sm max-w-24" : "text-sm max-w-32",
          isWinner && "text-accent",
          isTBD && "text-muted-foreground italic"
        )}>
          {name}
        </span>
      </div>
      {score !== null && (
        <span className={cn(
          "font-mono font-bold px-2 py-0.5 rounded",
          isCompact ? "text-sm" : "text-base",
          isWinner ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
        )}>
          {score}
        </span>
      )}
    </div>
  )
}

function GameScore({ 
  label, 
  p1, 
  p2 
}: { 
  label: string
  p1: number | null
  p2: number | null 
}) {
  if (p1 === null && p2 === null) return null
  
  const p1Won = p1 !== null && p2 !== null && p1 > p2
  const p2Won = p1 !== null && p2 !== null && p2 > p1
  
  return (
    <div className="flex items-center gap-1 text-xs">
      <span className="text-muted-foreground">{label}:</span>
      <span className={cn(p1Won && "text-accent font-bold")}>{p1 ?? '-'}</span>
      <span className="text-muted-foreground">-</span>
      <span className={cn(p2Won && "text-accent font-bold")}>{p2 ?? '-'}</span>
    </div>
  )
}

function Connector() {
  return (
    <div className="absolute right-0 top-1/2 w-4 h-px bg-border translate-x-full" />
  )
}

export function countGamesWon(match: Match, player: 'p1' | 'p2'): number {
  let wins = 0
  
  if (match.game1_p1_score !== null && match.game1_p2_score !== null) {
    if (player === 'p1' && match.game1_p1_score > match.game1_p2_score) wins++
    if (player === 'p2' && match.game1_p2_score > match.game1_p1_score) wins++
  }
  
  if (match.game2_p1_score !== null && match.game2_p2_score !== null) {
    if (player === 'p1' && match.game2_p1_score > match.game2_p2_score) wins++
    if (player === 'p2' && match.game2_p2_score > match.game2_p1_score) wins++
  }
  
  if (match.game3_p1_score !== null && match.game3_p2_score !== null) {
    if (player === 'p1' && match.game3_p1_score > match.game3_p2_score) wins++
    if (player === 'p2' && match.game3_p2_score > match.game3_p1_score) wins++
  }
  
  return wins
}
