import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { Edges, Outlines } from '@react-three/drei'
import * as THREE from 'three'
import { loftGeometry, mirrorZ, type LoftSection } from './loft'
import type { TeamLivery } from '../../theme/teams'

export type RenderMode = 'standard' | 'toon' | 'blueprint'

interface PaintCtx {
  mode: RenderMode
  line: string
  opacity: number
}

const Ctx = createContext<PaintCtx>({ mode: 'standard', line: '#111', opacity: 1 })

const toonRamp = (() => {
  const data = new Uint8Array([70, 70, 70, 255, 160, 160, 160, 255, 255, 255, 255, 255])
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat)
  tex.minFilter = THREE.NearestFilter
  tex.magFilter = THREE.NearestFilter
  tex.needsUpdate = true
  return tex
})()

export function Paint({
  color = '#ffffff',
  vertex = false,
  rough = 0.4,
  metal = 0.2,
  emissive,
  edges = true,
  ghost,
}: {
  color?: string
  vertex?: boolean
  rough?: number
  metal?: number
  emissive?: string
  edges?: boolean
  ghost?: number
}) {
  const { mode, line, opacity } = useContext(Ctx)
  const op = ghost ?? opacity
  const transparent = op < 1
  if (mode === 'blueprint') {
    return (
      <>
        <meshBasicMaterial color={line} transparent opacity={0.06 * op} depthWrite={false} side={THREE.DoubleSide} />
        {edges && <Edges threshold={18} color={line} />}
      </>
    )
  }
  if (mode === 'toon') {
    return (
      <>
        <meshToonMaterial
          color={vertex ? '#ffffff' : color}
          vertexColors={vertex}
          gradientMap={toonRamp}
          side={THREE.DoubleSide}
          transparent={transparent}
          opacity={op}
        />
        {edges && <Outlines thickness={0.012} color={line} />}
      </>
    )
  }
  return (
    <meshPhysicalMaterial
      color={vertex ? '#ffffff' : color}
      vertexColors={vertex}
      roughness={rough}
      metalness={metal}
      clearcoat={vertex ? 1 : 0.2}
      clearcoatRoughness={0.15}
      emissive={emissive ?? '#000000'}
      emissiveIntensity={emissive ? 1.4 : 0}
      side={THREE.DoubleSide}
      transparent={transparent}
      opacity={op}
      depthWrite={!transparent}
    />
  )
}

export function PaintScope({
  mode,
  line = '#111111',
  opacity = 1,
  children,
}: {
  mode: RenderMode
  line?: string
  opacity?: number
  children: ReactNode
}) {
  return <Ctx.Provider value={{ mode, line, opacity }}>{children}</Ctx.Provider>
}

const CHASSIS: LoftSection[] = [
  { x: 2.86, w: 0.12, h: 0.08, y: 0.25, n: 2.2 },
  { x: 2.6, w: 0.22, h: 0.12, y: 0.26 },
  { x: 2.1, w: 0.3, h: 0.18, y: 0.29 },
  { x: 1.5, w: 0.42, h: 0.27, y: 0.34 },
  { x: 0.95, w: 0.56, h: 0.36, y: 0.38 },
  { x: 0.45, w: 0.64, h: 0.42, y: 0.4 },
  { x: -0.1, w: 0.68, h: 0.46, y: 0.42 },
  { x: -0.35, w: 0.66, h: 0.44, y: 0.41 },
]

const ENGINE_COVER: LoftSection[] = [
  { x: -0.34, w: 0.64, h: 0.46, y: 0.42 },
  { x: -0.9, w: 0.56, h: 0.44, y: 0.44 },
  { x: -1.5, w: 0.4, h: 0.36, y: 0.42 },
  { x: -2.0, w: 0.24, h: 0.24, y: 0.36 },
  { x: -2.32, w: 0.12, h: 0.12, y: 0.32, n: 2.2 },
]

const AIRBOX: LoftSection[] = [
  { x: 0.02, w: 0.16, h: 0.12, y: 0.74, n: 2.2 },
  { x: -0.12, w: 0.24, h: 0.28, y: 0.72 },
  { x: -0.5, w: 0.26, h: 0.3, y: 0.68 },
  { x: -1.0, w: 0.18, h: 0.18, y: 0.6 },
  { x: -1.6, w: 0.06, h: 0.12, y: 0.52, n: 2.2 },
]

