'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import useSWR from 'swr'
import { fetcher, api } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { RaceWeekend } from '@/lib/types'

export default function AdminRaceWeekendsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user && !user.is_admin) router.push('/dashboard')
  }, [loading, user, router])

  const { data: races, mutate } = useSWR<RaceWeekend[]>(
    user?.is_admin ? '/admin/race-weekends' : null,
    fetcher
  )

  if (loading || !user?.is_admin) return null

  async function toggleCancel(race: RaceWeekend) {
    try {
      await api.patch(`/admin/race-weekends/${race.id}`, { is_cancelled: !race.is_cancelled })
      mutate()
      toast.success(`${race.name} ${race.is_cancelled ? 'restored' : 'cancelled'}`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-extrabold uppercase tracking-widest text-[#F5F5F5] mb-2">Race Calendar</h1>
      <p className="text-xs text-[#9A9A9A] mb-6">
        The 2026 season is seeded from config/seasons/2026.yaml. Edit that file and restart to make permanent changes to the base calendar.
      </p>

      <Card className="bg-[#1E1E2E] border-[rgba(255,255,255,0.08)] overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-[rgba(255,255,255,0.08)]">
              <TableHead className="text-[#9A9A9A]">Rnd</TableHead>
              <TableHead className="text-[#9A9A9A]">Name</TableHead>
              <TableHead className="text-[#9A9A9A]">Circuit</TableHead>
              <TableHead className="text-[#9A9A9A]">Race Date</TableHead>
              <TableHead className="text-[#9A9A9A]">Lock Time</TableHead>
              <TableHead className="text-[#9A9A9A]">Flags</TableHead>
              <TableHead className="text-[#9A9A9A]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {races?.map((race) => (
              <TableRow key={race.id} className={`border-[rgba(255,255,255,0.08)] ${race.is_cancelled ? 'opacity-50 line-through' : ''}`}>
                <TableCell className="font-mono text-[#9A9A9A]">{race.round}</TableCell>
                <TableCell className="text-[#F5F5F5] font-semibold">{race.name}</TableCell>
                <TableCell className="text-[#9A9A9A] text-xs">{race.circuit}</TableCell>
                <TableCell className="text-[#9A9A9A] text-xs font-mono">
                  {new Date(race.race_date).toLocaleString()}
                </TableCell>
                <TableCell className="text-[#9A9A9A] text-xs font-mono">
                  {new Date(race.lock_time).toLocaleString()}
                </TableCell>
                <TableCell>
                  {race.is_sprint && <Badge className="bg-[#FFD700] text-black text-[9px] mr-1">SPRINT</Badge>}
                  {race.is_cancelled && <Badge variant="outline" className="text-[#9A9A9A] text-[9px]">CANCELLED</Badge>}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => toggleCancel(race)} className="text-[#9A9A9A] hover:text-[#F5F5F5] text-xs">
                    {race.is_cancelled ? 'Restore' : 'Cancel'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
