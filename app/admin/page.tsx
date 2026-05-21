'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTournament } from '@/components/tournament-provider'
import { AdminMatchControl } from '@/components/admin/match-control'
import { AdminTournamentSetup } from '@/components/admin/tournament-setup'
import { AdminRoomView } from '@/components/admin/room-view'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export default function AdminPage() {
  const { tournamentState, loading, matches } = useTournament()
  const [activeTab, setActiveTab] = useState('setup')
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Spinner className="w-8 h-8 mx-auto" />
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  const activeMatches = matches.filter(m => m.status === 'in_progress')

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 sticky top-0 z-50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold tracking-tight">
                Admin Dashboard
              </h1>
              <Badge variant={tournamentState?.status?.includes('in_progress') ? 'default' : 'secondary'}>
                {tournamentState?.status?.replace(/_/g, ' ') || 'Not Started'}
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" asChild>
                <Link href="/">View Bracket</Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8">
            <TabsTrigger value="setup">Tournament Setup</TabsTrigger>
            <TabsTrigger value="rooms" className="relative">
              Live Rooms
              {activeMatches.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                  {activeMatches.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="matches">All Matches</TabsTrigger>
          </TabsList>

          <TabsContent value="setup">
            <AdminTournamentSetup />
          </TabsContent>

          <TabsContent value="rooms">
            <AdminRoomView />
          </TabsContent>

          <TabsContent value="matches">
            <AdminMatchControl />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
