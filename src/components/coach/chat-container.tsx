'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ChatInterface from './chat-interface'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Menu, Plus, MessageSquare, PanelLeftClose, PanelLeftOpen, LayoutDashboard, Settings, Trash2 } from 'lucide-react'

type Conversation = { id: string; title: string; updatedAt: string }

function ChatWorkspace({ hasApiKey, modelLabel }: { hasApiKey: boolean; modelLabel: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentId = searchParams.get('c')
  
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const fetchConversations = () => {
    fetch('/api/coach/conversations')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setConversations(data)
      })
      .catch(err => console.error('Failed to fetch conversations:', err))
  }

  useEffect(() => {
    fetchConversations()
  }, [currentId])

  const handleNewChat = () => {
    router.push('/coach')
    setIsMobileMenuOpen(false)
  }

  const handleSelectChat = (id: string) => {
    router.push(`/coach?c=${id}`)
    setIsMobileMenuOpen(false)
  }

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await fetch(`/api/coach/conversations/${id}`, { method: 'DELETE' })
    if (currentId === id) router.push('/coach')
    fetchConversations()
  }

  const renderSidebarContent = () => (
    <ScrollArea className="flex-1">
      <div className="space-y-1 p-3">
        {conversations.map(c => (
          <div key={c.id} className="group relative flex items-center">
            <Button
              onClick={() => handleSelectChat(c.id)}
              variant={c.id === currentId ? "secondary" : "ghost"}
              className={`w-full justify-start font-normal pr-8 ${c.id === currentId ? 'bg-muted shadow-sm' : ''}`}
            >
              <MessageSquare className="w-4 h-4 mr-2 shrink-0 opacity-50" />
              <span className="truncate">{c.title || '새 대화'}</span>
            </Button>
            <Button
              onClick={(e) => handleDeleteConversation(e, c.id)}
              variant="ghost"
              size="icon"
              className="absolute right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground hover:text-destructive"
              aria-label="대화 삭제"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </ScrollArea>
  )

  const renderCollapsedSidebar = () => (
    <TooltipProvider delay={200}>
      <div className="flex flex-col items-center gap-1 pt-3">
        {conversations.map(c => (
          <Tooltip key={c.id}>
            <TooltipTrigger render={
              <Button
                onClick={() => handleSelectChat(c.id)}
                variant={c.id === currentId ? "secondary" : "ghost"}
                size="icon"
                className={c.id === currentId ? 'bg-muted shadow-sm' : ''}
              />
            }>
              <MessageSquare className="w-4 h-4 opacity-50" />
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{c.title || '새 대화'}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  )

  return (
    <div className="flex h-full bg-background md:rounded-xl md:overflow-hidden">
      {/* Desktop Sidebar */}
      <div
        className={`hidden md:flex flex-col shrink-0 bg-muted/20 border-r transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'w-72' : 'w-14'
        }`}
      >
        {/* Sidebar Header */}
        <div className={`flex items-center ${isSidebarOpen ? 'p-3 justify-between gap-2' : 'p-2 flex-col gap-2'}`}>
          {isSidebarOpen ? (
            <>
              <Button onClick={handleNewChat} className="flex-1 justify-start gap-2" variant="default" size="sm">
                <Plus className="w-4 h-4" />
                새 대화
              </Button>
              <Button
                onClick={() => setIsSidebarOpen(false)}
                variant="ghost"
                size="icon"
                className="shrink-0 h-8 w-8"
                aria-label="사이드바 닫기"
              >
                <PanelLeftClose className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => setIsSidebarOpen(true)}
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="사이드바 열기"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </Button>
              <Button
                onClick={handleNewChat}
                variant="default"
                size="icon"
                className="h-8 w-8"
                aria-label="새 대화 시작"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>

        {/* Sidebar Body */}
        {isSidebarOpen ? renderSidebarContent() : renderCollapsedSidebar()}
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between px-2 border-b bg-background/95 backdrop-blur-sm shrink-0 h-12">
          {/* 대화 목록 메뉴 */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" />}>
              <Menu className="w-5 h-5" />
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <SheetHeader className="p-4 border-b">
                <SheetTitle>이전 대화</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col h-[calc(100dvh-4rem)]">
                <div className="p-4 border-b">
                  <Button onClick={handleNewChat} className="w-full justify-start gap-2" variant="default">
                    <Plus className="w-4 h-4" />
                    새 대화 시작
                  </Button>
                </div>
                {renderSidebarContent()}
              </div>
            </SheetContent>
          </Sheet>

          {/* 중앙 타이틀 */}
          <span className="font-medium text-sm absolute left-1/2 -translate-x-1/2">AI 코치</span>

          {/* 우측 페이지 이동 버튼 */}
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

        <div className="flex-1 overflow-hidden min-h-0">
          <ChatInterface
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
    </div>
  )
}

export default function ChatContainer({ hasApiKey, modelLabel }: { hasApiKey: boolean; modelLabel: string }) {
  return (
    <Suspense fallback={<div className="h-full flex items-center justify-center">로딩 중...</div>}>
      <ChatWorkspace hasApiKey={hasApiKey} modelLabel={modelLabel} />
    </Suspense>
  )
}

