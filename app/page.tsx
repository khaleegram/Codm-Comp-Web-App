'use client'

import { useState } from 'react'
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
        {/* Schedule & View Toggle Banner */}
        <div className="mb-6 p-4 rounded-xl border border-border bg-card/30 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs text-primary font-bold uppercase tracking-wider">Tournament Schedule</span>
            <div className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span>📅 Saturday & Sunday</span>
            </div>
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
            <div>
              <h2 className="text-xl font-semibold mb-1">
                Tournament Fixtures & Matches
              </h2>
              <p className="text-muted-foreground text-sm">
                Full list of fixtures for all 5 rounds. Search players or filter by round.
              </p>
            </div>
            <FixturesList />
          </div>
        ) : (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold mb-2">Tournament Bracket Tree</h2>
              <p className="text-muted-foreground text-sm">
                32 players single-elimination tournament bracket. Keep track of live standings and round progressions.
              </p>
            </div>
            <GroupBracket />
          </div>
        )}
      </main>
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

