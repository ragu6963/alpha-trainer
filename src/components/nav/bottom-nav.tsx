'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, MessageSquare, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: '대시보드', icon: LayoutDashboard },
  { href: '/coach', label: 'AI 코치', icon: MessageSquare },
  { href: '/settings', label: '설정', icon: Settings },
]

// 하단 네비게이션을 숨길 경로 (자체 네비게이션을 가진 페이지)
const HIDDEN_PATHS = ['/coach']

export function BottomNav() {
  const pathname = usePathname()

  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-background safe-area-pb">
      <div className="h-full flex items-center justify-around px-4">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center gap-1 min-w-[64px] py-2 transition-colors duration-150',
              pathname.startsWith(href) ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Icon size={20} />
            <span className="text-xs">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
