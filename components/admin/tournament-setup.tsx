'use client'

import { useState } from 'react'
import { useTournament } from '@/components/tournament-provider'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { BRACKET_MATCHUPS } from '@/lib/types'

export function AdminTournamentSetup() {
  const { tournamentState, players, refreshData } = useTournament()
  const [playerNames, setPlayerNames] = useState<Record<number, string>>({})
  const [randomizeOnStart, setRandomizeOnStart] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const shuffleDraw = () => {
    // Collect all entered names, or generate default names if none exist
    let names = Object.values(playerNames).map(n => n.trim()).filter(Boolean)
    if (names.length === 0) {
      names = [
        "4X.JØKER99",
        "卂ÏG_ZAMØMENT",
        "十么IMẞঐT十",
        "卂ÏG_Mërleeñ",
        "ð千ŵ丨BOT",
        "Åkt_ÅBØKÏ",
        "ƝK・ŁÃDÃÑ",
        "DE乂 Joyboy",
        "DE乂YÆNŚĶII",
        "£ŚPÂĎÃ~~*",
        "ƝK・Haleefa72",
        "Åkt_Bäñdit",
        "會SOULTAKER多",
        "4X.AMEER520",
        "卂ÏG_Abubakar",
        "DE乂 Papillon",
        "Sheikh.unknown",
        "X7 | shred",
        "Ɓ¹・Bagani",
        "Psycho",
        "ĦĪM¿",
        "Akt-Itachi",
        "Holywah",
        "Åkt_CR7ঐ",
        "ঐ么SIIYAঐ",
        "X7 | Maajarh",
        "Badkiller:",
        "X7 | Xkiller",
        "d乇.A_AUTA",
        "ª乇・¿? MOH¿?",
        "KIƦA",
        "Åkt_GĦOST"
      ]
    }
    
    // Fill up to 32 players with TBD slots
    const totalSlots = 32
    while (names.length < totalSlots) {
      names.push(`TBD ${names.length + 1}`)
    }
    
    // Fisher-Yates shuffle
    const shuffled = [...names]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    // Re-populate the playerNames map
    const newDefaults: Record<number, string> = {}
    for (let seed = 1; seed <= 32; seed++) {
      newDefaults[seed] = shuffled[seed - 1]
    }
    setPlayerNames(newDefaults)
  }

  const generateDefaultPlayers = () => {
    const predefinedPlayers = [
      "4X.JØKER99",
      "卂ÏG_ZAMØMENT",
      "十么IMẞঐT十",
      "卂ÏG_Mërleeñ",
      "ð千ŵ丨BOT",
      "Åkt_ÅBØKÏ",
      "ƝK・ŁÃDÃÑ",
      "DE乂 Joyboy",
      "DE乂YÆNŚĶII",
      "£ŚPÂĎÃ~~*",
      "ƝK・Haleefa72",
      "Åkt_Bäñdit",
      "會SOULTAKER多",
      "4X.AMEER520",
      "卂ÏG_Abubakar",
      "DE乂 Papillon",
      "Sheikh.unknown",
      "X7 | shred",
      "Ɓ¹・Bagani",
      "Psycho",
      "ĦĪM¿",
      "Akt-Itachi",
      "Holywah",
      "Åkt_CR7ঐ",
      "ঐ么SIIYAঐ",
      "X7 | Maajarh",
      "Badkiller:",
      "X7 | Xkiller",
      "d乇.A_AUTA",
      "ª乇・¿? MOH¿?",
      "KIƦA",
      "Åkt_GĦOST"
    ]
    const defaults: Record<number, string> = {}
    for (let seed = 1; seed <= 32; seed++) {
      defaults[seed] = predefinedPlayers[seed - 1] || `Player ${seed}`
    }
    setPlayerNames(defaults)
  }

  const handlePlayerNameChange = (seed: number, name: string) => {
    setPlayerNames(prev => ({
      ...prev,
      [seed]: name
    }))
  }

  const initializeTournament = async () => {
    setLoading(true)
    setError(null)

    try {
      // Clear existing data (only tables in schema)
      const { error: deleteMatchesErr } = await supabase.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (deleteMatchesErr) throw deleteMatchesErr

      const { error: deletePlayersErr } = await supabase.from('players').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (deletePlayersErr) throw deletePlayersErr

      // Insert players
      const playerNamesList: string[] = []
      for (let seed = 1; seed <= 32; seed++) {
        playerNamesList.push(playerNames[seed] || `Player ${seed}`)
      }

      if (randomizeOnStart) {
        for (let i = playerNamesList.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [playerNamesList[i], playerNamesList[j]] = [playerNamesList[j], playerNamesList[i]]
        }
      }

      const playersToInsert: Array<{ name: string; seed: number }> = []
      for (let i = 0; i < 32; i++) {
        playersToInsert.push({ name: playerNamesList[i], seed: i + 1 })
      }

      const { data: insertedPlayers, error: playersError } = await supabase
        .from('players')
        .insert(playersToInsert)
        .select()

      if (playersError) throw playersError

      // Create matches for the 5-round bracket tree
      const matchesToInsert: Array<{
        round: number
        match_number: number
        player1_id: string | null
        player2_id: string | null
        player1_name: string | null
        player2_name: string | null
        room_number: number
      }> = []

      // Round 1 (Round of 32): 16 matches using seeded matchups
      BRACKET_MATCHUPS.forEach(({ match, seed1, seed2 }) => {
        const p1 = insertedPlayers?.find(p => p.seed === seed1)
        const p2 = insertedPlayers?.find(p => p.seed === seed2)
        matchesToInsert.push({
          round: 1,
          match_number: match,
          player1_id: p1?.id || null,
          player2_id: p2?.id || null,
          player1_name: p1?.name || null,
          player2_name: p2?.name || null,
          room_number: ((match - 1) % 4) + 1,
        })
      })

      // Round 2 (Round of 16): 8 matches (empty, waiting for winners)
      for (let match = 1; match <= 8; match++) {
        matchesToInsert.push({
          round: 2,
          match_number: match,
          player1_id: null,
          player2_id: null,
          player1_name: null,
          player2_name: null,
          room_number: ((match - 1) % 4) + 1,
        })
      }

      // Round 3 (Quarterfinals): 4 matches
      for (let match = 1; match <= 4; match++) {
        matchesToInsert.push({
          round: 3,
          match_number: match,
          player1_id: null,
          player2_id: null,
          player1_name: null,
          player2_name: null,
          room_number: ((match - 1) % 4) + 1,
        })
      }

      // Round 4 (Semifinals): 2 matches
      for (let match = 1; match <= 2; match++) {
        matchesToInsert.push({
          round: 4,
          match_number: match,
          player1_id: null,
          player2_id: null,
          player1_name: null,
          player2_name: null,
          room_number: ((match - 1) % 4) + 1,
        })
      }

      // Round 5 (Grand Final): 1 match
      matchesToInsert.push({
        round: 5,
        match_number: 1,
        player1_id: null,
        player2_id: null,
        player1_name: null,
        player2_name: null,
        room_number: 1,
      })

      const { error: matchesError } = await supabase.from('matches').insert(matchesToInsert)
      if (matchesError) throw matchesError

      // Update tournament state
      const { error: stateError } = await supabase
        .from('tournament_state')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', tournamentState?.id || '00000000-0000-0000-0000-000000000000')

      if (stateError) throw stateError

      await refreshData()
    } catch (err: any) {
      console.error('Failed to initialize tournament:', err)
      setError(err?.message || err?.details || (err instanceof Error ? err.message : 'Failed to initialize tournament'))
    } finally {
      setLoading(false)
    }
  }

  const resetTournament = async () => {
    setLoading(true)
    setError(null)
    try {
      const { error: deleteMatchesErr } = await supabase.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (deleteMatchesErr) throw deleteMatchesErr

      const { error: deletePlayersErr } = await supabase.from('players').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (deletePlayersErr) throw deletePlayersErr

      const { error: stateError } = await supabase
        .from('tournament_state')
        .update({ status: 'not_started', updated_at: new Date().toISOString() })
        .eq('id', tournamentState?.id || '00000000-0000-0000-0000-000000000000')
      if (stateError) throw stateError
      
      setPlayerNames({})
      await refreshData()
    } catch (err: any) {
      console.error('Failed to reset tournament:', err)
      setError(err?.message || err?.details || (err instanceof Error ? err.message : 'Failed to reset tournament'))
    } finally {
      setLoading(false)
    }
  }

  const isNotStarted = tournamentState?.status === 'not_started'

  return (
    <div className="space-y-8">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tournament Status */}
      <Card>
        <CardHeader>
          <CardTitle>Tournament Status</CardTitle>
          <CardDescription>Current state: {tournamentState?.status?.replace(/_/g, ' ')}</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          {isNotStarted && (
            <Button onClick={initializeTournament} disabled={loading}>
              {loading ? 'Initializing...' : 'Start Tournament'}
            </Button>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={loading}>
                Reset Tournament
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset Tournament?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete all players, matches, and results. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={resetTournament}>Reset</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Player Setup - Only show when not started */}
      {isNotStarted && (
        <Card>
          <CardHeader>
            <CardTitle>Player Setup</CardTitle>
            <CardDescription>Enter names for all 32 players</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-3 items-center justify-between border-b border-zinc-900 pb-4">
              <div className="flex gap-3">
                <Button variant="outline" onClick={generateDefaultPlayers}>
                  Generate Default Names
                </Button>
                <Button variant="secondary" onClick={shuffleDraw} className="bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-white">
                  🎲 Shuffle Draw
                </Button>
              </div>
              <div className="flex items-center gap-2 bg-zinc-950/40 p-2 rounded-lg border border-zinc-900">
                <input
                  type="checkbox"
                  id="randomize"
                  checked={randomizeOnStart}
                  onChange={(e) => setRandomizeOnStart(e.target.checked)}
                  className="rounded border-zinc-800 bg-zinc-900 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                />
                <Label htmlFor="randomize" className="text-xs text-zinc-300 cursor-pointer select-none">
                  Randomize Draw on Start (Fair Seeding)
                </Label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {[...Array(32)].map((_, i) => {
                const seed = i + 1
                return (
                  <div key={seed} className="flex items-center gap-2">
                    <Label className="w-16 text-muted-foreground">Seed {seed}</Label>
                    <Input
                      placeholder={`Player ${seed}`}
                      value={playerNames[seed] || ''}
                      onChange={(e) => handlePlayerNameChange(seed, e.target.value)}
                    />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Players - Show when tournament is active */}
      {!isNotStarted && players.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Registered Players ({players.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {players.slice().sort((a, b) => a.seed - b.seed).map(p => (
                <div key={p.id} className="text-sm flex items-center gap-2 p-2 border rounded bg-card">
                  <span className="text-muted-foreground font-semibold w-6">#{p.seed}</span>
                  <span className={p.eliminated ? 'line-through text-muted-foreground' : ''}>
                    {p.name}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
