'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTournament } from '@/components/tournament-provider'
import { GroupBracket } from '@/components/group-bracket'
import { FixturesList } from '@/components/fixtures-list'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

export default function TournamentPage() {
  const { tournamentState, loading } = useTournament()
  const [viewMode, setViewMode] = useState<'visual' | 'fixtures'>('visual')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Spinner className="w-8 h-8 mx-auto" />
          <p className="text-muted-foreground">Loading tournament data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 sticky top-0 z-50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold tracking-tight">
                Arewa Hausa <span className="text-primary">CODM</span> Community Competition
              </h1>
              <StatusBadge status={tournamentState?.status || 'not_started'} />
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin">Admin</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Tournament Countdown or Schedule Banner */}
        <TournamentCountdown />

        {/* View Mode Toggle Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              {viewMode === 'fixtures' ? "Tournament Fixtures & Matches" : "Tournament Bracket Tree"}
            </h2>
            <p className="text-muted-foreground text-xs mt-1">
              {viewMode === 'fixtures' 
                ? "Full list of fixtures for all 5 rounds. Search players or filter by round."
                : "32 players single-elimination tournament bracket. Keep track of live standings."
              }
            </p>
          </div>
          
          <div className="flex items-center gap-2 bg-background/50 p-1 rounded-lg border border-border/80 w-fit">
            <Button
              variant={viewMode === 'visual' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('visual')}
              className={cn(
                "h-8 text-xs font-semibold rounded-md transition-all duration-200",
                viewMode === 'visual' && "bg-card text-foreground shadow-sm"
              )}
            >
              Brackets
            </Button>
            <Button
              variant={viewMode === 'fixtures' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('fixtures')}
              className={cn(
                "h-8 text-xs font-semibold rounded-md transition-all duration-200",
                viewMode === 'fixtures' && "bg-card text-foreground shadow-sm"
              )}
            >
              Fixtures Tab
            </Button>
          </div>
        </div>

        {viewMode === 'fixtures' ? (
          <div className="space-y-6">
            <FixturesList />
          </div>
        ) : (
          <div className="space-y-8">
            <GroupBracket />
          </div>
        )}
      </main>
    </div>
  )
}

function TournamentCountdown() {
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
    isOver: boolean
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isOver: false })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const target = new Date("2026-05-23T21:20:00")
    
    const updateCountdown = () => {
      const now = new Date()
      const diff = target.getTime() - now.getTime()
      
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true })
        return
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      
      setTimeLeft({ days, hours, minutes, seconds, isOver: false })
    }
    
    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [])

  if (!mounted) return null

  if (timeLeft.isOver) {
    return (
      <div className="mb-6 p-4 rounded-xl border border-zinc-900 bg-zinc-950/20 backdrop-blur-sm">
        <div className="space-y-1">
          <span className="text-xs text-primary font-bold uppercase tracking-wider">Tournament Schedule</span>
          <div className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
            <span>📅 Saturday & Sunday • Tournament is Live!</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6 p-6 rounded-2xl border border-primary/20 bg-primary/5 backdrop-blur-md relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg shadow-primary/5">
      {/* Background glow effects */}
      <div className="absolute -right-16 -top-16 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 w-32 h-32 bg-accent/10 rounded-full blur-2xl pointer-events-none" />
      
      <div className="space-y-1 text-center md:text-left z-10">
        <span className="text-xs text-primary font-bold uppercase tracking-wider animate-pulse flex items-center gap-2 justify-center md:justify-start">
          <span className="h-2 w-2 rounded-full bg-primary" /> Next Battle Begins In
        </span>
        <h3 className="text-lg font-bold text-white">
          Arewa Hausa CODM Community Competition
        </h3>
        <p className="text-zinc-400 text-xs">
          Scheduled to start on Saturday, May 23 at 9:20 PM
        </p>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 z-10">
        <CountdownUnit value={timeLeft.days} label="Days" />
        <span className="text-2xl font-bold text-zinc-700 font-mono">:</span>
        <CountdownUnit value={timeLeft.hours} label="Hours" />
        <span className="text-2xl font-bold text-zinc-700 font-mono">:</span>
        <CountdownUnit value={timeLeft.minutes} label="Mins" />
        <span className="text-2xl font-bold text-zinc-700 font-mono">:</span>
        <CountdownUnit value={timeLeft.seconds} label="Secs" />
      </div>
    </div>
  )
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="min-w-[60px] sm:min-w-[70px] h-[60px] sm:h-[70px] rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-center shadow-inner">
        <span className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mt-1.5">{label}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    'not_started': { label: 'Scheduled: Sat & Sun', variant: 'secondary' },
    'in_progress': { label: 'Live Now', variant: 'default' },
    'completed': { label: 'Tournament Completed', variant: 'outline' },
  }

  const config = statusConfig[status] || statusConfig['not_started']

  return (
    <Badge 
      variant={config.variant}
      className={cn(
        "font-semibold text-xs py-0.5 px-2.5",
        status === 'in_progress' && "animate-pulse bg-primary hover:bg-primary"
      )}
    >
      {config.label}
    </Badge>
  )
}

