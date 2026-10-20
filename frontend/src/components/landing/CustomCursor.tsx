import { useEffect, useMemo, useRef, useState } from 'react'
import './CustomCursor.css'

function isInteractive(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(target.closest('a, button, [data-cursor]'))
}

function canUseCursor(): boolean {
  return (
    window.matchMedia('(pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const enabled = useMemo(() => canUseCursor(), [])
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!enabled) return

    let raf = 0
    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const dot = { x: mouse.x, y: mouse.y }
    const ring = { x: mouse.x, y: mouse.y }

    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
      setActive(isInteractive(e.target))
    }

    const render = () => {
      dot.x += (mouse.x - dot.x) * 0.6
      dot.y += (mouse.y - dot.y) * 0.6
      ring.x += (mouse.x - ring.x) * 0.16
      ring.y += (mouse.y - ring.y) * 0.16
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${dot.x}px, ${dot.y}px, 0)`
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0)`
      }
      raf = requestAnimationFrame(render)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    raf = requestAnimationFrame(render)
    return () => {
      window.removeEventListener('mousemove', onMove)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <div className="gt-cursor" aria-hidden="true" data-active={active}>
      <div ref={ringRef} className="gt-cursor__ring" />
      <div ref={dotRef} className="gt-cursor__dot" />
    </div>
  )
}
