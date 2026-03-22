'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
      <h2 className="text-xl font-semibold">문제가 발생했습니다</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
        {error.digest && (
          <span className="block mt-1 font-mono text-xs opacity-50">
            오류 코드: {error.digest}
          </span>
        )}
      </p>
      <Button onClick={unstable_retry}>다시 시도</Button>
    </div>
  )
}
