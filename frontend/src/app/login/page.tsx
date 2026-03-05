'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <Card className="bg-[#1E1E2E] border-[rgba(255,255,255,0.08)] p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-[#F5F5F5] mb-6 text-center uppercase tracking-wide">Log In</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-[#9A9A9A]">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-[#15151E] border-[rgba(255,255,255,0.08)] text-[#F5F5F5]"
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-[#9A9A9A]">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-[#15151E] border-[rgba(255,255,255,0.08)] text-[#F5F5F5]"
            />
          </div>
          {error && <p className="text-[#E10600] text-sm">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full bg-[#E10600] hover:bg-[#C10500] text-white">
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
        <p className="text-center text-sm text-[#9A9A9A] mt-4">
          No account?{' '}
          <Link href="/register" className="text-[#E10600] hover:underline">Sign up</Link>
        </p>
      </Card>
    </div>
  )
}
