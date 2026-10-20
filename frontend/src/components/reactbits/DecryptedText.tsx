import { useEffect, useId, useMemo, useRef, useState } from 'react'
import './DecryptedText.css'

const SCRAMBLE_POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

type DecryptedTextProps = {
  text: string
  speed?: number
  maxIterations?: number
  sequential?: boolean
  animateOn?: 'view' | 'hover'
  className?: string
}

type Segment = { type: 'word' | 'gap'; indices: number[] }

function prefersReduced(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function randomGlyph(): string {
  return SCRAMBLE_POOL[Math.floor(Math.random() * SCRAMBLE_POOL.length)]
}

function isBlank(c: string): boolean {
  return /\s/.test(c)
}

function initialFrame(chars: string[]): string[] {
  return chars.map((c) => (isBlank(c) ? c : randomGlyph()))
}

function buildSegments(chars: string[]): Segment[] {
  const segments: Segment[] = []
  let i = 0
  while (i < chars.length) {
    if (isBlank(chars[i])) {
      const gap: number[] = []
      while (i < chars.length && isBlank(chars[i])) {
        gap.push(i)
        i += 1
      }
      segments.push({ type: 'gap', indices: gap })
    } else {
      const word: number[] = []
      while (i < chars.length && !isBlank(chars[i])) {
        word.push(i)
        i += 1
      }
      segments.push({ type: 'word', indices: word })
    }
  }
  return segments
}

export function DecryptedText({
  text,
  speed = 45,
  maxIterations = 12,
  sequential = true,
  animateOn = 'view',
  className = '',
}: DecryptedTextProps) {
  const chars = useMemo(() => Array.from(text), [text])
  const segments = useMemo(() => buildSegments(chars), [chars])
  const srId = useId()
  const hostRef = useRef<HTMLSpanElement>(null)
  const reduced = useMemo(() => prefersReduced(), [])
  const [animFrame, setAnimFrame] = useState<string[]>(() => initialFrame(chars))
  const [animDone, setAnimDone] = useState(false)
  const frame = reduced ? chars : animFrame
  const done = reduced ? true : animDone

  useEffect(() => {
    if (reduced) return
    const host = hostRef.current
    if (!host) return

    let cancelled = false
    let timer: ReturnType<typeof setInterval> | null = null
    let started = false

    const clear = () => {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
    }

    const run = () => {
      if (started || cancelled) return
      started = true
      setAnimFrame(initialFrame(chars))
      setAnimDone(false)
      let iteration = 0
      const revealAt = chars.map((_, i) =>
        sequential ? Math.floor((i / Math.max(1, chars.length)) * maxIterations) : 0,
      )
      timer = setInterval(() => {
        if (cancelled) return
        iteration += 1
        const next = chars.map((c, i) => {
          if (isBlank(c)) return c
          if (iteration > revealAt[i] + 3) return c
          if (iteration > revealAt[i]) return Math.random() < 0.6 ? c : randomGlyph()
          return randomGlyph()
        })
        setAnimFrame(next)
        if (iteration > maxIterations + 3) {
          clear()
          setAnimFrame(chars)
          setAnimDone(true)
        }
      }, speed)
    }

    if (animateOn === 'hover') {
      const onEnter = () => {
        started = false
        run()
      }
      host.addEventListener('mouseenter', onEnter)
      return () => {
        cancelled = true
        clear()
        host.removeEventListener('mouseenter', onEnter)
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          run()
          observer.disconnect()
        }
      },
      { threshold: 0.4 },
    )
    observer.observe(host)
    return () => {
      cancelled = true
      clear()
      observer.disconnect()
    }
  }, [reduced, chars, speed, maxIterations, sequential, animateOn])

  return (
    <span ref={hostRef} className={`gt-dtext ${className}`} data-done={done}>
      <span id={srId} className="gt-dtext__sr">
        {text}
      </span>
      <span className="gt-dtext__view" aria-hidden="true">
        {segments.map((seg, si) =>
          seg.type === 'gap' ? (
            <span key={`g${si}`} className="gt-dtext__gap">
              {' '}
            </span>
          ) : (
            <span key={`w${si}`} className="gt-dtext__word">
              {seg.indices.map((ci) => (
                <span key={ci} className="gt-dtext__cell">
                  {frame[ci]}
                </span>
              ))}
            </span>
          ),
        )}
      </span>
    </span>
  )
}
