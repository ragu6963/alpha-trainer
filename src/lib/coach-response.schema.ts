import { z } from 'zod'

export const workoutTypeSchema = z.enum(['easy', 'tempo', 'interval', 'long', 'lsd', 'rest'])

export const coachResponseSchema = z.object({
  text: z
    .string()
    .describe('핵심 응답 텍스트. plain Korean만 사용, 마크다운 기호 금지.'),

  bullets: z
    .array(z.string())
    .max(4)
    .optional()
    .describe('핵심 포인트 목록. 최대 4개. 각 항목은 한 문장 이내.'),

  workout: z
    .object({
      type: workoutTypeSchema,
      distanceKm: z.number().describe('목표 거리 (km)'),
      paceTarget: z.string().optional().describe('목표 페이스. 예: "6\'30\\"" '),
      notes: z
        .string()
        .describe(
          '실행 방법(어떻게), 강도 체크 기준(심박수/호흡), 컨디션별 조정 방법 중 해당되는 것을 1~2문장으로. 단순 레이블 금지.'
        ),
    })
    .optional()
    .describe('오늘 훈련 추천 시에만 포함'),

  weekPlan: z
    .array(
      z.object({
        day: z.enum(['월', '화', '수', '목', '금', '토', '일']),
        type: workoutTypeSchema,
        distanceKm: z.number().optional(),
        paceTarget: z.string().optional().describe('목표 페이스. 예: "6\'30\\"" '),
        notes: z
          .string()
          .optional()
          .describe('해당 세션의 실행 방법 또는 주의사항을 1문장으로'),
      })
    )
    .length(7)
    .optional()
    .describe('주간 계획 추천 시에만 포함. 반드시 월~일 7일 전체 포함.'),
})

export type CoachResponse = z.infer<typeof coachResponseSchema>

export const workoutLabels: Record<z.infer<typeof workoutTypeSchema>, string> = {
  easy: '회복런',
  tempo: '템포런',
  interval: '인터벌',
  long: '장거리',
  lsd: 'LSD런',
  rest: '휴식',
}
