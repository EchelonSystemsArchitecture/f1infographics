import { useEffect, useRef, useState } from 'react'

export function useInView<T extends Element>(rootMargin = '200px', once = false) {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting)
        if (entry.isIntersecting) {
          setSeen(true)
          if (once) io.disconnect()
        }
      },
      { rootMargin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [rootMargin, once])

  return [ref, inView, seen] as const
}
