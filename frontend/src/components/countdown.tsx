'use client'

import { useEffect, useState } from 'react'

export function Countdown({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    function update() {
      const diff = new Date(targetDate).getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft('LOCKED')
        return
      }
      const hours = Math.floor(diff / 3600000)
      const mins = Math.floor((diff % 3600000) / 60000)
      const secs = Math.floor((diff % 60000) / 1000)
      if (hours >= 24) {
        const days = Math.floor(hours / 24)
        setTimeLeft(`${days}d ${hours % 24}h`)
      } else {
        setTimeLeft(`${hours}h ${mins}m ${secs}s`)
      }
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [targetDate])

  if (!timeLeft) return null

  return (
    <span className={`font-mono text-sm ${timeLeft === 'LOCKED' ? 'text-[#FFD700]' : 'text-[#39FF14]'}`}>
      {timeLeft === 'LOCKED' ? '🔒 Predictions Locked' : `⏱ Locks in ${timeLeft}`}
    </span>
  )
}
