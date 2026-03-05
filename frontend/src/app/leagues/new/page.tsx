'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import type { League } from '@/lib/types'

export default function NewLeaguePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading || !user) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const league = await api.post<League>('/leagues', { name })
      toast.success(`League created! Code: ${league.join_code}`)
      router.push(`/leagues/${league.id}`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to create league')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <Card className="bg-[#1E1E2E] border-[rgba(255,255,255,0.08)] p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-[#F5F5F5] mb-6 text-center uppercase tracking-wide">Create League</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-[#9A9A9A]">League Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="The Grid Gossips"
              className="bg-[#15151E] border-[rgba(255,255,255,0.08)] text-[#F5F5F5]"
            />
          </div>
          <Button type="submit" disabled={submitting} className="w-full bg-[#E10600] hover:bg-[#C10500] text-white">
            {submitting ? 'Creating...' : 'Create League'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
