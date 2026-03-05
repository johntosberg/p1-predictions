'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { fetcher, api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import type { AdminScoreEntry, RaceWeekend, PredictionCategory } from '@/lib/types'

export default function AdminScorePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const raceId = params.raceId as string

  useEffect(() => {
    if (!loading && user && !user.is_admin) router.push('/dashboard')
  }, [loading, user, router])

  const { data: entries, mutate } = useSWR<AdminScoreEntry[]>(
    user?.is_admin ? `/admin/race-weekends/${raceId}/scores` : null,
    fetcher
  )

  const { data: categories } = useSWR<PredictionCategory[]>(
    user?.is_admin ? '/admin/categories' : null,
    fetcher
  )

  const { data: races } = useSWR<RaceWeekend[]>(
    user?.is_admin ? '/admin/race-weekends' : null,
    fetcher
  )

  const [scores, setScores] = useState<Record<string, { points: number; note: string }>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (entries && categories) {
      const s: Record<string, { points: number; note: string }> = {}
      const catMap = new Map(categories.map((c) => [c.id, c]))
      entries.forEach((entry) => {
        entry.predictions.forEach((pred) => {
          const key = `${entry.user_id}:${pred.category_id}`
          const cat = catMap.get(pred.category_id)
          s[key] = {
            points: pred.points ?? cat?.points ?? 0,
            note: pred.note || '',
          }
        })
      })
      setScores(s)
    }
  }, [entries, categories])

  if (loading || !user?.is_admin || !entries || !categories) return null

  const race = races?.find((r) => r.id === raceId)

  async function handleSave() {
    setSaving(true)
    try {
      const scoreList = Object.entries(scores).map(([key, val]) => {
        const [user_id, category_id] = key.split(':')
        return { user_id, category_id, points: val.points, note: val.note || null }
      })
      await api.put(`/admin/race-weekends/${raceId}/scores`, { scores: scoreList })
      mutate()
      toast.success('Scores saved!')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function updateScore(key: string, field: 'points' | 'note', value: string | number) {
    setScores((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }))
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          {race && <p className="text-xs text-[#9A9A9A] font-mono">ROUND {race.round}</p>}
          <h1 className="text-2xl font-extrabold uppercase tracking-widest text-[#F5F5F5]">
            Score: {race?.name || 'Race Weekend'}
          </h1>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-[#E10600] hover:bg-[#C10500] text-white">
          {saving ? 'Saving...' : 'Save All Scores'}
        </Button>
      </div>

      <div className="space-y-6">
        {entries.map((entry) => (
          <Card key={entry.user_id} className="bg-[#1E1E2E] border-[rgba(255,255,255,0.08)] p-4">
            <h3 className="text-[#F5F5F5] font-bold mb-3">{entry.display_name}</h3>
            <div className="space-y-3">
              {entry.predictions.map((pred) => {
                const key = `${entry.user_id}:${pred.category_id}`
                const cat = categories.find((c) => c.id === pred.category_id)
                const score = scores[key]
                return (
                  <div key={pred.category_id} className="grid grid-cols-[1fr,auto,1fr] gap-3 items-start">
                    <div>
                      <p className="text-xs text-[#9A9A9A]">{cat?.name}</p>
                      <p className="text-sm text-[#F5F5F5]">{pred.value || '—'}</p>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      value={score?.points ?? 0}
                      onChange={(e) => updateScore(key, 'points', parseInt(e.target.value) || 0)}
                      disabled={!pred.value}
                      className="w-20 bg-[#15151E] border-[rgba(255,255,255,0.08)] text-[#F5F5F5] text-center font-mono"
                    />
                    <Textarea
                      value={score?.note ?? ''}
                      onChange={(e) => updateScore(key, 'note', e.target.value)}
                      disabled={!pred.value}
                      placeholder="Note..."
                      rows={1}
                      className="bg-[#15151E] border-[rgba(255,255,255,0.08)] text-[#F5F5F5] text-xs resize-none"
                    />
                  </div>
                )
              })}
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <Button onClick={handleSave} disabled={saving} className="w-full bg-[#E10600] hover:bg-[#C10500] text-white">
          {saving ? 'Saving...' : 'Save All Scores'}
        </Button>
      </div>
    </div>
  )
}
