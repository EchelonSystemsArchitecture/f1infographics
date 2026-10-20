import { useEffect, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { animate } from 'animejs'
import { useClock } from '../../store/clock'
import './SpeedTunnel.css'

type Flow = { v: number }
type FlowRef = { current: Flow }

type Field = {
  positions: Float32Array
  factors: Float32Array
  lengths: Float32Array
  positionAttr: THREE.BufferAttribute
  geometry: THREE.BufferGeometry
  material: THREE.LineBasicMaterial
  scatter: (o: number) => void
}

const STREAK_COUNT = 600
const MIN_RADIUS = 2
const MAX_RADIUS = 40
const Z_SPAWN = -80
const Z_RANGE = 90
const Z_WRAP = 6
const FLOW_SCALE = 30
const SIGNAL_RATIO = 0.12
const BASE_COLOR = new THREE.Color('#a8b0be')
const SIGNAL_COLOR = new THREE.Color('#ff4d2e')

function buildField(): Field {
  const positions = new Float32Array(STREAK_COUNT * 6)
  const colors = new Float32Array(STREAK_COUNT * 6)
  const factors = new Float32Array(STREAK_COUNT)
  const lengths = new Float32Array(STREAK_COUNT)

  const scatter = (o: number) => {
    const angle = Math.random() * Math.PI * 2
    const radius = MIN_RADIUS + Math.pow(Math.random(), 1.5) * (MAX_RADIUS - MIN_RADIUS)
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    positions[o] = x
    positions[o + 1] = y
    positions[o + 3] = x
    positions[o + 4] = y
  }

  for (let i = 0; i < STREAK_COUNT; i++) {
    const o = i * 6
    scatter(o)
    const len = 0.5 + Math.random() * 2.5
    const z = Z_SPAWN + Math.random() * Z_RANGE
    positions[o + 2] = z
    positions[o + 5] = z - len
    lengths[i] = len
    factors[i] = 0.6 + Math.random() * 0.8

    const signal = Math.random() < SIGNAL_RATIO
    const color = signal ? SIGNAL_COLOR : BASE_COLOR
    const head = signal ? 0.5 + Math.random() * 0.35 : 0.25 + Math.random() * 0.4
    const tail = head * 0.25
    colors[o] = color.r * head
    colors[o + 1] = color.g * head
    colors[o + 2] = color.b * head
    colors[o + 3] = color.r * tail
    colors[o + 4] = color.g * tail
    colors[o + 5] = color.b * tail
  }

  const geometry = new THREE.BufferGeometry()
  const positionAttr = new THREE.BufferAttribute(positions, 3)
  geometry.setAttribute('position', positionAttr)
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  return { positions, factors, lengths, positionAttr, geometry, material, scatter }
}

function Streaks({ flowRef }: { flowRef: FlowRef }) {
  const playing = useClock((s) => s.playing)
  const speed = useClock((s) => s.speed)
  const fieldRef = useRef<Field | null>(null)
  const linesRef = useRef<THREE.LineSegments | null>(null)

  useEffect(() => {
    const field = buildField()
    fieldRef.current = field
    const lines = linesRef.current
    if (lines) {
      lines.geometry = field.geometry
      lines.material = field.material
    }
    return () => {
      field.geometry.dispose()
      field.material.dispose()
      fieldRef.current = null
    }
  }, [])

  useEffect(() => {
    const target = playing ? speed : 0
    const tween = animate(flowRef.current, { v: target, duration: 600, ease: 'outQuad' })
    return () => {
      tween.cancel()
    }
  }, [playing, speed, flowRef])

  useFrame((_, delta) => {
    const field = fieldRef.current
    if (!field || document.hidden) return
    const v = flowRef.current.v
    if (v <= 0.001) return
    const { positions, factors, lengths, positionAttr, scatter } = field
    const step = v * Math.min(delta, 0.05) * FLOW_SCALE
    for (let i = 0; i < STREAK_COUNT; i++) {
      const o = i * 6
      const z = positions[o + 2] + step * factors[i]
      if (z > Z_WRAP) {
        scatter(o)
        const nz = Z_SPAWN + Math.random() * 8
        positions[o + 2] = nz
        positions[o + 5] = nz - lengths[i]
      } else {
        positions[o + 2] = z
        positions[o + 5] = z - lengths[i]
      }
    }
    positionAttr.needsUpdate = true
  })

  return <lineSegments ref={linesRef} frustumCulled={false} />
}

export function SpeedTunnel({ className }: { className?: string }) {
  const reduced =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const flowRef = useRef<Flow>({ v: 0 })
  const cls = `gt-speedtunnel${className ? ` ${className}` : ''}`

  if (reduced) return <div className={cls} />

  return (
    <div className={cls}>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 0], fov: 70, near: 0.1, far: 120 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        style={{ pointerEvents: 'none' }}
      >
        <Streaks flowRef={flowRef} />
      </Canvas>
    </div>
  )
}
