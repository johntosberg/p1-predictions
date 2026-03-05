'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { fetcher, api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Countdown } from '@/components/countdown'
import { toast } from 'sonner'
import type { RaceWeekendDetail } from '@/lib/types'

export default function RacePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const raceId = params.id as string

  useEffect(() => {
    if (!authLoading && !user) router.push('/login')
  }, [authLoading, user, router])

  const { data, isLoading, mutate } = useSWR<RaceWeekendDetail>(
    user ? `/race-weekends/${raceId}` : null,
    fetcher
  )

  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (data?.predictions) {
      const v: Record<string, string> = {}
      data.predictions.forEach((p) => { v[p.category_id] = p.value })
      setValues(v)
    }
  }, [data])

  if (authLoading || !user || isLoading || !data) return null

  const rw = data.race_weekend
  const isLocked = new Date(rw.lock_time) <= new Date()
  const isScored = data.scores.length > 0
  const showCountdown = !isLocked && (new Date(rw.lock_time).getTime() - Date.now()) < 86400000

  const categories = data.categories.filter(
    (c) => !c.is_sprint_only || rw.is_sprint
  )

  async function handleSave() {
    setSaving(true)
    try {
      const predictions = Object.entries(values)
        .filter(([, v]) => v.trim())
        .map(([category_id, value]) => ({ category_id, value }))
      await api.put(`/race-weekends/${raceId}/predictions`, { predictions })
      mutate()
      toast.success('Predictions saved!')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const scoreMap = new Map(data.scores.map((s) => [s.category_id, s]))

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <p className="text-xs text-[#9A9A9A] font-mono mb-1">ROUND {rw.round}</p>
        <h1 className="text-2xl font-extrabold uppercase tracking-widest text-[#F5F5F5] mb-1">
          {rw.name}
        </h1>
        <p className="text-sm text-[#9A9A9A]">{rw.circuit}</p>
        <div className="flex items-center gap-3 mt-2">
          {rw.is_sprint && (
            <Badge className="bg-[#FFD700] text-black text-xs">SPRINT</Badge>
          )}
          {isLocked && !isScored && (
            <Badge variant="outline" className="border-[#FFD700] text-[#FFD700] text-xs">LOCKED</Badge>
          )}
          {isScored && (
            <Badge className="bg-[#E10600] text-white text-xs">SCORED</Badge>
          )}
        </div>
        {showCountdown && <div className="mt-3"><Countdown targetDate={rw.lock_time} /></div>}
      </div>

      <div className="space-y-4">
        {categories.map((cat) => {
          const score = scoreMap.get(cat.id)
          return (
            <Card key={cat.id} className="bg-[#1E1E2E] border-[rgba(255,255,255,0.08)] p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-[#F5F5F5] font-semibold text-sm">{cat.name}</h3>
                  {cat.description && (
                    <p className="text-xs text-[#9A9A9A]">{cat.description}</p>
                  )}
                </div>
                <span className="text-xs text-[#9A9A9A] font-mono">{cat.points} pt{cat.points !== 1 ? 's' : ''}</span>
              </div>
              <Input
                value={values[cat.id] || ''}
                onChange={(e) => setValues({ ...values, [cat.id]: e.target.value })}
                disabled={isLocked}
                placeholder={isLocked ? 'Locked' : 'Your prediction...'}
                className="bg-[#15151E] border-[rgba(255,255,255,0.08)] text-[#F5F5F5]"
              />
              {score && (
                <div className="mt-2 flex items-center gap-2">
                  <span className={`text-sm font-mono font-bold ${score.points > 0 ? 'text-[#39FF14]' : 'text-[#9A9A9A]'}`}>
                    +{score.points}
                  </span>
                  {score.note && (
                    <span className="text-xs text-[#9A9A9A]">{score.note}</span>
                  )}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {!isLocked && (
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-6 bg-[#E10600] hover:bg-[#C10500] text-white"
        >
          {saving ? 'Saving...' : 'Save Predictions'}
        </Button>
      )}
    </div>
  )
}
