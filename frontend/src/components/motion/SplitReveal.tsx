import type { CSSProperties } from 'react'
import './SplitReveal.css'

export function SplitReveal({
  text,
  className,
  delayMs = 0,
}: {
  text: string
  className?: string
  delayMs?: number
}) {
  const tokens = text.split(/(\s+)/)
  let charIndex = 0
  const nodes = tokens.map((token, ti) => {
    if (/^\s+$/.test(token)) return <span key={`s${ti}`}> </span>
    const word = Array.from(token).map((char) => {
      const i = charIndex++
      return (
        <span
          key={i}
          className="gt-split__char"
          style={{ '--gt-i': i, '--gt-delay': `${delayMs}ms` } as CSSProperties}
        >
          {char}
        </span>
      )
    })
    return (
      <span key={`w${ti}`} className="gt-split__word">
        {word}
      </span>
    )
  })
  return (
    <span className={['gt-split', className].filter(Boolean).join(' ')}>
      <span className="gt-split__sr">{text}</span>
      <span aria-hidden="true">{nodes}</span>
    </span>
  )
}
