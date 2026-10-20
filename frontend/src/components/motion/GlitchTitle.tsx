import type { CSSProperties } from 'react'
import './GlitchTitle.css'

export function GlitchTitle({
  text,
  level = 1,
  className,
}: {
  text: string
  level?: 1 | 2
  className?: string
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
          className="gt-glitch__char"
          style={{ '--gt-i': i } as CSSProperties}
        >
          {char}
        </span>
      )
    })
    return (
      <span key={`w${ti}`} className="gt-glitch__word">
        {word}
      </span>
    )
  })
  const Tag = level === 1 ? 'h1' : 'h2'
  return (
    <Tag className={['gt-glitch', className].filter(Boolean).join(' ')}>
      <span className="gt-glitch__sr">{text}</span>
      <span className="gt-glitch__chars" aria-hidden="true">
        {nodes}
      </span>
    </Tag>
  )
}
