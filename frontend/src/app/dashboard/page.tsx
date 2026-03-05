'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import useSWR from 'swr'
import { fetcher } from '@/lib/api'
import { RaceWeekendCard } from '@/components/race-weekend-card'
import type { RaceWeekend } from '@/lib/types'

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [loading, user, router])

  const { data: races, isLoading } = useSWR<RaceWeekend[]>(
    user ? '/race-weekends' : null,
    fetcher
  )

  if (loading || !user) return null

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-extrabold uppercase tracking-widest text-[#F5F5F5] mb-6">
        2026 Season
      </h1>
      {isLoading ? (
        <p className="text-[#9A9A9A]">Loading race calendar...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {races?.map((race) => (
            <RaceWeekendCard key={race.id} race={race} />
          ))}
        </div>
      )}
    </div>
  )
}
