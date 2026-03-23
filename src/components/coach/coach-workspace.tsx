'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ConversationSidebar } from './conversation-sidebar'
import { ChatPanel } from './chat-panel'
import { Sheet, SheetContent, SheetTitle, SheetHeader } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Menu, Plus, LayoutDashboard, Settings } from 'lucide-react'
import Link from 'next/link'

export type Conversation = { id: string; title: string; updatedAt: string }

type Props = { hasApiKey: boolean; modelLabel: string }

function CoachWorkspaceInner({ hasApiKey, modelLabel }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentId = searchParams.get('c')

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false)

  const fetchConversations = () => {
    fetch('/api/coach/conversations')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setConversations(data) })
      .catch(err => console.error('Failed to fetch conversations:', err))
  }

  useEffect(() => { fetchConversations() }, [currentId])

  const handleNewChat = () => {
    router.push('/coach')
    setIsMobileSheetOpen(false)
  }

  const handleSelectChat = (id: string) => {
    router.push(`/coach?c=${id}`, { scroll: false })
    setIsMobileSheetOpen(false)
  }

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await fetch(`/api/coach/conversations/${id}`, { method: 'DELETE' })
    if (currentId === id) router.push('/coach')
    fetchConversations()
  }

  return (
    <div className="flex h-full">
      {/* PC 사이드바 */}
      <div
        className={`hidden md:flex flex-col shrink-0 bg-muted/20 border-r transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'w-64' : 'w-14'
        }`}
      >
        <ConversationSidebar
          conversations={conversations}
          currentId={currentId}
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(v => !v)}
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
          onDeleteConversation={handleDeleteConversation}
        />
      </div>

      {/* 채팅 영역 */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        {/* 모바일 헤더 */}
        <div className="md:hidden flex items-center justify-between px-2 border-b bg-background/95 backdrop-blur-sm shrink-0 h-12">
          <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileSheetOpen(true)}
              aria-label="대화 목록"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <SheetContent side="left" className="p-0 w-72">
              <SheetHeader className="p-4 border-b">
                <SheetTitle>이전 대화</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col h-[calc(100%-4rem)]">
                <div className="p-3 border-b">
                  <Button onClick={handleNewChat} className="w-full justify-start gap-2" variant="default">
                    <Plus className="w-4 h-4" />
                    새 대화 시작
                  </Button>
                </div>
                <ConversationSidebar
                  conversations={conversations}
                  currentId={currentId}
                  isOpen={true}
                  onToggle={() => {}}
                  onNewChat={handleNewChat}
                  onSelectChat={handleSelectChat}
                  onDeleteConversation={handleDeleteConversation}
                  mobileMode
                />
              </div>
            </SheetContent>
          </Sheet>

          <span className="font-medium text-sm absolute left-1/2 -translate-x-1/2">AI 코치</span>

          <div className="flex items-center gap-1">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" aria-label="대시보드">
                <LayoutDashboard className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="ghost" size="icon" aria-label="설정">
                <Settings className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* 채팅 패널 */}
        <ChatPanel
          hasApiKey={hasApiKey}
          modelLabel={modelLabel}
          conversationId={currentId}
          onConversationCreated={(id) => {
            router.push(`/coach?c=${id}`, { scroll: false })
            fetchConversations()
          }}
        />
      </div>
    </div>
  )
}

export default function CoachWorkspace({ hasApiKey, modelLabel }: Props) {
  return (
    <Suspense fallback={<div className="h-full flex items-center justify-center text-muted-foreground text-sm">로딩 중...</div>}>
      <CoachWorkspaceInner hasApiKey={hasApiKey} modelLabel={modelLabel} />
    </Suspense>
  )
}
