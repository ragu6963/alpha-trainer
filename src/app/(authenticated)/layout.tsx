import { TopNav } from '@/components/nav/top-nav'
import { BottomNav } from '@/components/nav/bottom-nav'

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* 데스크톱: 상단 네비게이션 */}
      <div className="hidden lg:block">
        <TopNav />
      </div>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-6 py-6 pb-20 lg:pb-6">
        {children}
      </main>

      {/* 모바일: 하단 탭 바 */}
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  )
}
