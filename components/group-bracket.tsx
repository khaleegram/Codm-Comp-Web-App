'use client'

import { useTournament } from '@/components/tournament-provider'
import { MatchCard } from '@/components/match-card'
import type { Match } from '@/lib/types'

export function GroupBracket() {
  return (
    <div className="w-full overflow-x-auto py-4">
      <div className="min-w-[1550px] p-6 bg-zinc-950/40 rounded-2xl border border-zinc-900 backdrop-blur-md">
        {/* Round Headers */}
        <div className="flex items-center text-center text-xs font-bold text-zinc-400 uppercase tracking-wider mb-6 pb-3 border-b border-zinc-800">
          <div className="w-64">Round of 32</div>
          <div className="w-8"></div>
          <div className="w-64">Round of 16</div>
          <div className="w-8"></div>
          <div className="w-64">Quarterfinals</div>
          <div className="w-8"></div>
          <div className="w-64">Semifinals</div>
          <div className="w-8"></div>
          <div className="w-64">Grand Final</div>
          <div className="w-8"></div>
          <div className="w-48">Champion</div>
        </div>

        {/* Bracket Tree Rooted at Grand Final (Round 5, Match 1) */}
        <div className="flex justify-start items-stretch">
          <BracketNode round={5} matchNumber={1} />
        </div>
      </div>
    </div>
  )
}

function BracketNode({ round, matchNumber }: { round: number; matchNumber: number }) {
  const { getMatchByPosition } = useTournament()
  const match = getMatchByPosition(round, matchNumber)

  if (round === 1) {
    return (
      <div className="w-64 py-2 px-2">
        <MatchCard match={match || null} isCompact />
      </div>
    )
  }

  // Round > 1: Symmetrical binary tree layout
  return (
    <div className="flex items-stretch">
      {/* Column of two child matches from previous round */}
      <div className="flex flex-col justify-between self-stretch">
        <div className="flex-1 flex flex-col justify-center">
          <BracketNode round={round - 1} matchNumber={matchNumber * 2 - 1} />
        </div>
        <div className="flex-1 flex flex-col justify-center">
          <BracketNode round={round - 1} matchNumber={matchNumber * 2} />
        </div>
      </div>

      {/* SVG Connector Line */}
      <div className="w-8 flex items-stretch">
        <svg className="w-full text-zinc-850" viewBox="0 0 32 100" preserveAspectRatio="none">
          <path 
            d="M 0,25 L 16,25 L 16,75 L 0,75 M 16,50 L 32,50" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.5"
          />
        </svg>
      </div>

      {/* Current Round Match Card */}
      <div className="flex items-center">
        <div className="w-64 flex flex-col justify-center px-2">
          <MatchCard match={match || null} isCompact={round !== 5} />
        </div>

        {/* For Grand Final (Round 5), also render the Champion display */}
        {round === 5 && (
          <>
            <div className="w-8 flex items-stretch">
              <svg className="w-full text-zinc-850" viewBox="0 0 32 100" preserveAspectRatio="none">
                <path d="M 0,50 L 32,50" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
            <div className="w-48 p-4 rounded-xl border border-yellow-500/20 bg-yellow-950/10 backdrop-blur text-center flex flex-col items-center justify-center gap-1 shadow-lg shadow-yellow-950/20">
              <span className="text-[10px] text-yellow-500 font-bold uppercase tracking-wider animate-pulse">Champion</span>
              <span className="text-sm font-bold text-white truncate max-w-full">
                {match?.winner_id 
                  ? (match.winner_id === match.player1_id ? match.player1_name : match.player2_name) 
                  : 'TBD'}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
