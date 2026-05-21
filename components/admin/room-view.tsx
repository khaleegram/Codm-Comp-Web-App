'use client'

import { useState } from 'react'
import { useTournament } from '@/components/tournament-provider'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { needsGame3, determineMatchWinner, getMatchRoomNumber } from '@/lib/types'
import type { Match } from '@/lib/types'
import { cn } from '@/lib/utils'

export function AdminRoomView() {
  const { matches } = useTournament()

  const rooms = [1, 2, 3, 4]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Parallel Room Administration</h2>
        <p className="text-muted-foreground text-xs mt-1">
          Monitor and record results for all 4 rooms. Matches are auto-assigned to specific rooms to allow players to queue in advance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {rooms.map(roomNum => {
          const activeMatch = matches.find(m => m.status === 'in_progress' && getMatchRoomNumber(m) === roomNum)
          const nextPending = matches.filter(m => m.status === 'pending' && m.player1_id && m.player2_id && getMatchRoomNumber(m) === roomNum)
            .sort((a, b) => a.round - b.round || a.match_number - b.match_number)[0]

          if (activeMatch) {
            return (
              <ActiveRoomCard 
                key={activeMatch.id} 
                match={activeMatch} 
                roomNum={roomNum} 
              />
            )
          }

          if (nextPending) {
            return (
              <PendingRoomCard 
                key={nextPending.id} 
                match={nextPending} 
                roomNum={roomNum} 
              />
            )
          }

          return (
            <EmptyRoomCard 
              key={roomNum} 
              roomNum={roomNum} 
            />
          )
        })}
      </div>
    </div>
  )
}