const SIDEPOD: LoftSection[] = [
  { x: 0.66, w: 0.34, h: 0.3, y: 0.38, z: 0.56, n: 3.6 },
  { x: 0.56, w: 0.5, h: 0.36, y: 0.37, z: 0.6, n: 3.6 },
  { x: 0.2, w: 0.6, h: 0.38, y: 0.35, z: 0.62, n: 3.4 },
  { x: -0.4, w: 0.54, h: 0.34, y: 0.32, z: 0.56, n: 3 },
  { x: -1.1, w: 0.36, h: 0.24, y: 0.27, z: 0.44, n: 2.8 },
  { x: -1.7, w: 0.16, h: 0.14, y: 0.23, z: 0.3, n: 2.4 },
  { x: -2.0, w: 0.06, h: 0.06, y: 0.22, z: 0.24, n: 2.2 },
]

const FLOOR_SHAPE = (() => {
  const s = new THREE.Shape()
  s.moveTo(1.2, 0.22)
  s.lineTo(0.75, 0.88)
  s.lineTo(-0.9, 0.9)
  s.lineTo(-1.5, 0.66)
  s.lineTo(-2.25, 0.5)
  s.lineTo(-2.25, -0.5)
  s.lineTo(-1.5, -0.66)
  s.lineTo(-0.9, -0.9)
  s.lineTo(0.75, -0.88)
  s.lineTo(1.2, -0.22)
  s.closePath()
  return s
})()

