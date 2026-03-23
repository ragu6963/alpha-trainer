/**
 * Coach 전용 레이아웃
 * (authenticated)/layout.tsx의 패딩을 음수 마진으로 상쇄하여
 * 모바일에서 채팅 UI가 전체 뷰포트를 채우도록 합니다.
 *
 * 부모 레이아웃 패딩: px-4 py-6 pb-20 (모바일 기준)
 * 상쇄: -mx-4 -mt-6 -mb-20
 * 결과: 콘텐츠가 main 태그의 safe-area를 꽉 채움
 */
export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    // 모바일: 부모 레이아웃 패딩 상쇄 후 전체 높이 확보
    // 데스크톱(lg): 부모 레이아웃이 그대로 처리하므로 원복
    <div className="-mx-4 -mt-6 -mb-20 lg:mx-0 lg:mt-0 lg:mb-0 flex flex-col h-[calc(100dvh-4rem)] lg:h-full">
      {children}
    </div>
  )
}
