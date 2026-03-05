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

export default function JoinLeaguePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [joinCode, setJoinCode] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading || !user) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const league = await api.post<League>('/leagues/join', { join_code: joinCode.toUpperCase() })
      toast.success(`Joined ${league.name}!`)
      router.push(`/leagues/${league.id}`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to join')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <Card className="bg-[#1E1E2E] border-[rgba(255,255,255,0.08)] p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-[#F5F5F5] mb-6 text-center uppercase tracking-wide">Join League</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="code" className="text-[#9A9A9A]">Join Code</Label>
            <Input
              id="code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              required
              maxLength={6}
              placeholder="GX4R2K"
              className="bg-[#15151E] border-[rgba(255,255,255,0.08)] text-[#F5F5F5] font-mono text-center text-2xl tracking-[0.3em]"
            />
          </div>
          <Button type="submit" disabled={submitting} className="w-full bg-[#E10600] hover:bg-[#C10500] text-white">
            {submitting ? 'Joining...' : 'Join League'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
