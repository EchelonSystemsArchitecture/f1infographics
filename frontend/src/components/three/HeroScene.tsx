import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SingleSeater3D } from './SingleSeater3D'

function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name)
  return value.trim() || fallback
}

interface HeroSceneProps {
  onReady?: () => void
}

function Rig({ reducedMotion, onReady }: { reducedMotion: boolean; onReady?: () => void }) {
  const group = useRef<THREE.Group>(null)
  const elapsed = useRef(0)
  const fired = useRef(false)

  useEffect(() => {
    if (reducedMotion && !fired.current) {
      fired.current = true
      onReady?.()
    }
  }, [reducedMotion, onReady])

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    if (reducedMotion) {
      g.position.y = 0
      g.rotation.y = 0
      return
    }
    if (elapsed.current >= 0.5) {
      if (!fired.current) {
        fired.current = true
        onReady?.()
      }
      return
    }
    elapsed.current = Math.min(elapsed.current + delta, 0.5)
    const t = elapsed.current / 0.5
    const eased = 1 - Math.pow(1 - t, 3)
    g.position.y = 0.6 * (1 - eased)
    g.rotation.y = 0.9 * (1 - eased)
    if (elapsed.current >= 0.5 && !fired.current) {
      fired.current = true
      onReady?.()
    }
  })

  return (
    <group ref={group} position={[0, 0.6, 0]} rotation={[0, 0.9, 0]}>
      <SingleSeater3D />
    </group>
  )
}

export default function HeroScene({ onReady }: HeroSceneProps) {
  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )
  const fog = cssVar('--gt-scene-fog', '#080a0d')
  const chalk = cssVar('--gt-scene-chalk', '#d5dde4')
  const grid = cssVar('--gt-scene-grid', '#222c35')
  const ground = cssVar('--gt-canvas', '#0b0e12')

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [4.2, 2.4, 4.8], fov: 32, near: 0.1, far: 50 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ scene }) => {
        scene.fog = new THREE.Fog(fog, 6, 18)
      }}
    >
      <hemisphereLight args={[chalk, ground, 0.9]} />
      <directionalLight position={[3, 5, 4]} intensity={1.2} color={chalk} />
      <directionalLight position={[-4, 2, -3]} intensity={0.3} color={grid} />
      <gridHelper args={[14, 14, grid, grid]} position={[0, -0.01, 0]} />
      <Rig reducedMotion={reducedMotion} onReady={onReady} />
    </Canvas>
  )
}
