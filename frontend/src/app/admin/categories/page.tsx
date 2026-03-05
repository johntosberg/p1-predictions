'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { fetcher, api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { PredictionCategory } from '@/lib/types'

export default function AdminCategoriesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user && !user.is_admin) router.push('/dashboard')
  }, [loading, user, router])

  const { data: categories, mutate } = useSWR<PredictionCategory[]>(
    user?.is_admin ? '/admin/categories' : null,
    fetcher
  )

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', points: 1, display_order: 0, is_sprint_only: false })

  if (loading || !user?.is_admin) return null

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api.post('/admin/categories', form)
      mutate()
      setOpen(false)
      setForm({ name: '', description: '', points: 1, display_order: 0, is_sprint_only: false })
      toast.success('Category created')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to create category')
    }
  }

  async function toggleActive(cat: PredictionCategory) {
    try {
      await api.patch(`/admin/categories/${cat.id}`, { is_active: !cat.is_active })
      mutate()
      toast.success(`Category ${cat.is_active ? 'deactivated' : 'activated'}`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold uppercase tracking-widest text-[#F5F5F5]">Categories</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#E10600] hover:bg-[#C10500] text-white">Add Category</Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1E1E2E] border-[rgba(255,255,255,0.08)]">
            <DialogHeader>
              <DialogTitle className="text-[#F5F5F5]">New Category</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label className="text-[#9A9A9A]">Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="bg-[#15151E] border-[rgba(255,255,255,0.08)] text-[#F5F5F5]" />
              </div>
              <div>
                <Label className="text-[#9A9A9A]">Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-[#15151E] border-[rgba(255,255,255,0.08)] text-[#F5F5F5]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#9A9A9A]">Points</Label>
                  <Input type="number" min={0} value={form.points} onChange={(e) => setForm({ ...form, points: parseInt(e.target.value) || 0 })} className="bg-[#15151E] border-[rgba(255,255,255,0.08)] text-[#F5F5F5]" />
                </div>
                <div>
                  <Label className="text-[#9A9A9A]">Display Order</Label>
                  <Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} className="bg-[#15151E] border-[rgba(255,255,255,0.08)] text-[#F5F5F5]" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="sprint" checked={form.is_sprint_only} onChange={(e) => setForm({ ...form, is_sprint_only: e.target.checked })} />
                <Label htmlFor="sprint" className="text-[#9A9A9A]">Sprint weekends only</Label>
              </div>
              <Button type="submit" className="w-full bg-[#E10600] hover:bg-[#C10500] text-white">Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {categories?.map((cat) => (
          <Card key={cat.id} className={`bg-[#1E1E2E] border-[rgba(255,255,255,0.08)] p-4 ${!cat.is_active ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[#F5F5F5] font-semibold">{cat.name}</h3>
                  <span className="text-xs text-[#9A9A9A] font-mono">{cat.points} pts</span>
                  {cat.is_sprint_only && <Badge className="bg-[#FFD700] text-black text-[9px]">SPRINT</Badge>}
                  {!cat.is_active && <Badge variant="outline" className="text-[#9A9A9A] text-[9px]">INACTIVE</Badge>}
                </div>
                {cat.description && <p className="text-xs text-[#9A9A9A] mt-1">{cat.description}</p>}
              </div>
              <Button variant="ghost" size="sm" onClick={() => toggleActive(cat)} className="text-[#9A9A9A] hover:text-[#F5F5F5]">
                {cat.is_active ? 'Deactivate' : 'Activate'}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
