'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter, useParams } from 'next/navigation'
import { useEffect } from 'react'
import useSWR from 'swr'
import { fetcher } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { LeagueRaceResponse } from '@/lib/types'

export default function LeagueRacePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const leagueId = params.id as string
  const raceId = params.raceId as string

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [loading, user, router])

  const { data } = useSWR<LeagueRaceResponse>(
    user ? `/leagues/${leagueId}/race-weekends/${raceId}` : null,
    fetcher
  )

  if (loading || !user || !data) return null

  const rw = data.race_weekend
  const categoryNames = data.results.length > 0
    ? data.results[0].predictions.map((p) => p.category_name)
    : []

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <p className="text-xs text-[#9A9A9A] font-mono">ROUND {rw.round}</p>
        <h1 className="text-2xl font-extrabold uppercase tracking-widest text-[#F5F5F5]">
          {rw.name}
        </h1>
      </div>

      <Card className="bg-[#1E1E2E] border-[rgba(255,255,255,0.08)] overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-[rgba(255,255,255,0.08)]">
              <TableHead className="text-[#9A9A9A]">User</TableHead>
              {categoryNames.map((name) => (
                <TableHead key={name} className="text-[#9A9A9A] text-xs">{name}</TableHead>
              ))}
              <TableHead className="text-[#9A9A9A] text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.results.map((result) => (
              <TableRow key={result.user_id} className="border-[rgba(255,255,255,0.08)]">
                <TableCell className={`font-semibold ${result.user_id === user.id ? 'text-[#E10600]' : 'text-[#F5F5F5]'}`}>
                  {result.display_name}
                </TableCell>
                {result.predictions.map((pred) => (
                  <TableCell key={pred.category_id} className="text-xs">
                    <div className="text-[#F5F5F5]">{pred.value || '—'}</div>
                    <div className={`font-mono ${pred.points_awarded > 0 ? 'text-[#39FF14]' : 'text-[#9A9A9A]'}`}>
                      +{pred.points_awarded}
                    </div>
                  </TableCell>
                ))}
                <TableCell className="text-right font-mono font-bold text-[#FFD700]">
                  {result.total_points}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
