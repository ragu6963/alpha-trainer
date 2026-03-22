'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, MessageSquare, Settings, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LogoutButton } from './logout-button'

const navItems = [
  { href: '/dashboard', label: '대시보드', icon: LayoutDashboard },
  { href: '/coach', label: 'AI 코치', icon: MessageSquare },
  { href: '/settings', label: '설정', icon: Settings },
]

export function TopNav() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 h-16 bg-background border-b">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 h-full flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg">
          <Activity size={20} className="text-[--color-strava]" />
          Alpha Trainer
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors duration-150',
                pathname.startsWith(href)
                  ? 'text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>

        <LogoutButton />
      </div>
    </header>
  )
}
