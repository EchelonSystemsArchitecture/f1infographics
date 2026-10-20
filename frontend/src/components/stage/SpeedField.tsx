import { useEffect, useRef } from 'react'
import './SpeedField.css'

const STREAK_COUNT = 40
const MIN_LEN = 20
const MAX_LEN = 90
const MIN_SPEED = 30
const MAX_SPEED = 120
const MIN_ALPHA = 0.04
const MAX_ALPHA = 0.18
const BASE_COLOUR = '#a8b0be'
const SIGNAL_COLOUR = '#ff4d2e'
const SIGNAL_EVERY = 7

export function SpeedField({ className }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const xs = new Float32Array(STREAK_COUNT)
    const ys = new Float32Array(STREAK_COUNT)
    const lens = new Float32Array(STREAK_COUNT)
    const speeds = new Float32Array(STREAK_COUNT)
    const alphas = new Float32Array(STREAK_COUNT)
    const gaps = new Float32Array(STREAK_COUNT)
    const signal = new Uint8Array(STREAK_COUNT)

    for (let i = 0; i < STREAK_COUNT; i++) {
      lens[i] = MIN_LEN + Math.random() * (MAX_LEN - MIN_LEN)
      speeds[i] = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED)
      alphas[i] = (MIN_ALPHA + Math.random() * (MAX_ALPHA - MIN_ALPHA)) * (reduced ? 0.6 : 1)
      ys[i] = Math.random()
      xs[i] = Math.random() * 1400
      gaps[i] = Math.random() * 260
      signal[i] = i % SIGNAL_EVERY === 3 ? 1 : 0
    }

    let w = 0
    let h = 0
    let raf = 0
    let last = 0
    let running = false

    const paint = () => {
      ctx.clearRect(0, 0, w, h)
      for (let i = 0; i < STREAK_COUNT; i++) {
        ctx.globalAlpha = alphas[i]
        ctx.fillStyle = signal[i] === 1 ? SIGNAL_COLOUR : BASE_COLOUR
        ctx.fillRect(xs[i], ys[i] * h, lens[i], 1)
      }
      ctx.globalAlpha = 1
    }

    const step = (t: number) => {
      raf = requestAnimationFrame(step)
      const dt = last === 0 ? 0 : Math.min((t - last) / 1000, 0.05)
      last = t
      for (let i = 0; i < STREAK_COUNT; i++) {
        xs[i] -= speeds[i] * dt
        if (xs[i] + lens[i] < 0) {
          xs[i] = w + gaps[i]
        }
      }
      paint()
    }

    const start = () => {
      if (running || reduced || document.visibilityState === 'hidden') return
      running = true
      last = 0
      raf = requestAnimationFrame(step)
    }

    const stop = () => {
      running = false
      if (raf !== 0) {
        cancelAnimationFrame(raf)
        raf = 0
      }
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = root.clientWidth
      h = root.clientHeight
      canvas.width = Math.max(1, Math.round(w * dpr))
      canvas.height = Math.max(1, Math.round(h * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (w > 0) {
        for (let i = 0; i < STREAK_COUNT; i++) {
          if (xs[i] > w) xs[i] = xs[i] % w
        }
      }
      paint()
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') stop()
      else start()
    }

    const ro = new ResizeObserver(resize)
    ro.observe(root)
    document.addEventListener('visibilitychange', onVisibility)
    resize()
    start()

    return () => {
      stop()
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <div ref={rootRef} className={`gt-speedfield${className ? ` ${className}` : ''}`}>
      <canvas ref={canvasRef} className="gt-speedfield__canvas" />
    </div>
  )
}
