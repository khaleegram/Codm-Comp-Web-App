'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { 
  Player, 
  Match, 
  TournamentState 
} from '@/lib/types'

interface TournamentContextType {
  // Data
  players: Player[]
  matches: Match[]
  tournamentState: TournamentState | null
  
  // Loading states
  loading: boolean
  
  // Filtered data getters
  getMatchesByRound: (round: number) => Match[]
  getMatchByPosition: (round: number, matchNumber: number) => Match | undefined
  
  // Actions (for admin)
  refreshData: () => Promise<void>
}

const TournamentContext = createContext<TournamentContextType | undefined>(undefined)

export function TournamentProvider({ children }: { children: ReactNode }) {
  const [players, setPlayers] = useState<Player[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [tournamentState, setTournamentState] = useState<TournamentState | null>(null)
  const [loading, setLoading] = useState(true)
  
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    const [
      { data: playersData },
      { data: matchesData },
      { data: stateData },
    ] = await Promise.all([
      supabase.from('players').select('*').order('seed'),
      supabase.from('matches').select('*').order('round').order('match_number'),
      supabase.from('tournament_state').select('*').limit(1).single(),
    ])

    if (playersData) setPlayers(playersData)
    if (matchesData) setMatches(matchesData)
    if (stateData) setTournamentState(stateData)
    
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchData()

    // Set up realtime subscriptions
    const playersChannel = supabase
      .channel('players-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => {
        fetchData()
      })
      .subscribe()

    const matchesChannel = supabase
      .channel('matches-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        fetchData()
      })
      .subscribe()

    const stateChannel = supabase
      .channel('state-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_state' }, () => {
        fetchData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(playersChannel)
      supabase.removeChannel(matchesChannel)
      supabase.removeChannel(stateChannel)
    }
  }, [fetchData, supabase])

  const getMatchesByRound = useCallback((round: number) => {
    return matches.filter(m => m.round === round)
  }, [matches])

  const getMatchByPosition = useCallback((round: number, matchNumber: number) => {
    return matches.find(m => m.round === round && m.match_number === matchNumber)
  }, [matches])

  return (
    <TournamentContext.Provider
      value={{
        players,
        matches,
        tournamentState,
        loading,
        getMatchesByRound,
        getMatchByPosition,
        refreshData: fetchData,
      }}
    >
      {children}
    </TournamentContext.Provider>
  )
}

export function useTournament() {
  const context = useContext(TournamentContext)
  if (context === undefined) {
    throw new Error('useTournament must be used within a TournamentProvider')
  }
  return context
}
