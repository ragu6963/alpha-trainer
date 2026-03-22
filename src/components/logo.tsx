export function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="7" fill="#fc4c02" />

      {/* Head (outline) */}
      <circle cx="23" cy="5" r="2.5" fill="none" stroke="white" strokeWidth="1.8" />

      {/* Torso */}
      <line x1="22" y1="8" x2="15" y2="18" stroke="white" strokeWidth="2.5" strokeLinecap="round" />

      {/* Back arm (left-up) */}
      <line x1="20" y1="11" x2="12" y2="8" stroke="white" strokeWidth="2" strokeLinecap="round" />

      {/* Front arm (right) */}
      <line x1="20" y1="11" x2="28" y2="14" stroke="white" strokeWidth="2" strokeLinecap="round" />

      {/* Front leg */}
      <line x1="15" y1="18" x2="22" y2="28" stroke="white" strokeWidth="2.5" strokeLinecap="round" />

      {/* Front foot (right) */}
      <line x1="22" y1="28" x2="27" y2="27" stroke="white" strokeWidth="2" strokeLinecap="round" />

      {/* Back leg upper */}
      <line x1="15" y1="18" x2="9" y2="23" stroke="white" strokeWidth="2.5" strokeLinecap="round" />

      {/* Back leg lower (bent knee — foot kicks up) */}
      <line x1="9" y1="23" x2="6" y2="17" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
