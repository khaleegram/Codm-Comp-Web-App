'use client'

import { useState } from 'react'
import { useTournament } from '@/components/tournament-provider'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getMatchRoomNumber } from '@/lib/types'
import type { Match } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Trophy, Undo2 } from 'lucide-react'

export function AdminRoomView() {
  const rooms = [1, 2, 3, 4]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          🏆 Parallel Room Scoring
        </h2>
        <p className="text-muted-foreground text-xs mt-1">
          Record match winners for all 4 rooms. Each match is played as Best of 3 (Sniper, Shotgun, and Choice). Select the player who won 2 or 3 matches. Once all matches in a round are scored, the next round's fixtures will auto-generate.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
        {rooms.map(roomNum => (
          <RoomScoringColumn key={roomNum} roomNum={roomNum} />
        ))}
      </div>
    </div>
  )
}

function RoomScoringColumn({ roomNum }: { roomNum: number }) {
  const { matches, refreshData, tournamentState } = useTournament()
  const [savingId, setSavingId] = useState<string | null>(null)
  const supabase = createClient()

  // Filter matches belonging to this room
  const roomMatches = matches
    .filter(m => getMatchRoomNumber(m) === roomNum)
    .sort((a, b) => a.round - b.round || a.match_number - b.match_number)

  // Find the next active match to score: pending and has both players ready
  const nextMatchToScore = roomMatches.find(
    m => m.status === 'pending' && m.player1_id && m.player2_id
  )

  const handleSelectWinner = async (match: Match, winner: 'p1' | 'p2') => {
    setSavingId(match.id)
    try {
      const winnerId = winner === 'p1' ? match.player1_id : match.player2_id
      
      // Set dummy scores: 2-0 for the winner (e.g. game 1 & 2 won by the selected winner)
      const isP1 = winner === 'p1'
      const updateData = {
        winner_id: winnerId,
        status: 'completed' as const,
        game1_p1_score: isP1 ? 1 : 0,
        game1_p2_score: isP1 ? 0 : 1,
        game2_p1_score: isP1 ? 1 : 0,
        game2_p2_score: isP1 ? 0 : 1,
        game3_p1_score: null,
        game3_p2_score: null,
      }

      // Update current match
      const { error: matchUpdateErr } = await supabase
        .from('matches')
        .update(updateData)
        .eq('id', match.id)
      
      if (matchUpdateErr) throw matchUpdateErr

      // Check if this was the last pending match of the current round across the ENTIRE tournament
      const currentRound = match.round
      const nextRound = currentRound + 1
      
      // Look at all matches in the tournament to see if any in this round are still pending
      const otherPendingMatches = matches.filter(
        m => m.round === currentRound && m.id !== match.id && m.status !== 'completed'
      )

      if (otherPendingMatches.length === 0 && nextRound <= 5) {
        // Collect all matches of current round with our updated match integrated
        const allRoundMatches = matches.map(m => 
          m.id === match.id 
            ? { ...m, ...updateData }
            : m
        ).filter(m => m.round === currentRound)

        // Generate next round pairings
        const nextRoundMatches = matches.filter(m => m.round === nextRound)
        
        // Loop over the next round matches and set players based on current round winners
        for (const nextMatch of nextRoundMatches) {
          const parentMatch1 = allRoundMatches.find(m => m.match_number === nextMatch.match_number * 2 - 1)
          const parentMatch2 = allRoundMatches.find(m => m.match_number === nextMatch.match_number * 2)

          const p1Id = parentMatch1?.winner_id || null
          const p1Name = p1Id === parentMatch1?.player1_id ? parentMatch1?.player1_name : (p1Id === parentMatch1?.player2_id ? parentMatch1?.player2_name : null)

          const p2Id = parentMatch2?.winner_id || null
          const p2Name = p2Id === parentMatch2?.player1_id ? parentMatch2?.player1_name : (p2Id === parentMatch2?.player2_id ? parentMatch2?.player2_name : null)

          await supabase
            .from('matches')
            .update({
              player1_id: p1Id,
              player1_name: p1Name,
              player2_id: p2Id,
              player2_name: p2Name
            })
            .eq('id', nextMatch.id)
        }
      } else if (match.round === 5) {
        // Grand Final completed -> complete tournament state
        await supabase
          .from('tournament_state')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('id', tournamentState?.id || '00000000-0000-0000-0000-000000000000')
      }

      await refreshData()
    } catch (err: any) {
      console.error("Failed to select winner:", err)
      alert("Error saving winner: " + (err?.message || err?.details || err))
    } finally {
      setSavingId(null)
    }
  }

  const handleResetMatch = async (matchId: string) => {
    setSavingId(matchId)
    try {
      const match = matches.find(m => m.id === matchId)
      if (!match) return

      let r = match.round
      let mNum = match.match_number
      const updates = []

      // Reset the current match
      updates.push(
        supabase
          .from('matches')
          .update({
            winner_id: null,
            status: 'pending' as const,
            game1_p1_score: null,
            game1_p2_score: null,
            game2_p1_score: null,
            game2_p2_score: null,
            game3_p1_score: null,
            game3_p2_score: null,
          })
          .eq('id', match.id)
      )

      // Cascade reset to child matches in all subsequent rounds
      while (r < 5) {
        const nextR = r + 1
        const nextMNum = Math.ceil(mNum / 2)
        const isPlayer1 = mNum % 2 === 1

        const nextMatch = matches.find(m => m.round === nextR && m.match_number === nextMNum)
        if (!nextMatch) break

        const updateData = isPlayer1
          ? { 
              player1_id: null, 
              player1_name: null, 
              winner_id: null, 
              status: 'pending' as const,
              game1_p1_score: null,
              game1_p2_score: null,
              game2_p1_score: null,
              game2_p2_score: null,
              game3_p1_score: null,
              game3_p2_score: null,
            }
          : { 
              player2_id: null, 
              player2_name: null, 
              winner_id: null, 
              status: 'pending' as const,
              game1_p1_score: null,
              game1_p2_score: null,
              game2_p1_score: null,
              game2_p2_score: null,
              game3_p1_score: null,
              game3_p2_score: null,
            }

        updates.push(
          supabase
            .from('matches')
            .update(updateData)
            .eq('id', nextMatch.id)
        )

        r = nextR
        mNum = nextMNum
      }

      await Promise.all(updates)
      await refreshData()
    } catch (err: any) {
      console.error("Failed to reset match:", err)
      alert("Error resetting match: " + (err?.message || err?.details || err))
    } finally {
      setSavingId(null)
    }
  }

  const getRoundLabel = (r: number) => {
    switch (r) {
      case 1: return 'R32'
      case 2: return 'R16'
      case 3: return 'QF'
      case 4: return 'SF'
      case 5: return 'GF'
      default: return `R${r}`
    }
  }

  return (
    <div className="space-y-6">
      {/* Room Title */}
      <div className="border-b border-zinc-800 pb-2 flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Room {roomNum}
        </h3>
        <Badge variant="outline" className="text-zinc-400 border-zinc-800 text-[10px]">
          {roomMatches.filter(m => m.status === 'completed').length} / {roomMatches.length} Done
        </Badge>
      </div>

      {/* Next Match to Score Card */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
          Next Match to Score
        </span>
        {nextMatchToScore ? (
          <Card className="bg-zinc-950/50 border-primary/20 border backdrop-blur shadow-md relative overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-full blur-xl pointer-events-none" />
            <CardHeader className="pb-1 pt-3 px-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-primary font-bold uppercase tracking-wide">
                  {getRoundLabel(nextMatchToScore.round)} • Match {nextMatchToScore.match_number}
                </span>
                <Badge className="bg-primary/10 text-primary border-none text-[9px] font-semibold animate-pulse">
                  Ready to Score
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-2">
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-2 mt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSelectWinner(nextMatchToScore, 'p1')}
                    disabled={savingId !== null}
                    className="justify-between border-zinc-800 hover:border-emerald-500/35 hover:bg-emerald-500/5 hover:text-emerald-400 group transition-all text-xs py-2 px-3 text-left font-semibold text-zinc-200"
                  >
                    <span className="truncate max-w-[140px]">{nextMatchToScore.player1_name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 group-hover:text-emerald-400 font-normal">Won Match</span>
                  </Button>

                  <div className="text-center flex items-center justify-center gap-2">
                    <span className="h-px bg-zinc-850 flex-1" />
                    <span className="text-[9px] text-zinc-650 font-bold uppercase tracking-widest font-mono">VS (BEST OF 3)</span>
                    <span className="h-px bg-zinc-850 flex-1" />
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSelectWinner(nextMatchToScore, 'p2')}
                    disabled={savingId !== null}
                    className="justify-between border-zinc-800 hover:border-emerald-500/35 hover:bg-emerald-500/5 hover:text-emerald-400 group transition-all text-xs py-2 px-3 text-left font-semibold text-zinc-200"
                  >
                    <span className="truncate max-w-[140px]">{nextMatchToScore.player2_name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 group-hover:text-emerald-400 font-normal">Won Match</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="p-4 rounded-xl border border-zinc-900/60 bg-zinc-950/20 border-dashed text-center flex flex-col items-center justify-center min-h-[140px] opacity-75">
            <span className="text-lg">🎯</span>
            <h4 className="text-zinc-400 font-semibold text-xs mt-1.5">No Match Ready</h4>
            <p className="text-zinc-600 text-[10px] max-w-[180px] mt-0.5">
              All matches in this room are scored, or waiting for previous rounds.
            </p>
          </div>
        )}
      </div>

      {/* Room Fixtures List */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
          Room Fixtures History
        </span>
        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
          {roomMatches.map(m => {
            const isCompleted = m.status === 'completed'
            const isReady = m.status === 'pending' && m.player1_id && m.player2_id
            const isLocked = m.status === 'pending' && (!m.player1_id || !m.player2_id)
            const p1IsWinner = isCompleted && m.winner_id === m.player1_id
            const p2IsWinner = isCompleted && m.winner_id === m.player2_id

            return (
              <div 
                key={m.id}
                className={cn(
                  "p-2.5 rounded-lg border text-xs transition-all",
                  isCompleted && "border-zinc-900 bg-zinc-950/30",
                  isReady && "border-primary/20 bg-primary/5",
                  isLocked && "border-zinc-900 bg-zinc-950/10 opacity-50"
                )}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] text-zinc-500 font-semibold">
                    {getRoundLabel(m.round)} • Match {m.match_number}
                  </span>
                  
                  {isCompleted && (
                    <div className="flex items-center gap-1.5">
                      <Badge className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10 border-none text-[8px] py-0 px-1 font-semibold">
                        Scored
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleResetMatch(m.id)}
                        disabled={savingId !== null}
                        className="w-4 h-4 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded"
                        title="Reset match result"
                      >
                        <Undo2 className="w-2.5 h-2.5" />
                      </Button>
                    </div>
                  )}

                  {isReady && (
                    <Badge className="bg-primary/10 text-primary border-none text-[8px] py-0 px-1 font-semibold">
                      Ready
                    </Badge>
                  )}

                  {isLocked && (
                    <Badge variant="outline" className="border-zinc-800 text-zinc-650 text-[8px] py-0 px-1">
                      Locked
                    </Badge>
                  )}
                </div>

                {/* Matchup names */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "font-semibold truncate max-w-[150px]",
                      p1IsWinner ? "text-emerald-400" : "text-zinc-400",
                      isLocked && !m.player1_name && "text-zinc-650 italic font-normal"
                    )}>
                      {m.player1_name || 'TBD'}
                    </span>
                    {isCompleted && (
                      <span className={cn("font-mono font-bold", p1IsWinner ? "text-emerald-400" : "text-zinc-600")}>
                        {p1IsWinner ? 'W' : 'L'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "font-semibold truncate max-w-[150px]",
                      p2IsWinner ? "text-emerald-400" : "text-zinc-400",
                      isLocked && !m.player2_name && "text-zinc-650 italic font-normal"
                    )}>
                      {m.player2_name || 'TBD'}
                    </span>
                    {isCompleted && (
                      <span className={cn("font-mono font-bold", p2IsWinner ? "text-emerald-400" : "text-zinc-600")}>
                        {p2IsWinner ? 'W' : 'L'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