function ActiveRoomCard({ match, roomNum }: { match: Match; roomNum: number }) {
  const [scores, setScores] = useState({
    game1_p1: match.game1_p1_score ?? '',
    game1_p2: match.game1_p2_score ?? '',
    game2_p1: match.game2_p1_score ?? '',
    game2_p2: match.game2_p2_score ?? '',
    game3_p1: match.game3_p1_score ?? '',
    game3_p2: match.game3_p2_score ?? '',
  })
  const [saving, setSaving] = useState(false)
  const { refreshData, matches, tournamentState } = useTournament()
  const supabase = createClient()

  const currentScores = {
    game1_p1_score: scores.game1_p1 === '' ? null : Number(scores.game1_p1),
    game1_p2_score: scores.game1_p2 === '' ? null : Number(scores.game1_p2),
    game2_p1_score: scores.game2_p1 === '' ? null : Number(scores.game2_p1),
    game2_p2_score: scores.game2_p2 === '' ? null : Number(scores.game2_p2),
    game3_p1_score: scores.game3_p1 === '' ? null : Number(scores.game3_p1),
    game3_p2_score: scores.game3_p2 === '' ? null : Number(scores.game3_p2),
  }

  const showGame3 = needsGame3(currentScores)
  const matchWinner = determineMatchWinner(currentScores)

  const saveScores = async () => {
    setSaving(true)
    await supabase
      .from('matches')
      .update({
        game1_p1_score: currentScores.game1_p1_score,
        game1_p2_score: currentScores.game1_p2_score,
        game2_p1_score: currentScores.game2_p1_score,
        game2_p2_score: currentScores.game2_p2_score,
        game3_p1_score: currentScores.game3_p1_score,
        game3_p2_score: currentScores.game3_p2_score,
      })
      .eq('id', match.id)
    await refreshData()
    setSaving(false)
  }

  const completeMatch = async () => {
    if (!matchWinner) return
    setSaving(true)
    
    const winnerId = matchWinner === 'p1' ? match.player1_id : match.player2_id
    const winnerName = matchWinner === 'p1' ? match.player1_name : match.player2_name
    
    await supabase
      .from('matches')
      .update({
        game1_p1_score: currentScores.game1_p1_score,
        game1_p2_score: currentScores.game1_p2_score,
        game2_p1_score: currentScores.game2_p1_score,
        game2_p2_score: currentScores.game2_p2_score,
        game3_p1_score: currentScores.game3_p1_score,
        game3_p2_score: currentScores.game3_p2_score,
        winner_id: winnerId,
        status: 'completed',
      })
      .eq('id', match.id)

    // Propagate winner to next round
    const nextRound = match.round + 1
    
    if (nextRound <= 5) {
      const nextMatchNumber = Math.ceil(match.match_number / 2)
      const isPlayer1 = match.match_number % 2 === 1
      
      const nextMatch = matches.find(
        m => m.round === nextRound && m.match_number === nextMatchNumber
      )
      
      if (nextMatch) {
        const updateData = isPlayer1
          ? { player1_id: winnerId, player1_name: winnerName }
          : { player2_id: winnerId, player2_name: winnerName }
        
        await supabase
          .from('matches')
          .update(updateData)
          .eq('id', nextMatch.id)
      }
    } else if (match.round === 5) {
      await supabase
        .from('tournament_state')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', tournamentState?.id || '00000000-0000-0000-0000-000000000000')
    }
    
    // Mark loser as eliminated
    const loserId = matchWinner === 'p1' ? match.player2_id : match.player1_id
    if (loserId) {
      await supabase
        .from('players')
        .update({ eliminated: true })
        .eq('id', loserId)
    }

    await refreshData()
    setSaving(false)
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
    <Card className="border-primary bg-zinc-950/80 backdrop-blur flex flex-col justify-between min-h-[360px] shadow-lg shadow-primary/5">
      <CardHeader className="pb-2 border-b border-zinc-900/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-white font-bold">
            Room {roomNum}
          </CardTitle>
          <Badge className="bg-red-600 hover:bg-red-600 animate-pulse text-white border-none text-[10px]">LIVE</Badge>
        </div>
        <CardDescription className="text-xs text-zinc-500 mt-1">
          {getRoundLabel(match.round)} M{match.match_number}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-4 flex-grow">
        {/* Players header */}
        <div className="grid grid-cols-2 gap-4 text-center pb-2 border-b border-zinc-900/30">
          <div className={cn("text-xs font-semibold text-zinc-400 truncate px-1", matchWinner === 'p1' && 'text-emerald-400 font-bold bg-emerald-500/5 py-0.5 rounded border border-emerald-500/10')}>
            {match.player1_name || 'TBD'}
          </div>
          <div className={cn("text-xs font-semibold text-zinc-400 truncate px-1", matchWinner === 'p2' && 'text-emerald-400 font-bold bg-emerald-500/5 py-0.5 rounded border border-emerald-500/10')}>
            {match.player2_name || 'TBD'}
          </div>
        </div>

        {/* Game 1 */}
        <div className="space-y-1">
          <Label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Game 1 (Sniper)</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="P1 Score"
              className="bg-zinc-900 border-zinc-800 text-white placeholder-zinc-700 h-8 text-xs"
              value={scores.game1_p1}
              onChange={(e) => setScores(s => ({ ...s, game1_p1: e.target.value }))}
            />
            <Input
              type="number"
              placeholder="P2 Score"
              className="bg-zinc-900 border-zinc-800 text-white placeholder-zinc-700 h-8 text-xs"
              value={scores.game1_p2}
              onChange={(e) => setScores(s => ({ ...s, game1_p2: e.target.value }))}
            />
          </div>
        </div>

        {/* Game 2 */}
        <div className="space-y-1">
          <Label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Game 2 (Shotgun)</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="P1 Score"
              className="bg-zinc-900 border-zinc-800 text-white placeholder-zinc-700 h-8 text-xs"
              value={scores.game2_p1}
              onChange={(e) => setScores(s => ({ ...s, game2_p1: e.target.value }))}
            />
            <Input
              type="number"
              placeholder="P2 Score"
              className="bg-zinc-900 border-zinc-800 text-white placeholder-zinc-700 h-8 text-xs"
              value={scores.game2_p2}
              onChange={(e) => setScores(s => ({ ...s, game2_p2: e.target.value }))}
            />
          </div>
        </div>

        {/* Game 3 */}
        {showGame3 && (
          <div className="space-y-1">
            <Label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Game 3 (Choice)</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="P1 Score"
                className="bg-zinc-900 border-zinc-800 text-white placeholder-zinc-700 h-8 text-xs"
                value={scores.game3_p1}
                onChange={(e) => setScores(s => ({ ...s, game3_p1: e.target.value }))}
              />
              <Input
                type="number"
                placeholder="P2 Score"
                className="bg-zinc-900 border-zinc-800 text-white placeholder-zinc-700 h-8 text-xs"
                value={scores.game3_p2}
                onChange={(e) => setScores(s => ({ ...s, game3_p2: e.target.value }))}
              />
            </div>
          </div>
        )}
      </CardContent>

      <div className="p-4 border-t border-zinc-900 bg-zinc-950/20 flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={saveScores} 
          disabled={saving} 
          className="border-zinc-800 hover:bg-zinc-900 text-zinc-400 text-xs"
        >
          Save
        </Button>
        <Button 
          size="sm" 
          onClick={completeMatch} 
          disabled={!matchWinner || saving}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
        >
          {matchWinner ? `${matchWinner === 'p1' ? match.player1_name : match.player2_name} Wins` : 'Enter Scores'}
        </Button>
      </div>
    </Card>
  )
}

