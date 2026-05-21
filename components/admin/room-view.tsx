'use client'

import { useState } from 'react'
import { useTournament } from '@/components/tournament-provider'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { needsGame3, determineMatchWinner } from '@/lib/types'
import type { Match } from '@/lib/types'
import { cn } from '@/lib/utils'

export function AdminRoomView() {
  const { matches, tournamentState } = useTournament()

  const activeMatches = matches.filter(m => m.status === 'in_progress')
  const pendingMatches = matches.filter(m => m.status === 'pending' && m.player1_id && m.player2_id)

  return (
    <div className="space-y-8">
      {/* Active Rooms */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-white">Active Rooms ({activeMatches.length}/4)</h2>
        {activeMatches.length === 0 ? (
          <Card className="border-zinc-800 bg-zinc-950/50 backdrop-blur">
            <CardContent className="py-8 text-center text-zinc-400">
              No matches currently in progress. Start a match from the pending list below.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {activeMatches.map(match => (
              <RoomMatchCard key={match.id} match={match} />
            ))}
          </div>
        )}
      </div>

      {/* Pending Matches */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-white">Ready to Start ({pendingMatches.length})</h2>
        {pendingMatches.length === 0 ? (
          <Card className="border-zinc-800 bg-zinc-950/50 backdrop-blur">
            <CardContent className="py-8 text-center text-zinc-400">
              No matches ready to start. Complete current matches to unlock the next round.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {pendingMatches.map(match => (
              <PendingMatchCard key={match.id} match={match} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RoomMatchCard({ match }: { match: Match }) {
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
        room_number: null,
      })
      .eq('id', match.id)

    // Propagate winner to next round
    const nextRound = match.round + 1
    
    if (nextRound <= 5) {
      // Parent node formulas:
      // Matchups are paired sequentially: M1 & M2 -> Next M1, M3 & M4 -> Next M2, etc.
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
      // Grand Final is completed, mark tournament as completed
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

  // Helper to describe the round name
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
    <Card className="border-primary bg-zinc-950/80 backdrop-blur">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-white">
            {match.room_number && `Room ${match.room_number}`}
            <span className="ml-2 text-zinc-400 font-normal">
              {getRoundLabel(match.round)} M{match.match_number}
            </span>
          </CardTitle>
          <Badge className="bg-red-600 hover:bg-red-600 animate-pulse text-white border-none">LIVE</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Players */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className={cn("text-zinc-300 truncate text-sm", matchWinner === 'p1' && 'text-emerald-400 font-bold')}>
            {match.player1_name || 'TBD'}
          </div>
          <div className={cn("text-zinc-300 truncate text-sm", matchWinner === 'p2' && 'text-emerald-400 font-bold')}>
            {match.player2_name || 'TBD'}
          </div>
        </div>

        {/* Game 1 - Sniper */}
        <div className="space-y-1">
          <Label className="text-xs text-zinc-400 font-medium">Game 1 (Sniper)</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="P1"
              className="bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500"
              value={scores.game1_p1}
              onChange={(e) => setScores(s => ({ ...s, game1_p1: e.target.value }))}
            />
            <Input
              type="number"
              placeholder="P2"
              className="bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500"
              value={scores.game1_p2}
              onChange={(e) => setScores(s => ({ ...s, game1_p2: e.target.value }))}
            />
          </div>
        </div>

        {/* Game 2 - Shotgun */}
        <div className="space-y-1">
          <Label className="text-xs text-zinc-400 font-medium">Game 2 (Shotgun)</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="P1"
              className="bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500"
              value={scores.game2_p1}
              onChange={(e) => setScores(s => ({ ...s, game2_p1: e.target.value }))}
            />
            <Input
              type="number"
              placeholder="P2"
              className="bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500"
              value={scores.game2_p2}
              onChange={(e) => setScores(s => ({ ...s, game2_p2: e.target.value }))}
            />
          </div>
        </div>

        {/* Game 3 - Choice (if needed) */}
        {showGame3 && (
          <div className="space-y-1">
            <Label className="text-xs text-zinc-400 font-medium">Game 3 (Choice)</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="P1"
                className="bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500"
                value={scores.game3_p1}
                onChange={(e) => setScores(s => ({ ...s, game3_p1: e.target.value }))}
              />
              <Input
                type="number"
                placeholder="P2"
                className="bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500"
                value={scores.game3_p2}
                onChange={(e) => setScores(s => ({ ...s, game3_p2: e.target.value }))}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={saveScores} disabled={saving} className="border-zinc-800 hover:bg-zinc-900 text-zinc-300">
            Save
          </Button>
          <Button 
            size="sm" 
            onClick={completeMatch} 
            disabled={!matchWinner || saving}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {matchWinner ? `${matchWinner === 'p1' ? match.player1_name : match.player2_name} Wins` : 'Enter Scores'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function PendingMatchCard({ match }: { match: Match }) {
  const [room, setRoom] = useState<string>('')
  const [starting, setStarting] = useState(false)
  const { refreshData, matches } = useTournament()
  const supabase = createClient()

  const usedRooms = matches
    .filter(m => m.status === 'in_progress' && m.room_number)
    .map(m => m.room_number)
    .filter(Boolean) as number[]

  const availableRooms = [1, 2, 3, 4].filter(r => !usedRooms.includes(r))

  const startMatch = async () => {
    if (!room) return
    setStarting(true)
    
    await supabase
      .from('matches')
      .update({
        status: 'in_progress',
        room_number: Number(room),
      })
      .eq('id', match.id)
    
    await refreshData()
    setStarting(false)
  }

  // Helper to describe the round name
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
    <Card className="bg-zinc-950/60 border-zinc-800 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-zinc-300 font-semibold">
          {getRoundLabel(match.round)} M{match.match_number}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center py-2 bg-zinc-900/40 rounded border border-zinc-850">
          <span className="font-semibold text-white text-sm block truncate">{match.player1_name}</span>
          <span className="text-zinc-500 text-xs block my-1">vs</span>
          <span className="font-semibold text-white text-sm block truncate">{match.player2_name}</span>
        </div>

        <div className="flex gap-2">
          <Select value={room} onValueChange={setRoom}>
            <SelectTrigger className="flex-1 bg-zinc-900 border-zinc-800 text-zinc-300">
              <SelectValue placeholder="Select room" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-300">
              {availableRooms.length === 0 ? (
                <SelectItem value="" disabled>All rooms in use</SelectItem>
              ) : (
                availableRooms.map(r => (
                  <SelectItem key={r} value={String(r)}>Room {r}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button onClick={startMatch} disabled={!room || starting || availableRooms.length === 0} className="bg-blue-600 hover:bg-blue-700 text-white">
            Start
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
