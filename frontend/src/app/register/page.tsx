'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const [success, setSuccess] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      // If email confirmation is required, session will be null
      if (data.session) {
        router.push('/dashboard')
      } else {
        setSuccess('Check your email for a confirmation link, then come back and log in.')
        setLoading(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <Card className="bg-[#1E1E2E] border-[rgba(255,255,255,0.08)] p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-[#F5F5F5] mb-6 text-center uppercase tracking-wide">Create Account</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="displayName" className="text-[#9A9A9A]">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="bg-[#15151E] border-[rgba(255,255,255,0.08)] text-[#F5F5F5]"
            />
          </div>
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
              minLength={6}
              className="bg-[#15151E] border-[rgba(255,255,255,0.08)] text-[#F5F5F5]"
            />
          </div>
          {error && <p className="text-[#E10600] text-sm">{error}</p>}
          {success && <p className="text-[#39FF14] text-sm">{success}</p>}
          <Button type="submit" disabled={loading} className="w-full bg-[#E10600] hover:bg-[#C10500] text-white">
            {loading ? 'Creating account...' : 'Sign Up'}
          </Button>
        </form>
        <p className="text-center text-sm text-[#9A9A9A] mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-[#E10600] hover:underline">Log in</Link>
        </p>
      </Card>
    </div>
  )
}
