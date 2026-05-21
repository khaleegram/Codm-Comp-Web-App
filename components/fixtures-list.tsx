'use client'

import { useState, useMemo } from 'react'
import { useTournament } from '@/components/tournament-provider'
import { countGamesWon } from '@/components/match-card'
import type { Match } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { 
  Search, 
  Share2, 
  Trophy, 
  Tv, 
  Gamepad2, 
  ChevronDown, 
  ChevronUp, 
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function FixturesList() {
  const { matches, players } = useTournament()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRound, setSelectedRound] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null)

  // Compute stats
  const totalMatches = matches.length
  const completedMatches = matches.filter(m => m.status === 'completed').length
  const liveMatches = matches.filter(m => m.status === 'in_progress').length
  const upcomingMatches = matches.filter(m => m.status === 'pending' && m.player1_id && m.player2_id).length
  const percentComplete = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0

  // Standard round helper
  const getRoundName = (roundNum: number) => {
    switch (roundNum) {
      case 1: return 'Round of 32'
      case 2: return 'Round of 16'
      case 3: return 'Quarterfinals'
      case 4: return 'Semifinals'
      case 5: return 'Grand Final'
      default: return `Round ${roundNum}`
    }
  }

  // Filter logic
  const filteredFixtures = useMemo(() => {
    return matches.filter((match) => {
      // 1. Search Query Filter
      const p1 = (match.player1_name || '').toLowerCase()
      const p2 = (match.player2_name || '').toLowerCase()
      const query = searchQuery.toLowerCase()
      const matchesSearch = p1.includes(query) || p2.includes(query)

      if (!matchesSearch) return false

      // 2. Status Filter
      if (selectedStatus !== 'all' && match.status !== selectedStatus) {
        return false
      }

      // 3. Round Filter
      if (selectedRound !== 'all' && String(match.round) !== selectedRound) {
        return false
      }

      return true
    })
  }, [matches, searchQuery, selectedRound, selectedStatus])

  const toggleExpand = (id: string) => {
    setExpandedMatchId(prev => (prev === id ? null : id))
  }

  const handleShare = async (match: Match) => {
    const stageName = getRoundName(match.round)

    const p1Name = match.player1_name || 'TBD'
    const p2Name = match.player2_name || 'TBD'

    const p1Wins = countGamesWon(match, 'p1')
    const p2Wins = countGamesWon(match, 'p2')

    let statusText = ''
    let scoreText = ''

    if (match.status === 'completed') {
      const winnerName = match.winner_id === match.player1_id ? p1Name : p2Name
      statusText = `✅ Completed • Winner: ${winnerName}`
      scoreText = `📊 Final Score: ${p1Name} [${p1Wins}] - [${p2Wins}] ${p2Name}`
    } else if (match.status === 'in_progress') {
      statusText = `🔴 LIVE • Room ${match.room_number || 'TBD'}`
      scoreText = `📊 Current Score: ${p1Name} [${p1Wins}] - [${p2Wins}] ${p2Name}`
    } else {
      statusText = `⏳ Upcoming`
      scoreText = `⚔️ Matchup: ${p1Name} vs ${p2Name}`
    }

    // Detail scores
    let details = ''
    if (match.status === 'completed' || match.status === 'in_progress') {
      const gameScores = []
      if (match.game1_p1_score !== null && match.game1_p2_score !== null) {
        gameScores.push(`   • Game 1 (Sniper): ${match.game1_p1_score} - ${match.game1_p2_score}`)
      }
      if (match.game2_p1_score !== null && match.game2_p2_score !== null) {
        gameScores.push(`   • Game 2 (Shotgun): ${match.game2_p1_score} - ${match.game2_p2_score}`)
      }
      if (match.game3_p1_score !== null && match.game3_p2_score !== null) {
        gameScores.push(`   • Game 3 (Choice): ${match.game3_p1_score} - ${match.game3_p2_score}`)
      }
      if (gameScores.length > 0) {
        details = `\n🎮 Game Details:\n${gameScores.join('\n')}`
      }
    }

    const shareText = `🏆 Arewa Hausa CODM Community Competition 🏆
━━━━━━━━━━━━━━━━━━━━━━━━
📅 Stage: ${stageName}
${scoreText}
${statusText}${details}
━━━━━━━━━━━━━━━━━━━━━━━━
Join/follow live brackets at: ${window.location.origin}`

    try {
      await navigator.clipboard.writeText(shareText)
      toast.success('Match details copied to clipboard!', {
        description: 'You can now paste and share this with your members.'
      })
    } catch (_err) {
      toast.error('Failed to copy match details.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-zinc-900 bg-zinc-950/40 backdrop-blur-sm flex flex-col justify-between min-h-[100px]">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Total Progress</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-white">{percentComplete}%</span>
            <span className="text-xs text-zinc-400">({completedMatches}/{totalMatches})</span>
          </div>
          <div className="w-full bg-zinc-900 h-1.5 rounded-full mt-3 overflow-hidden border border-zinc-850">
            <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${percentComplete}%` }} />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-900 bg-zinc-950/40 backdrop-blur-sm flex flex-col justify-between min-h-[100px]">
          <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" /> Live Now
          </span>
          <div className="text-2xl font-bold text-white mt-2">{liveMatches}</div>
          <span className="text-xs text-zinc-500 mt-1">Matches in progress</span>
        </div>

        <div className="p-4 rounded-xl border border-zinc-900 bg-zinc-950/40 backdrop-blur-sm flex flex-col justify-between min-h-[100px]">
          <span className="text-[10px] text-yellow-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
            ⚔️ Ready to Play
          </span>
          <div className="text-2xl font-bold text-white mt-2">{upcomingMatches}</div>
          <span className="text-xs text-zinc-500 mt-1">Pending matchups ready</span>
        </div>

        <div className="p-4 rounded-xl border border-zinc-900 bg-zinc-950/40 backdrop-blur-sm flex flex-col justify-between min-h-[100px]">
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            🏆 Winner
          </span>
          <div className="text-sm font-bold text-white mt-2 truncate">
            {matches.find(m => m.round === 5 && m.status === 'completed')?.winner_id 
              ? (() => {
                  const m = matches.find(m => m.round === 5 && m.status === 'completed')
                  return m?.winner_id === m?.player1_id ? m?.player1_name : m?.player2_name
                })()
              : 'TBD'}
          </div>
          <span className="text-xs text-zinc-500 mt-1">Championship crown</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="p-4 rounded-xl border border-zinc-900 bg-zinc-950/20 backdrop-blur-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search player name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-zinc-900/50 border-zinc-800 focus-visible:ring-primary text-white"
            />
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-48">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="bg-zinc-900/50 border-zinc-800 text-zinc-300">
                <SelectValue placeholder="Match Status" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-300">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="in_progress">Live</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Upcoming</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Round Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none border-t border-zinc-900/55">
          {[
            { id: 'all', label: 'All Rounds' },
            { id: '1', label: 'Round of 32' },
            { id: '2', label: 'Round of 16' },
            { id: '3', label: 'Quarterfinals' },
            { id: '4', label: 'Semifinals' },
            { id: '5', label: 'Grand Final' },
          ].map((r) => (
            <Button
              key={r.id}
              variant={selectedRound === r.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedRound(r.id)}
              className={cn(
                "whitespace-nowrap rounded-full text-xs font-semibold px-4 h-8 transition-all duration-200",
                selectedRound === r.id 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white"
              )}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Fixtures List */}
      {filteredFixtures.length === 0 ? (
        <Card className="border-dashed border-zinc-800 bg-zinc-950/20">
          <CardContent className="py-12 text-center text-zinc-400 flex flex-col items-center justify-center gap-3">
            <Info className="h-8 w-8 text-zinc-500" />
            <div>
              <p className="font-semibold text-lg">No matches found</p>
              <p className="text-sm mt-1">Try adjusting your filters or search query.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredFixtures.map((fixture) => {
            const isMatchLive = fixture.status === 'in_progress'
            const isMatchCompleted = fixture.status === 'completed'
            const p1 = players.find(p => p.id === fixture.player1_id)
            const p2 = players.find(p => p.id === fixture.player2_id)
            const p1Name = fixture.player1_name || 'TBD'
            const p2Name = fixture.player2_name || 'TBD'

            const p1Wins = countGamesWon(fixture, 'p1')
            const p2Wins = countGamesWon(fixture, 'p2')

            const p1IsWinner = fixture.winner_id !== null && fixture.player1_id === fixture.winner_id
            const p2IsWinner = fixture.winner_id !== null && fixture.player2_id === fixture.winner_id

            const isExpanded = expandedMatchId === fixture.id

            return (
              <div 
                key={fixture.id}
                className={cn(
                  "rounded-xl border bg-zinc-950/20 transition-all duration-300 relative overflow-hidden",
                  isMatchLive && "border-primary bg-zinc-900/[0.03] ring-1 ring-primary/20",
                  isMatchCompleted && "border-zinc-800 hover:border-zinc-700 bg-zinc-950/10",
                  !isMatchLive && !isMatchCompleted && "border-zinc-900 bg-zinc-950/5 opacity-80"
                )}
              >
                {/* Visual indicator bar */}
                <div 
                  className={cn(
                    "absolute top-0 left-0 bottom-0 w-1",
                    isMatchLive && "bg-primary animate-pulse",
                    isMatchCompleted && "bg-accent",
                    !isMatchLive && !isMatchCompleted && "bg-zinc-800"
                  )} 
                />

                <div className="p-4 sm:p-5 pl-5 sm:pl-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left Side: Meta & Match Information */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <Badge variant="outline" className="text-zinc-400 bg-zinc-900/50 border-zinc-800">
                        {getRoundName(fixture.round)}
                      </Badge>
                      <Badge variant="outline" className="text-zinc-500 bg-zinc-900/50 border-zinc-800">
                        M{fixture.match_number}
                      </Badge>

                      {isMatchLive && (
                        <Badge className="bg-red-600 hover:bg-red-600 text-white animate-pulse flex items-center gap-1">
                          <Tv className="h-3 w-3" /> LIVE
                        </Badge>
                      )}

                      {isMatchCompleted && (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white flex items-center gap-1">
                          <Trophy className="h-3 w-3" /> Completed
                        </Badge>
                      )}

                      {!isMatchLive && !isMatchCompleted && (
                        <Badge variant="secondary" className="bg-zinc-850 text-zinc-400 border-none">
                          Upcoming
                        </Badge>
                      )}

                      {fixture.room_number && (
                        <span className="text-primary font-semibold flex items-center gap-1 ml-1 text-[11px] sm:text-xs">
                          <Tv className="h-3.5 w-3.5" /> Room {fixture.room_number}
                        </span>
                      )}
                    </div>

                    {/* Team/Player Matchup */}
                    <div className="flex items-center gap-3 sm:gap-6 mt-1.5">
                      {/* Player 1 */}
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-end min-w-0">
                        {p1?.seed && (
                          <span className="text-[9px] font-mono font-semibold text-zinc-400 bg-zinc-900 border border-zinc-800/80 px-1 py-0.5 rounded shadow-sm">
                            #{p1.seed}
                          </span>
                        )}
                        <span 
                          className={cn(
                            "font-bold text-sm sm:text-base truncate text-white",
                            p1IsWinner && "text-emerald-400",
                            p1Name === 'TBD' && "text-zinc-500 italic font-normal"
                          )}
                        >
                          {p1Name}
                        </span>
                        {(isMatchCompleted || isMatchLive) && (
                          <span 
                            className={cn(
                              "font-mono font-bold text-sm px-2 py-0.5 rounded",
                              p1IsWinner ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-zinc-800 text-zinc-400"
                            )}
                          >
                            {p1Wins}
                          </span>
                        )}
                      </div>

                      {/* VS Divider */}
                      <span className="text-zinc-650 text-xs sm:text-sm font-semibold uppercase px-1">
                        VS
                      </span>

                      {/* Player 2 */}
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        {(isMatchCompleted || isMatchLive) && (
                          <span 
                            className={cn(
                              "font-mono font-bold text-sm px-2 py-0.5 rounded",
                              p2IsWinner ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-zinc-800 text-zinc-400"
                            )}
                          >
                            {p2Wins}
                          </span>
                        )}
                        <span 
                          className={cn(
                            "font-bold text-sm sm:text-base truncate text-white",
                            p2IsWinner && "text-emerald-400",
                            p2Name === 'TBD' && "text-zinc-500 italic font-normal"
                          )}
                        >
                          {p2Name}
                        </span>
                        {p2?.seed && (
                          <span className="text-[9px] font-mono font-semibold text-zinc-400 bg-zinc-900 border border-zinc-800/80 px-1 py-0.5 rounded shadow-sm">
                            #{p2.seed}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Action buttons */}
                  <div className="flex items-center gap-2 self-end md:self-center">
                    {(isMatchLive || isMatchCompleted) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(fixture.id)}
                        className="text-zinc-400 hover:text-white hover:bg-zinc-900/40"
                      >
                        {isExpanded ? (
                          <>Hide Scores <ChevronUp className="ml-1 h-4 w-4" /></>
                        ) : (
                          <>Show Scores <ChevronDown className="ml-1 h-4 w-4" /></>
                        )}
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShare(fixture)}
                      className="border-zinc-800 hover:bg-zinc-900/50 text-zinc-400 hover:text-white"
                    >
                      <Share2 className="h-3.5 w-3.5 sm:mr-1.5" />
                      <span className="hidden sm:inline">Share</span>
                    </Button>
                  </div>
                </div>

                {/* Collapsible Game Scores Panel */}
                {isExpanded && (isMatchLive || isMatchCompleted) && (
                  <div className="border-t border-zinc-850 bg-black/20 p-4 pl-6 animate-in slide-in-from-top-1 duration-200">
                    <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Gamepad2 className="h-3.5 w-3.5 text-primary" /> Game Breakdowns
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Game 1: Sniper */}
                      <GameBreakdownBox 
                        label="Game 1 (Sniper)"
                        p1Score={fixture.game1_p1_score}
                        p2Score={fixture.game1_p2_score}
                        p1Name={p1Name}
                        p2Name={p2Name}
                      />

                      {/* Game 2: Shotgun */}
                      <GameBreakdownBox 
                        label="Game 2 (Shotgun)"
                        p1Score={fixture.game2_p1_score}
                        p2Score={fixture.game2_p2_score}
                        p1Name={p1Name}
                        p2Name={p2Name}
                      />

                      {/* Game 3: Choice */}
                      {(fixture.game3_p1_score !== null || fixture.game3_p2_score !== null) ? (
                        <GameBreakdownBox 
                           label="Game 3 (Choice)"
                           p1Score={fixture.game3_p1_score}
                           p2Score={fixture.game3_p2_score}
                           p1Name={p1Name}
                           p2Name={p2Name}
                        />
                      ) : (
                        <div className="p-2.5 rounded-lg border border-zinc-900 bg-zinc-950/20 text-center text-xs text-zinc-500 italic flex items-center justify-center min-h-[72px]">
                          Game 3 not needed
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface GameBreakdownBoxProps {
  label: string
  p1Score: number | null
  p2Score: number | null
  p1Name: string
  p2Name: string
}

function GameBreakdownBox({ label, p1Score, p2Score, p1Name, p2Name }: GameBreakdownBoxProps) {
  if (p1Score === null && p2Score === null) {
    return (
      <div className="p-3 rounded-lg border border-zinc-900 bg-zinc-950/20 flex flex-col justify-center min-h-[72px]">
        <div className="text-xs text-zinc-500 font-medium mb-1">{label}</div>
        <div className="text-xs text-zinc-500/40 italic">Not started</div>
      </div>
    )
  }

  const p1Val = p1Score ?? 0
  const p2Val = p2Score ?? 0
  const p1Won = p1Val > p2Val
  const p2Won = p2Val > p1Val

  return (
    <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-950/40 flex flex-col justify-between min-h-[72px]">
      <div className="text-xs text-zinc-400 font-medium mb-1.5">{label}</div>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5 min-w-0 max-w-[42%]">
            <span className={cn("truncate text-zinc-300", p1Won && "font-bold text-emerald-400")}>{p1Name}</span>
          </div>
          <div className="flex items-center justify-center gap-2 bg-zinc-900/50 px-2 py-0.5 rounded border border-zinc-800 font-mono text-[11px] font-bold text-white">
            <span className={cn(p1Won && "text-emerald-400")}>{p1Score ?? '-'}</span>
            <span className="text-zinc-650">-</span>
            <span className={cn(p2Won && "text-emerald-400")}>{p2Score ?? '-'}</span>
          </div>
          <div className="flex items-center gap-1.5 min-w-0 max-w-[42%] justify-end text-right">
            <span className={cn("truncate text-zinc-300", p2Won && "font-bold text-emerald-400")}>{p2Name}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
