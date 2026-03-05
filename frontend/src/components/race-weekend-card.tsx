'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { RaceWeekend } from '@/lib/types'

const countryFlags: Record<string, string> = {
  'Australia': '🇦🇺', 'China': '🇨🇳', 'Japan': '🇯🇵', 'Bahrain': '🇧🇭',
  'Saudi Arabia': '🇸🇦', 'United States': '🇺🇸', 'Canada': '🇨🇦', 'Monaco': '🇲🇨',
  'Spain': '🇪🇸', 'Austria': '🇦🇹', 'United Kingdom': '🇬🇧', 'Belgium': '🇧🇪',
  'Hungary': '🇭🇺', 'Netherlands': '🇳🇱', 'Italy': '🇮🇹', 'Azerbaijan': '🇦🇿',
  'Singapore': '🇸🇬', 'Mexico': '🇲🇽', 'Brazil': '🇧🇷', 'Qatar': '🇶🇦',
  'United Arab Emirates': '🇦🇪',
}

const statusStyles: Record<string, string> = {
  upcoming: 'border-[#9A9A9A] text-[#9A9A9A]',
  open: 'border-[#39FF14] text-[#39FF14]',
  locked: 'border-[#FFD700] text-[#FFD700]',
  scored: 'bg-[#E10600] text-white border-[#E10600]',
}

export function RaceWeekendCard({ race }: { race: RaceWeekend }) {
  const flag = countryFlags[race.country] || '🏁'
  const raceDate = new Date(race.race_date)
  const status = race.status || 'upcoming'

  return (
    <Link href={`/race/${race.id}`}>
      <Card className="bg-[#1E1E2E] border-[rgba(255,255,255,0.08)] p-4 hover:border-[#E10600] transition-colors cursor-pointer">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[#9A9A9A] font-mono">R{String(race.round).padStart(2, '0')}</span>
          <Badge variant="outline" className={`text-[10px] uppercase ${statusStyles[status]}`}>
            {status}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{flag}</span>
          <h3 className="text-[#F5F5F5] font-bold uppercase tracking-widest text-sm">{race.short_name}</h3>
          {race.is_sprint && (
            <Badge className="bg-[#FFD700] text-black text-[9px] px-1.5 py-0">SPRINT</Badge>
          )}
        </div>
        <p className="text-xs text-[#9A9A9A] mb-1">{race.circuit}</p>
        <p className="text-xs text-[#9A9A9A]">
          {raceDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          {' · '}
          {raceDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
        </p>
      </Card>
    </Link>
  )
}