function PendingRoomCard({ match, roomNum }: { match: Match; roomNum: number }) {
  const [starting, setStarting] = useState(false)
  const { refreshData } = useTournament()
  const supabase = createClient()

  const startMatch = async () => {
    setStarting(true)
    const assignedRoom = getMatchRoomNumber(match)
    await supabase
      .from('matches')
      .update({
        status: 'in_progress',
        room_number: assignedRoom,
      })
      .eq('id', match.id)
    
    await refreshData()
    setStarting(false)
  }

  const getRoundLabel = (r: number) => {
    switch (r) {
      case 1: return 'Round of 32'
      case 2: return 'Round of 16'
      case 3: return 'Quarterfinals'
      case 4: return 'Semifinals'
      case 5: return 'Grand Final'
      default: return `Round ${r}`
    }
  }

  return (
    <Card className="bg-zinc-950/40 border-zinc-800 backdrop-blur flex flex-col justify-between h-[360px]">
      <CardHeader className="pb-2 border-b border-zinc-900">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-zinc-300 font-bold">
            Room {roomNum}
          </CardTitle>
          <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/5 text-[10px]">
            PENDING
          </Badge>
        </div>
        <CardDescription className="text-xs text-zinc-500 mt-1">
          {getRoundLabel(match.round)} M{match.match_number}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="py-6 flex-grow flex flex-col justify-center">
        <div className="text-center py-4 bg-zinc-900/30 rounded-xl border border-zinc-900 space-y-3">
          <span className="font-semibold text-white text-base block truncate px-2">{match.player1_name}</span>
          <span className="text-primary text-xs font-bold tracking-wider uppercase block bg-primary/5 py-1 w-fit mx-auto px-3 rounded-full border border-primary/10">VS</span>
          <span className="font-semibold text-white text-base block truncate px-2">{match.player2_name}</span>
        </div>
      </CardContent>
      
      <div className="p-4 border-t border-zinc-900 bg-zinc-950/20">
        <Button 
          onClick={startMatch} 
          disabled={starting} 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all duration-200"
        >
          {starting ? 'Starting...' : 'Activate Match'}
        </Button>
      </div>
    </Card>
  )
}

function EmptyRoomCard({ roomNum }: { roomNum: number }) {
  return (
    <Card className="bg-zinc-950/10 border-zinc-900/50 border-dashed backdrop-blur flex flex-col justify-between h-[360px] opacity-60">
      <CardHeader className="pb-2 border-b border-zinc-900/20">
        <CardTitle className="text-base text-zinc-500 font-bold">
          Room {roomNum}
        </CardTitle>
      </CardHeader>
      <CardContent className="py-6 flex-grow flex flex-col justify-center items-center text-center">
        <div className="rounded-full bg-zinc-900/30 p-4 mb-3 border border-zinc-850">
          <span className="text-xl">💤</span>
        </div>
        <h4 className="text-zinc-400 font-semibold text-sm">Room is Dormant</h4>
        <p className="text-zinc-600 text-xs mt-1 max-w-[180px]">
          No pending matches are currently scheduled for this room.
        </p>
      </CardContent>
      <div className="p-4 border-t border-zinc-900/20 bg-zinc-950/5">
        <Button disabled className="w-full bg-zinc-900 border border-zinc-850 text-zinc-600 cursor-not-allowed text-xs">
          Waiting for bracket
        </Button>
      </div>
    </Card>
  )
}
