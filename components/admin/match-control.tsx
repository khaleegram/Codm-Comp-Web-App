'use client'

import { useTournament } from '@/components/tournament-provider'
import { MatchCard } from '@/components/match-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

export function AdminMatchControl() {
  const { matches } = useTournament()

  const rounds = [
    { value: '1', label: 'Round of 32', shortLabel: 'R32', matchCount: 16 },
    { value: '2', label: 'Round of 16', shortLabel: 'R16', matchCount: 8 },
    { value: '3', label: 'Quarterfinals', shortLabel: 'QF', matchCount: 4 },
    { value: '4', label: 'Semifinals', shortLabel: 'SF', matchCount: 2 },
    { value: '5', label: 'Grand Final', shortLabel: 'GF', matchCount: 1 },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Tournament Bracket Matches</h2>
      
      <Tabs defaultValue="1">
        <TabsList className="bg-zinc-950 border border-zinc-800 p-1">
          {rounds.map(round => {
            const roundMatches = matches.filter(m => m.round === Number(round.value))
            const completed = roundMatches.filter(m => m.status === 'completed').length
            return (
              <TabsTrigger 
                key={round.value} 
                value={round.value}
                className="text-zinc-400 data-[state=active]:bg-zinc-900 data-[state=active]:text-white"
              >
                <span className="hidden sm:inline">{round.label}</span>
                <span className="sm:hidden">{round.shortLabel}</span>
                <span className="ml-2 text-xs opacity-70">
                  {completed}/{round.matchCount}
                </span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        {rounds.map(round => {
          const roundMatches = matches.filter(m => m.round === Number(round.value))
          
          return (
            <TabsContent key={round.value} value={round.value} className="mt-6">
              {round.value === '5' ? (
                <div className="max-w-md mx-auto">
                  {roundMatches.map(match => (
                    <div key={match.id} className="space-y-2 bg-zinc-950/60 p-4 border border-zinc-800 rounded-lg">
                      <div className="text-xs text-zinc-400 flex items-center justify-between">
                        <span>Grand Final Championship Match</span>
                        <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-300">
                          {match.status}
                        </Badge>
                      </div>
                      <MatchCard match={match} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {roundMatches.map(match => (
                    <div key={match.id} className="space-y-2 bg-zinc-950/40 p-3 border border-zinc-800 rounded-lg">
                      <div className="text-xs text-zinc-400 flex items-center justify-between">
                        <span>Match {match.match_number}</span>
                        <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-300">
                          {match.status}
                        </Badge>
                      </div>
                      <MatchCard match={match} isCompact />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
