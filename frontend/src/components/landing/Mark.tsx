export function Mark({ className, size = 44 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M6 30 L18 8 H42 L38 16 H23 L15 30 Z" fill="currentColor" />
      <path d="M10 40 L20 22 H36 L26 40 Z" fill="currentColor" opacity="0.88" />
      <path d="M28 40 L33 31 H44 L39 40 Z" fill="currentColor" opacity="0.6" />
    </svg>
  )
}
