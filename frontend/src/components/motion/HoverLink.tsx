import type { ReactNode } from 'react'
import './HoverLink.css'

export function HoverLink({
  href,
  children,
  variant = 'baseline',
  arrow = false,
  external = false,
  className,
}: {
  href: string
  children: ReactNode
  variant?: 'baseline' | 'below'
  arrow?: boolean
  external?: boolean
  className?: string
}) {
  const classes = [
    'gt-hlink',
    `gt-hlink--${variant}`,
    arrow ? 'gt-hlink--arrow' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <a
      href={href}
      className={classes}
      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
    >
      <span className="gt-hlink__text">{children}</span>
      {arrow ? (
        <svg
          className="gt-hlink__arrow"
          viewBox="0 0 10 10"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M1.004 9.166 9.337.833m0 0v8.333m0-8.333H1.004"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </a>
  )
}
