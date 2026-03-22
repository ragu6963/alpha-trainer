/**
 * 공통 API 에러 응답 포맷 유틸리티
 */

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'USER_NOT_FOUND'
  | 'NOT_FOUND'
  | 'BAD_REQUEST'
  | 'MISSING_FIELDS'
  | 'INTERNAL_ERROR'
  | 'STRAVA_ERROR'
  | 'LLM_KEY_NOT_FOUND'
  | 'LLM_KEY_INVALID'

export function apiError(code: ApiErrorCode, status: number, message?: string) {
  return Response.json({ error: code, ...(message ? { message } : {}) }, { status })
}

export const Errors = {
  unauthorized: () => apiError('UNAUTHORIZED', 401),
  userNotFound: () => apiError('USER_NOT_FOUND', 404),
  notFound: (message?: string) => apiError('NOT_FOUND', 404, message),
  badRequest: (message?: string) => apiError('BAD_REQUEST', 400, message),
  missingFields: () => apiError('MISSING_FIELDS', 400),
  internal: (message?: string) => apiError('INTERNAL_ERROR', 500, message),
}
