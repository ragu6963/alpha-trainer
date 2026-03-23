'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ChatInterface from './chat-interface'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Menu, Plus, MessageSquare, PanelLeftClose, PanelLeftOpen } from 'lucide-react'

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

  const renderSidebarContent = () => (
    <ScrollArea className="flex-1">
      <div className="space-y-1 p-3">
        {conversations.map(c => (
          <Button
            key={c.id}
            onClick={() => handleSelectChat(c.id)}
            variant={c.id === currentId ? "secondary" : "ghost"}
            className={`w-full justify-start font-normal ${c.id === currentId ? 'bg-muted shadow-sm' : ''}`}
          >
            <MessageSquare className="w-4 h-4 mr-2 shrink-0 opacity-50" />
            <span className="truncate">{c.title || '새 대화'}</span>
          </Button>
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
    <div className="flex h-full rounded-xl overflow-hidden bg-background md:h-[calc(100dvh-8rem)]">
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
        <div className="md:hidden flex items-center p-3 border-b bg-background/95 backdrop-blur-sm shrink-0">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="mr-2" />}>
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
          <span className="font-medium text-sm">AI 코치</span>
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

