'use client'

import { useEffect } from 'react'

export default function GlobalError({
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
    <html lang="ko">
      <body style={{ margin: 0, fontFamily: 'sans-serif', background: '#fff', color: '#111' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            gap: '1rem',
            textAlign: 'center',
            padding: '1rem',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>심각한 오류가 발생했습니다</h2>
          <p style={{ fontSize: '0.875rem', color: '#666', maxWidth: '24rem' }}>
            페이지를 불러오는 중 오류가 발생했습니다. 새로고침 후에도 문제가 지속되면
            잠시 후 다시 시도해주세요.
            {error.digest && (
              <span
                style={{ display: 'block', marginTop: '0.25rem', fontFamily: 'monospace', fontSize: '0.75rem', opacity: 0.5 }}
              >
                오류 코드: {error.digest}
              </span>
            )}
          </p>
          <button
            onClick={unstable_retry}
            style={{
              padding: '0.5rem 1.25rem',
              border: '1px solid #ccc',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              background: '#fff',
            }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  )
}
