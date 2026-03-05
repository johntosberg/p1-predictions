'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { fetcher } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { RaceWeekend } from '@/lib/types'

export default function AdminPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.push('/login')
    if (!loading && user && !user.is_admin) router.push('/dashboard')
  }, [loading, user, router])

  const { data: races } = useSWR<RaceWeekend[]>(
    user?.is_admin ? '/race-weekends' : null,
    fetcher
  )

  if (loading || !user?.is_admin) return null

  const lockedRaces = races?.filter(
    (r) => new Date(r.lock_time) <= new Date() && r.status !== 'scored'
  ) || []

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-extrabold uppercase tracking-widest text-[#F5F5F5] mb-6">Admin</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Link href="/admin/categories">
          <Card className="bg-[#1E1E2E] border-[rgba(255,255,255,0.08)] p-6 hover:border-[#E10600] transition-colors cursor-pointer">
            <h2 className="text-[#F5F5F5] font-bold text-lg mb-1">Categories</h2>
            <p className="text-sm text-[#9A9A9A]">Manage prediction categories</p>
          </Card>
        </Link>
        <Link href="/admin/race-weekends">
          <Card className="bg-[#1E1E2E] border-[rgba(255,255,255,0.08)] p-6 hover:border-[#E10600] transition-colors cursor-pointer">
            <h2 className="text-[#F5F5F5] font-bold text-lg mb-1">Race Calendar</h2>
            <p className="text-sm text-[#9A9A9A]">View and edit race weekends</p>
          </Card>
        </Link>
      </div>

      {lockedRaces.length > 0 && (
        <>
          <h2 className="text-lg font-bold uppercase tracking-wide text-[#F5F5F5] mb-4">Ready to Score</h2>
          <div className="space-y-3">
            {lockedRaces.map((race) => (
              <Link key={race.id} href={`/admin/score/${race.id}`}>
                <Card className="bg-[#1E1E2E] border-[rgba(255,255,255,0.08)] p-4 hover:border-[#E10600] transition-colors cursor-pointer mb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-[#9A9A9A] font-mono mr-2">R{String(race.round).padStart(2, '0')}</span>
                      <span className="text-[#F5F5F5] font-bold">{race.name}</span>
                    </div>
                    <Badge variant="outline" className="border-[#FFD700] text-[#FFD700] text-xs">NEEDS SCORING</Badge>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
