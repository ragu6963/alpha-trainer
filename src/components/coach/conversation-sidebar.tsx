'use client'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Plus, MessageSquare, PanelLeftClose, PanelLeftOpen, Trash2 } from 'lucide-react'
import type { Conversation } from './coach-workspace'

type Props = {
  conversations: Conversation[]
  currentId: string | null
  isOpen: boolean
  onToggle: () => void
  onNewChat: () => void
  onSelectChat: (id: string) => void
  onDeleteConversation: (e: React.MouseEvent, id: string) => void
  mobileMode?: boolean
}

export function ConversationSidebar({
  conversations,
  currentId,
  isOpen,
  onToggle,
  onNewChat,
  onSelectChat,
  onDeleteConversation,
  mobileMode = false,
}: Props) {
  if (mobileMode) {
    return (
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-3">
          {conversations.map(c => (
            <ConversationItem
              key={c.id}
              conversation={c}
              isActive={c.id === currentId}
              isExpanded={true}
              onSelect={onSelectChat}
              onDelete={onDeleteConversation}
            />
          ))}
        </div>
      </ScrollArea>
    )
  }

  return (
    <>
      {/* 헤더 */}
      <div className={`flex shrink-0 items-center ${isOpen ? 'p-3 justify-between gap-2' : 'p-2 flex-col gap-2'}`}>
        {isOpen ? (
          <>
            <Button onClick={onNewChat} className="flex-1 justify-start gap-2" variant="default" size="sm">
              <Plus className="w-4 h-4" />
              새 대화
            </Button>
            <Button
              onClick={onToggle}
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
              onClick={onToggle}
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="사이드바 열기"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </Button>
            <Button
              onClick={onNewChat}
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

      {/* 대화 목록 */}
      {isOpen ? (
        <ScrollArea className="flex-1">
          <div className="space-y-1 p-3">
            {conversations.map(c => (
              <ConversationItem
                key={c.id}
                conversation={c}
                isActive={c.id === currentId}
                isExpanded={true}
                onSelect={onSelectChat}
                onDelete={onDeleteConversation}
              />
            ))}
          </div>
        </ScrollArea>
      ) : (
        <CollapsedList
          conversations={conversations}
          currentId={currentId}
          onSelectChat={onSelectChat}
        />
      )}
    </>
  )
}

function ConversationItem({
  conversation: c,
  isActive,
  isExpanded,
  onSelect,
  onDelete,
}: {
  conversation: Conversation
  isActive: boolean
  isExpanded: boolean
  onSelect: (id: string) => void
  onDelete: (e: React.MouseEvent, id: string) => void
}) {
  if (!isExpanded) return null

  return (
    <div className="group relative flex items-center">
      <Button
        onClick={() => onSelect(c.id)}
        variant={isActive ? 'secondary' : 'ghost'}
        className={`w-full justify-start font-normal pr-8 ${isActive ? 'bg-muted shadow-sm' : ''}`}
      >
        <MessageSquare className="w-4 h-4 mr-2 shrink-0 opacity-50" />
        <span className="truncate">{c.title || '새 대화'}</span>
      </Button>
      <Button
        onClick={(e) => onDelete(e, c.id)}
        variant="ghost"
        size="icon"
        className="absolute right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground hover:text-destructive"
        aria-label="대화 삭제"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  )
}

function CollapsedList({
  conversations,
  currentId,
  onSelectChat,
}: {
  conversations: Conversation[]
  currentId: string | null
  onSelectChat: (id: string) => void
}) {
  return (
    <TooltipProvider delay={200}>
      <div className="flex flex-col items-center gap-1 pt-1 px-2">
        {conversations.map(c => (
          <Tooltip key={c.id}>
            <TooltipTrigger render={
              <Button
                onClick={() => onSelectChat(c.id)}
                variant={c.id === currentId ? 'secondary' : 'ghost'}
                size="icon"
                className={`h-8 w-8 ${c.id === currentId ? 'bg-muted shadow-sm' : ''}`}
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
}