export function Tyre({
  radius = 0.36,
  width = 0.38,
  compound = '#e10600',
  rim = '#1a1a1c',
  spin = 0,
}: {
  radius?: number
  width?: number
  compound?: string
  rim?: string
  spin?: number
}) {
  const tyreGeo = useMemo(() => {
    const pts: THREE.Vector2[] = []
    const inner = radius * 0.62
    const hw = width / 2
    const steps = 14
    pts.push(new THREE.Vector2(inner, -hw * 0.92))
    for (let i = 0; i <= steps; i++) {
      const a = -Math.PI / 2 + (i / steps) * Math.PI
      const bulge = Math.cos(a)
      pts.push(new THREE.Vector2(radius - 0.06 + bulge * 0.06, Math.sin(a) * hw))
    }
    pts.push(new THREE.Vector2(inner, hw * 0.92))
    return new THREE.LatheGeometry(pts, 48)
  }, [radius, width])

  return (
    <group rotation={[Math.PI / 2, spin, 0]}>
      <mesh geometry={tyreGeo} castShadow>
        <Paint color="#0d0d0e" rough={0.9} metal={0} edges={false} />
      </mesh>
      {[1, -1].map((side) => (
        <group key={side} position={[0, (side * width) / 2 * 0.93, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[radius * 0.8, 0.012, 6, 48]} />
            <Paint color={compound} rough={0.6} metal={0} edges={false} />
          </mesh>
          <mesh>
            <cylinderGeometry args={[radius * 0.6, radius * 0.6, 0.02, 32]} />
            <Paint color={rim} rough={0.3} metal={0.8} />
          </mesh>
          <mesh position={[0, side * 0.012, 0]}>
            <cylinderGeometry args={[radius * 0.16, radius * 0.16, 0.03, 16]} />
            <Paint color="#d9d9d9" rough={0.3} metal={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Strut({ from, to, r = 0.012 }: { from: [number, number, number]; to: [number, number, number]; r?: number }) {
  const { pos, quat, len } = useMemo(() => {
    const a = new THREE.Vector3(...from)
    const b = new THREE.Vector3(...to)
    const dir = b.clone().sub(a)
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
    return { pos: a.add(b).multiplyScalar(0.5), quat: q, len: dir.length() }
  }, [from, to])
  return (
    <mesh position={pos} quaternion={quat}>
      <cylinderGeometry args={[r, r, len, 6]} />
      <Paint color="#1d1d20" rough={0.5} metal={0.4} edges={false} />
    </mesh>
  )
}

function Wing({
  x,
  y,
  span,
  chords,
  color,
  accent,
}: {
  x: number
  y: number
  span: number
  chords: { dx: number; dy: number; c: number; pitch: number }[]
  color: string
  accent: string
}) {
  return (
    <group position={[x, y, 0]}>
      {chords.map((el, i) => (
        <mesh key={i} position={[el.dx, el.dy, 0]} rotation={[0, 0, el.pitch]} castShadow>
          <boxGeometry args={[el.c, 0.022, span]} />
          <Paint color={i === chords.length - 1 ? accent : color} rough={0.35} metal={0.2} />
        </mesh>
      ))}
    </group>
  )
}

export interface F1CarProps {
  livery: TeamLivery
  mode?: RenderMode
  line?: string
  coverOpacity?: number
  coverLift?: number
  showEngine?: boolean
  wheelSpin?: number
  compound?: string
  children?: ReactNode
}

export function F1Car({
  livery,
  mode = 'standard',
  line = '#111111',
  coverOpacity = 1,
  coverLift = 0,
  showEngine = false,
  wheelSpin = 0,
  compound = '#e10600',
  children,
}: F1CarProps) {
  const body = useMemo(() => new THREE.Color(livery.body), [livery.body])
  const accent = useMemo(() => new THREE.Color(livery.accent), [livery.accent])
  const sec = useMemo(() => new THREE.Color(livery.secondary), [livery.secondary])

  const chassisGeo = useMemo(
    () =>
      loftGeometry(CHASSIS, 32, (x, y) => {
        if (y < 0.3) return accent
        if (x > 2.45) return accent
        if (x > 1.3 && x < 1.5 && y > 0.38) return sec
        return body
      }),
    [body, accent, sec],
  )
  const coverGeo = useMemo(
    () =>
      loftGeometry(ENGINE_COVER, 32, (x, y) => {
        if (y < 0.33) return accent
        if (x < -1.75) return accent
        return body
      }),
    [body, accent],
  )
  const airboxGeo = useMemo(
    () => loftGeometry(AIRBOX, 24, (x, y) => (x > -0.15 && y > 0.7 ? accent : body)),
    [body, accent],
  )
  const podPaint = useMemo(
    () => (x: number, y: number) => {
      if (x > 0.6) return accent
      if (y < 0.3) return accent
      if (y > 0.5 && x > -0.3 && x < 0.4) return sec
      return body
    },
    [body, accent, sec],
  )
  const podL = useMemo(() => loftGeometry(SIDEPOD, 28, podPaint), [podPaint])
  const podR = useMemo(() => loftGeometry(mirrorZ(SIDEPOD), 28, podPaint), [podPaint])
  const floorGeo = useMemo(
    () => new THREE.ExtrudeGeometry(FLOOR_SHAPE, { depth: 0.03, bevelEnabled: false }),
    [],
  )

  const fw = 0.33
  const rw = 0.36

  return (
    <PaintScope mode={mode} line={line}>
      <group>
        <mesh geometry={floorGeo} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.1, 0]} castShadow receiveShadow>
          <Paint color={livery.carbon} rough={0.7} metal={0.1} />
        </mesh>

        <mesh geometry={chassisGeo} castShadow>
          <Paint vertex rough={0.32} metal={0.25} />
        </mesh>
        <mesh geometry={podL} castShadow>
          <Paint vertex rough={0.32} metal={0.25} />
        </mesh>
        <mesh geometry={podR} castShadow>
          <Paint vertex rough={0.32} metal={0.25} />
        </mesh>

        {[1, -1].map((s) => (
          <mesh key={s} position={[0.67, 0.38, s * 0.6]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[0.3, 0.22]} />
            <Paint color="#050505" rough={1} metal={0} edges={false} />
          </mesh>
        ))}

        <group position={[0, coverLift, 0]}>
          <PaintScope mode={mode} line={line} opacity={coverOpacity}>
            <mesh geometry={coverGeo} castShadow={coverOpacity > 0.5}>
              <Paint vertex rough={0.32} metal={0.25} />
            </mesh>
            <mesh geometry={airboxGeo} castShadow={coverOpacity > 0.5}>
              <Paint vertex rough={0.32} metal={0.25} />
            </mesh>
            <mesh position={[-1.1, 0.72, 0]}>
              <boxGeometry args={[0.7, 0.16, 0.012]} />
              <Paint color={livery.body} rough={0.35} metal={0.2} />
            </mesh>
          </PaintScope>
        </group>

        <mesh position={[0.28, 0.6, 0]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.62, 0.05, 0.42]} />
          <Paint color="#050506" rough={0.9} metal={0} edges={false} />
        </mesh>
        <mesh position={[0.18, 0.7, 0]} castShadow>
          <sphereGeometry args={[0.13, 24, 18]} />
          <Paint color={livery.secondary} rough={0.2} metal={0.3} />
        </mesh>
        <mesh position={[0.24, 0.71, 0]} rotation={[0, 0, -0.2]}>
          <boxGeometry args={[0.06, 0.05, 0.2]} />
          <Paint color="#0a0a0a" rough={0.1} metal={0.6} edges={false} />
        </mesh>

        <group position={[0.22, 0.86, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1.25, 1, 1]}>
            <torusGeometry args={[0.3, 0.026, 10, 40, Math.PI]} />
            <Paint color={livery.accent} rough={0.3} metal={0.5} />
          </mesh>
          <Strut from={[0.37, 0, 0]} to={[0.5, -0.24, 0]} r={0.022} />
          <Strut from={[-0.02, 0, 0.3]} to={[-0.12, -0.24, 0.3]} r={0.018} />
          <Strut from={[-0.02, 0, -0.3]} to={[-0.12, -0.24, -0.3]} r={0.018} />
        </group>

        {[1, -1].map((s) => (
          <group key={s} position={[0.85, 0.66, s * 0.42]}>
            <Strut from={[0, -0.08, -s * 0.06]} to={[0, 0, 0]} r={0.01} />
            <mesh position={[0, 0.02, 0]}>
              <boxGeometry args={[0.06, 0.06, 0.16]} />
              <Paint color={livery.accent} rough={0.3} metal={0.3} />
            </mesh>
          </group>
        ))}

        <Wing
          x={2.62}
          y={0.08}
          span={1.9}
          color={livery.accent}
          accent={livery.body}
          chords={[
            { dx: 0.06, dy: 0, c: 0.36, pitch: 0.02 },
            { dx: -0.12, dy: 0.06, c: 0.24, pitch: 0.22 },
            { dx: -0.24, dy: 0.12, c: 0.18, pitch: 0.42 },
          ]}
        />
        {[1, -1].map((s) => (
          <mesh key={s} position={[2.56, 0.16, s * 0.96]} castShadow>
            <boxGeometry args={[0.56, 0.22, 0.02]} />
            <Paint color={livery.accent} rough={0.35} metal={0.2} />
          </mesh>
        ))}
        <Strut from={[2.45, 0.2, 0.06]} to={[2.55, 0.08, 0.12]} r={0.01} />
        <Strut from={[2.45, 0.2, -0.06]} to={[2.55, 0.08, -0.12]} r={0.01} />

        <Wing
          x={-2.42}
          y={0.86}
          span={1.0}
          color={livery.body}
          accent={livery.accent}
          chords={[
            { dx: 0.02, dy: 0, c: 0.32, pitch: -0.08 },
            { dx: -0.1, dy: 0.1, c: 0.2, pitch: -0.5 },
          ]}
        />
        {[1, -1].map((s) => (
          <mesh key={s} position={[-2.44, 0.76, s * 0.51]} castShadow>
            <boxGeometry args={[0.5, 0.46, 0.02]} />
            <Paint color={livery.accent} rough={0.35} metal={0.2} />
          </mesh>
        ))}
        <mesh position={[-2.38, 0.5, 0]}>
          <boxGeometry args={[0.24, 0.02, 0.8]} />
          <Paint color={livery.body} rough={0.35} metal={0.2} />
        </mesh>
        <Strut from={[-2.25, 0.4, 0]} to={[-2.4, 0.86, 0]} r={0.02} />
        <mesh position={[-2.33, 0.2, 0]}>
          <boxGeometry args={[0.1, 0.06, 0.18]} />
          <Paint color="#ff2a2a" emissive="#ff1a1a" rough={0.3} metal={0} edges={false} />
        </mesh>

        {[
          [1.68, fw, 0.82, 0.32],
          [-1.7, rw, 0.82, 0.4],
        ].map(([x, r, z, w], i) =>
          [1, -1].map((s) => (
            <group key={`${i}${s}`}>
              <group position={[x, r, s * z]}>
                <Tyre radius={r} width={w} compound={compound} spin={wheelSpin} />
              </group>
              <Strut from={[x + 0.12, r + 0.1, s * (z - w / 2)]} to={[x + 0.3, 0.42, s * 0.25]} />
              <Strut from={[x - 0.12, r + 0.1, s * (z - w / 2)]} to={[x - 0.3, 0.42, s * 0.25]} />
              <Strut from={[x + 0.1, r - 0.12, s * (z - w / 2)]} to={[x + 0.3, 0.26, s * 0.25]} />
              <Strut from={[x - 0.1, r - 0.12, s * (z - w / 2)]} to={[x - 0.3, 0.26, s * 0.25]} />
            </group>
          )),
        )}

        {showEngine && children}
      </group>
    </PaintScope>
  )
}
