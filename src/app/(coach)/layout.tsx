import { TopNav } from '@/components/nav/top-nav'
import { BottomNav } from '@/components/nav/bottom-nav'

export default function CoachGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-dvh">
      <div className="hidden lg:block shrink-0">
        <TopNav />
      </div>
      <main className="flex-1 min-h-0">
        {children}
      </main>
      <div className="lg:hidden shrink-0">
        <BottomNav />
      </div>
    </div>
  )
}
