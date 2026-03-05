'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter, useParams } from 'next/navigation'
import { useEffect } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { fetcher } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { LeagueDetail, RaceWeekend } from '@/lib/types'

const rankColors = ['', 'rgba(255,215,0,0.15)', 'rgba(192,192,192,0.15)', 'rgba(205,127,50,0.15)']
const rankEmojis = ['', '🥇', '🥈', '🥉']

export default function LeagueDetailPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const leagueId = params.id as string

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [loading, user, router])

  const { data: league } = useSWR<LeagueDetail>(
    user ? `/leagues/${leagueId}` : null,
    fetcher
  )

  const { data: races } = useSWR<RaceWeekend[]>(
    user ? '/race-weekends' : null,
    fetcher
  )

  if (loading || !user || !league) return null

  const scoredRaces = races?.filter((r) => r.status === 'scored') || []

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold uppercase tracking-widest text-[#F5F5F5]">
            {league.name}
          </h1>
          <p className="text-sm text-[#9A9A9A]">{league.members.length} members</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#9A9A9A] mb-1">Share this code</p>
          <Badge className="bg-[#15151E] text-[#F5F5F5] font-mono text-lg px-3 py-1 tracking-[0.3em]">
            {league.join_code}
          </Badge>
        </div>
      </div>

      <Card className="bg-[#1E1E2E] border-[rgba(255,255,255,0.08)] mb-8">
        <Table>
          <TableHeader>
            <TableRow className="border-[rgba(255,255,255,0.08)]">
              <TableHead className="text-[#9A9A9A] w-12">#</TableHead>
              <TableHead className="text-[#9A9A9A]">Driver</TableHead>
              <TableHead className="text-[#9A9A9A] text-right">Points</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {league.members.map((member) => (
              <TableRow
                key={member.user_id}
                className="border-[rgba(255,255,255,0.08)]"
                style={{ backgroundColor: rankColors[member.rank] || '' }}
              >
                <TableCell className="font-mono text-[#9A9A9A]">
                  {rankEmojis[member.rank] || member.rank}
                </TableCell>
                <TableCell className={`font-semibold ${member.user_id === user.id ? 'text-[#E10600]' : 'text-[#F5F5F5]'}`}>
                  {member.display_name}
                  {member.rank === 1 && <span className="ml-2 text-[#FFD700] text-xs">P1</span>}
                </TableCell>
                <TableCell className="text-right font-mono font-bold text-[#F5F5F5]">
                  {member.total_points}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {scoredRaces.length > 0 && (
        <>
          <h2 className="text-lg font-bold uppercase tracking-wide text-[#F5F5F5] mb-4">Race Results</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {scoredRaces.map((race) => (
              <Link key={race.id} href={`/leagues/${leagueId}/race/${race.id}`}>
                <Card className="bg-[#1E1E2E] border-[rgba(255,255,255,0.08)] p-3 hover:border-[#E10600] transition-colors cursor-pointer text-center">
                  <p className="text-xs text-[#9A9A9A] font-mono">R{String(race.round).padStart(2, '0')}</p>
                  <p className="text-sm font-bold text-[#F5F5F5] uppercase tracking-wide">{race.short_name}</p>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
