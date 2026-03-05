'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { usePathname } from 'next/navigation'

export function Navbar() {
  const { user, loading, signOut } = useAuth()
  const pathname = usePathname()

  return (
    <nav className="border-b border-[rgba(255,255,255,0.08)] bg-[#15151E]">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2">
          <span className="text-[#E10600] font-extrabold text-xl uppercase tracking-wide">P1</span>
          <span className="text-[#F5F5F5] font-bold text-lg uppercase tracking-wide">Predictions</span>
        </Link>

        <div className="flex items-center gap-4">
          {!loading && user ? (
            <>
              <Link
                href="/dashboard"
                className={`text-sm ${pathname === '/dashboard' ? 'text-[#E10600]' : 'text-[#9A9A9A] hover:text-[#F5F5F5]'}`}
              >
                Races
              </Link>
              <Link
                href="/leagues"
                className={`text-sm ${pathname.startsWith('/leagues') ? 'text-[#E10600]' : 'text-[#9A9A9A] hover:text-[#F5F5F5]'}`}
              >
                Leagues
              </Link>
              {user.is_admin && (
                <Link
                  href="/admin"
                  className={`text-sm ${pathname.startsWith('/admin') ? 'text-[#E10600]' : 'text-[#9A9A9A] hover:text-[#F5F5F5]'}`}
                >
                  Admin
                </Link>
              )}
              <span className="text-xs text-[#9A9A9A]">{user.display_name}</span>
              <Button variant="ghost" size="sm" onClick={signOut} className="text-[#9A9A9A] hover:text-[#F5F5F5]">
                Sign Out
              </Button>
            </>
          ) : !loading ? (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-[#9A9A9A] hover:text-[#F5F5F5]">
                  Log In
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="bg-[#E10600] hover:bg-[#C10500] text-white">
                  Sign Up
                </Button>
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </nav>
  )
}
