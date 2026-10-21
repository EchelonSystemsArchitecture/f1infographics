import type { ReactElement } from 'react'

export const ICONS: ReactElement[] = [
  <>
    <path d="M5 21V3" />
    <path d="M5 4h14v10H5" />
    <path d="M5 4h4.7v3.3H5zM14.3 4H19v3.3h-4.7zM9.7 7.3h4.6v3.4H9.7zM5 10.7h4.7V14H5zM14.3 10.7H19V14h-4.7z" fill="currentColor" stroke="none" />
  </>,
  <>
    <path d="M3 6l6 6-6 6" />
    <path d="M21 6l-6 6 6 6" />
    <path d="M12 3v18" strokeDasharray="2.5 2.5" />
  </>,
  <>
    <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
  </>,
  <>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
  </>,
  <>
    <path d="M4 15a8 8 0 0 1 16-3v6H8a4 4 0 0 1-4-3z" />
    <path d="M10 12h10" />
    <path d="M8 18v3M16 18v3" />
  </>,
  <>
    <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z" />
  </>,
  <>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="1.8" fill="currentColor" />
    <path d="M12 1.5v5M12 17.5v5M1.5 12h5M17.5 12h5" />
  </>,
  <>
    <rect x="3" y="4" width="18" height="5" rx="1" />
    <path d="M5 9v10h14V9" />
    <path d="M10 13h4" />
  </>,
]

export const SETTINGS = (
  <>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2.2" />
    <circle cx="9" cy="17" r="2.2" />
  </>
)

export function Icon({ children, size = 22 }: { children: ReactElement; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

