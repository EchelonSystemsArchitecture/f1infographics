import { useEffect, useRef, useState } from 'react'

export const EASE_OUT = [0.23, 1, 0.32, 1] as [number, number, number, number]
export const EASE_IN_OUT = [0.77, 0, 0.175, 1] as [number, number, number, number]

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

export function useInView<T extends HTMLElement>(threshold = 0.15): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true)
            obs.disconnect()
          }
        }
      },
      { threshold },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, inView]
}

export const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.22, ease: EASE_OUT },
}

export const staggerParent = {
  animate: { transition: { staggerChildren: 0.045, delayChildren: 0.08 } },
}

export const staggerChild = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } },
}

export const wipeIn = {
  initial: { opacity: 0, clipPath: 'inset(0 100% 0 0)' },
  animate: { opacity: 1, clipPath: 'inset(0 0% 0 0)', transition: { duration: 0.5, ease: EASE_IN_OUT } },
}
