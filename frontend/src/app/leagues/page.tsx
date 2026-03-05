'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { fetcher } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { League } from '@/lib/types'

export default function LeaguesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [loading, user, router])

  const { data: leagues, isLoading } = useSWR<League[]>(
    user ? '/leagues' : null,
    fetcher
  )

  if (loading || !user) return null

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold uppercase tracking-widest text-[#F5F5F5]">
          My Leagues
        </h1>
        <div className="flex gap-2">
          <Link href="/leagues/join">
            <Button variant="outline" className="border-[#E10600] text-[#E10600] hover:bg-[#E10600] hover:text-white">
              Join League
            </Button>
          </Link>
          <Link href="/leagues/new">
            <Button className="bg-[#E10600] hover:bg-[#C10500] text-white">
              Create League
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <p className="text-[#9A9A9A]">Loading leagues...</p>
      ) : leagues && leagues.length > 0 ? (
        <div className="space-y-3">
          {leagues.map((league) => (
            <Link key={league.id} href={`/leagues/${league.id}`}>
              <Card className="bg-[#1E1E2E] border-[rgba(255,255,255,0.08)] p-4 hover:border-[#E10600] transition-colors cursor-pointer mb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[#F5F5F5] font-bold">{league.name}</h3>
                    <p className="text-xs text-[#9A9A9A]">{league.member_count} member{league.member_count !== 1 ? 's' : ''}</p>
                  </div>
                  <span className="text-xs font-mono text-[#9A9A9A] bg-[#15151E] px-2 py-1 rounded">
                    {league.join_code}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="bg-[#1E1E2E] border-[rgba(255,255,255,0.08)] p-8 text-center">
          <p className="text-[#9A9A9A]">No leagues yet — create one and send the code to your grid</p>
        </Card>
      )}
    </div>
  )
}
