import { Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Line, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Tyre } from './F1Car'
import { RealCar, liveryFrom } from './RealCar'
import { PowerUnit } from './PowerUnit'
import { StudioEnv } from './StudioEnv'
import { SILVERSTONE } from '../../data/circuit'
import type { TeamTheme } from '../../theme/teams'

export type GarageView = 'car' | 'engine'

function Cone({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.03, 0]} castShadow>
        <boxGeometry args={[0.5, 0.06, 0.5]} />
        <meshStandardMaterial color="#e2571d" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.38, 0]} castShadow>
        <coneGeometry args={[0.2, 0.68, 14]} />
        <meshStandardMaterial color="#ff6a1f" roughness={0.5} flatShading />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.112, 0.142, 0.12, 14]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} />
      </mesh>
    </group>
  )
}

function TyreStack({ position, color, count = 4 }: { position: [number, number, number]; color: string; count?: number }) {
  return (
    <group position={position}>
      {Array.from({ length: count }, (_, i) => (
        <group key={i} position={[0, 0.2 + i * 0.4, 0]} rotation={[Math.PI / 2, 0, (i * 0.7) % 1]}>
          <Tyre radius={0.36} width={0.38} compound={color} />
        </group>
      ))}
    </group>
  )
}

function Trophy({ position, color, scale = 1 }: { position: [number, number, number]; color: string; scale?: number }) {
  const geo = useMemo(() => {
    const p = [
      [0.0, 0],
      [0.16, 0],
      [0.16, 0.06],
      [0.08, 0.08],
      [0.05, 0.2],
      [0.04, 0.34],
      [0.08, 0.4],
      [0.2, 0.5],
      [0.24, 0.68],
      [0.25, 0.8],
      [0.22, 0.8],
      [0.2, 0.68],
      [0.0, 0.52],
    ].map(([x, y]) => new THREE.Vector2(x, y))
    return new THREE.LatheGeometry(p, 28)
  }, [])
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.08, 0]} castShadow>
        <boxGeometry args={[0.34, 0.16, 0.34]} />
        <meshStandardMaterial color="#1b1b1d" roughness={0.4} />
      </mesh>
      <mesh geometry={geo} position={[0, 0.16, 0]} castShadow>
        <meshStandardMaterial color={color} metalness={1} roughness={0.18} side={THREE.DoubleSide} />
      </mesh>
      {[1, -1].map((s) => (
        <mesh key={s} position={[s * 0.25, 0.82, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.08, 0.016, 8, 16, Math.PI]} />
          <meshStandardMaterial color={color} metalness={1} roughness={0.2} />
        </mesh>
      ))}
    </group>
  )
}

function WallScreen({ position, rotation, color, w = 2.6, h = 1.5 }: {
  position: [number, number, number]
  rotation?: [number, number, number]
  color: string
  w?: number
  h?: number
}) {
  const pts = useMemo(
    () => SILVERSTONE.points.map(([x, y]) => new THREE.Vector3(x * h * 0.42, -y * h * 0.42, 0.031)),
    [h],
  )
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[w + 0.12, h + 0.12, 0.06]} radius={0.03} castShadow>
        <meshStandardMaterial color="#121214" roughness={0.4} />
      </RoundedBox>
      <mesh position={[0, 0, 0.031]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color="#060607" emissive="#0b0c10" roughness={0.2} />
      </mesh>
      <Line points={[...pts, pts[0]]} color={color} lineWidth={2.2} />
      <mesh position={[-w / 2 + 0.3, h / 2 - 0.14, 0.032]}>
        <planeGeometry args={[0.4, 0.06]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  )
}

function LightBar({ position, length, axis = 'x', color = '#fff3e0', intensity = 2.6 }: {
  position: [number, number, number]
  length: number
  axis?: 'x' | 'z'
  color?: string
  intensity?: number
}) {
  const args: [number, number, number] = axis === 'x' ? [length, 0.06, 0.06] : [0.06, 0.06, length]
  return (
    <mesh position={position}>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={intensity} toneMapped={false} />
    </mesh>
  )
}

function floorTexture(primary: string) {
  const c = document.createElement('canvas')
  c.width = c.height = 1024
  const g = c.getContext('2d')!
  g.fillStyle = '#1a1917'
  g.fillRect(0, 0, 1024, 1024)
  for (let i = 0; i < 9000; i++) {
    const v = 20 + Math.random() * 18
    g.fillStyle = `rgba(${v},${v - 1},${v - 2},0.5)`
    g.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2)
  }
  g.strokeStyle = 'rgba(255,255,255,0.045)'
  g.lineWidth = 2
  for (let i = 0; i <= 1024; i += 128) {
    g.beginPath()
    g.moveTo(i, 0)
    g.lineTo(i, 1024)
    g.stroke()
    g.beginPath()
    g.moveTo(0, i)
    g.lineTo(1024, i)
    g.stroke()
  }
  g.strokeStyle = primary
  g.globalAlpha = 0.14
  g.lineWidth = 2.5
  for (let k = 0; k < 9; k++) {
    g.beginPath()
    for (let a = 0; a <= Math.PI * 2 + 0.05; a += 0.05) {
      const r = 60 + k * 46 + Math.sin(a * 3 + k) * 18 + Math.cos(a * 5 - k * 0.7) * 10
      const x = 760 + Math.cos(a) * r * 1.2
      const y = 260 + Math.sin(a) * r
      if (a === 0) g.moveTo(x, y)
      else g.lineTo(x, y)
    }
    g.stroke()
  }
  g.globalAlpha = 1
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

function wallTexture(primary: string, number: number) {
  const c = document.createElement('canvas')
  c.width = 2048
  c.height = 840
  const g = c.getContext('2d')!
  g.fillStyle = '#141312'
  g.fillRect(0, 0, 2048, 840)
  for (let y = 0; y < 840; y += 6) {
    g.fillStyle = y % 12 ? 'rgba(255,255,255,0.012)' : 'rgba(0,0,0,0.12)'
    g.fillRect(0, y, 2048, 3)
  }
  g.save()
  g.fillStyle = primary
  g.globalAlpha = 0.9
  for (let i = 0; i < 3; i++) {
    g.beginPath()
    const x = 1300 + i * 170
    g.moveTo(x, 840)
    g.lineTo(x + 120, 840)
    g.lineTo(x + 420, 300)
    g.lineTo(x + 300, 300)
    g.closePath()
    g.fill()
  }
  g.restore()
  g.font = '900 520px "Archivo Variable", Archivo, sans-serif'
  g.textBaseline = 'alphabetic'
  g.lineWidth = 6
  g.strokeStyle = 'rgba(241,236,228,0.16)'
  g.strokeText(String(number), 120, 700)
  g.font = '800 54px "Archivo Variable", Archivo, sans-serif'
  g.fillStyle = 'rgba(241,236,228,0.55)'
  g.fillText('GRIDTRACE · PITWALL', 120, 160)
  g.fillStyle = primary
  g.fillRect(120, 186, 220, 10)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function sideWallTexture(primary: string) {
  const c = document.createElement('canvas')
  c.width = 1800
  c.height = 840
  const g = c.getContext('2d')!
  g.fillStyle = '#171615'
  g.fillRect(0, 0, 1800, 840)
  g.fillStyle = primary
  g.fillRect(0, 520, 1800, 320)
  g.fillStyle = 'rgba(0,0,0,0.85)'
  for (let x = 0; x < 1800; x += 14) {
    for (let y = 520; y < 840; y += 14) {
      const r = ((y - 520) / 320) * 3.4
      g.beginPath()
      g.arc(x + ((y / 14) % 2) * 7, y, r, 0, Math.PI * 2)
      g.fill()
    }
  }
  g.fillStyle = 'rgba(241,236,228,0.05)'
  for (let x = 0; x < 1800; x += 300) g.fillRect(x, 0, 2, 520)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function Room({ team }: { team: TeamTheme }) {
  const c = team.colors
  const floorTex = useMemo(() => floorTexture(c.primary), [c.primary])
  const backTex = useMemo(() => wallTexture(c.primary, team.number), [c.primary, team.number])
  const sideTex = useMemo(() => sideWallTexture(c.primary), [c.primary])

  return (
    <group>
      <mesh position={[0, -0.2, 0]} receiveShadow>
        <boxGeometry args={[11, 0.4, 9]} />
        <meshStandardMaterial attach="material-0" color="#121110" />
        <meshStandardMaterial attach="material-1" color="#121110" />
        <meshStandardMaterial attach="material-2" map={floorTex} roughness={0.38} metalness={0.15} />
        <meshStandardMaterial attach="material-3" color="#0d0c0b" />
        <meshStandardMaterial attach="material-4" color={c.primary} emissive={c.primary} emissiveIntensity={0.25} />
        <meshStandardMaterial attach="material-5" color="#121110" />
      </mesh>
      <mesh position={[0, -0.42, 0]}>
        <boxGeometry args={[11.4, 0.1, 9.4]} />
        <meshStandardMaterial color="#0a0a09" />
      </mesh>

      {[-1, 1].map((s) => (
        <mesh key={s} position={[0.4, 0.004, s * 1.65]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[6.6, 0.07]} />
          <meshBasicMaterial color={c.primary} toneMapped={false} />
        </mesh>
      ))}
      {[-2.9, 3.7].map((x) => (
        <mesh key={x} position={[x, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.07, 3.37]} />
          <meshBasicMaterial color={c.primary} toneMapped={false} />
        </mesh>
      ))}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[-2.4 + i * 0.75, 0.005, 2.35]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
          <planeGeometry args={[0.06, 0.6]} />
          <meshBasicMaterial color="#f1ece4" transparent opacity={0.35} />
        </mesh>
      ))}
      <mesh position={[0.4, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7, 4.2]} />
        <meshBasicMaterial map={glowTex} color={c.primary} transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      <mesh position={[0, 2.25, -4.62]} receiveShadow castShadow>
        <boxGeometry args={[11, 4.5, 0.24]} />
        <meshStandardMaterial attach="material-0" color="#121110" />
        <meshStandardMaterial attach="material-1" color="#121110" />
        <meshStandardMaterial attach="material-2" color="#1b1a19" />
        <meshStandardMaterial attach="material-3" color="#121110" />
        <meshStandardMaterial attach="material-4" map={backTex} roughness={0.85} />
        <meshStandardMaterial attach="material-5" color="#121110" />
      </mesh>
      <LightBar position={[0, 4.3, -4.42]} length={10.6} />
      <LightBar position={[0, 0.08, -4.44]} length={10.6} color={c.primary} intensity={3} />

      <mesh position={[-5.62, 2.25, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.24, 4.5, 9.24]} />
        <meshStandardMaterial attach="material-0" map={sideTex} roughness={0.85} />
        <meshStandardMaterial attach="material-1" color="#121110" />
        <meshStandardMaterial attach="material-2" color="#1b1a19" />
        <meshStandardMaterial attach="material-3" color="#121110" />
        <meshStandardMaterial attach="material-4" color="#121110" />
        <meshStandardMaterial attach="material-5" color="#121110" />
      </mesh>
      <LightBar position={[-5.44, 4.3, 0]} length={9} axis="z" />
      <LightBar position={[-5.46, 0.08, 0]} length={9} axis="z" color={c.primary} intensity={3} />

      <WallScreen position={[-1.6, 2.75, -4.48]} color={c.primary} />
      <WallScreen position={[1.4, 2.75, -4.48]} color={c.secondary} w={1.8} h={1.5} />

      <group position={[-4.9, 0, 0.6]}>
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.0, 1.0, 5.2]} />
          <meshStandardMaterial color="#1c1b1a" roughness={0.6} />
        </mesh>
        <mesh position={[0.51, 0.86, 0]}>
          <boxGeometry args={[0.02, 0.06, 5.2]} />
          <meshStandardMaterial color={c.primary} emissive={c.primary} emissiveIntensity={1.2} toneMapped={false} />
        </mesh>
        <mesh position={[0, 1.02, 0]}>
          <boxGeometry args={[1.06, 0.04, 5.26]} />
          <meshStandardMaterial color="#0f0f10" roughness={0.25} metalness={0.4} />
        </mesh>
        {[-1.4, 1.2].map((z) => (
          <group key={z} position={[-0.1, 1.42, z]} rotation={[0, Math.PI / 2, 0]}>
            <RoundedBox args={[1.1, 0.7, 0.05]} radius={0.02} castShadow>
              <meshStandardMaterial color="#0c0c0c" />
            </RoundedBox>
            <mesh position={[0, 0, 0.03]}>
              <planeGeometry args={[1.0, 0.6]} />
              <meshStandardMaterial color="#05060a" emissive={z < 0 ? c.secondary : c.primary} emissiveIntensity={0.55} />
            </mesh>
            <mesh position={[0, -0.45, -0.05]}>
              <boxGeometry args={[0.06, 0.2, 0.06]} />
              <meshStandardMaterial color="#222" />
            </mesh>
          </group>
        ))}
      </group>
      {[-1.2, 0.2, 1.6].map((z) => (
        <group key={z} position={[-4.0, 0, z]}>
          <mesh position={[0, 0.36, 0]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, 0.72, 8]} />
            <meshStandardMaterial color="#777" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.74, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.2, 0.08, 18]} />
            <meshStandardMaterial color={c.primary} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.01, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.02, 18]} />
            <meshStandardMaterial color="#333" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      ))}

      <group position={[4.1, 0, -3.7]}>
        <mesh position={[0, 1.3, -0.25]} castShadow receiveShadow>
          <boxGeometry args={[2.4, 2.6, 0.3]} />
          <meshStandardMaterial color="#0e0d0d" roughness={0.5} />
        </mesh>
        <mesh position={[0, 1.3, -0.09]}>
          <planeGeometry args={[2.2, 2.4]} />
          <meshBasicMaterial map={glowTex} color={c.primary} transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        {[0.55, 1.45].map((y) => (
          <mesh key={y} position={[0, y, 0.05]} castShadow>
            <boxGeometry args={[2.3, 0.05, 0.5]} />
            <meshStandardMaterial color="#d9d4cc" roughness={0.2} metalness={0.1} transparent opacity={0.75} />
          </mesh>
        ))}
        <Trophy position={[-0.7, 0.58, 0.05]} color="#d4a53c" />
        <Trophy position={[0, 0.58, 0.05]} color="#d9dadc" scale={1.15} />
        <Trophy position={[0.7, 0.58, 0.05]} color="#c27b47" />
        <Trophy position={[-0.45, 1.48, 0.05]} color="#d4a53c" scale={0.85} />
        <Trophy position={[0.45, 1.48, 0.05]} color="#d9dadc" scale={0.85} />
        <LightBar position={[0, 2.5, 0.1]} length={2.2} color={c.primary} intensity={3} />
      </group>

      <TyreStack position={[4.6, 0, 1.2]} color="#e10600" />
      <TyreStack position={[4.6, 0, 2.1]} color="#ffd12e" count={3} />
      <TyreStack position={[3.9, 0, 3.7]} color="#f2f2f2" count={2} />
      <Cone position={[1.2, 0, 3.7]} />
      <Cone position={[2.1, 0, 3.9]} />
      <Cone position={[-0.4, 0, 3.8]} />

      <group position={[-3.4, 0, 3.4]}>
        <mesh position={[0, 0.45, 0]} castShadow>
          <boxGeometry args={[0.9, 0.9, 0.6]} />
          <meshStandardMaterial color="#1e1d1c" roughness={0.4} metalness={0.3} />
        </mesh>
        {[0.2, 0.45, 0.7].map((y) => (
          <mesh key={y} position={[0, y, 0.31]}>
            <boxGeometry args={[0.8, 0.03, 0.02]} />
            <meshStandardMaterial color={c.primary} emissive={c.primary} emissiveIntensity={0.6} />
          </mesh>
        ))}
        {[-0.35, 0.35].map((x) =>
          [-0.22, 0.22].map((z) => (
            <mesh key={`${x}${z}`} position={[x, 0.04, z]}>
              <sphereGeometry args={[0.05, 8, 6]} />
              <meshStandardMaterial color="#111" />
            </mesh>
          )),
        )}
      </group>
      <mesh position={[-2.6, 0.32, 3.9]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.64, 14]} />
        <meshStandardMaterial color="#c81d14" roughness={0.3} />
      </mesh>
    </group>
  )
}

const glowTex = (() => {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.5, 'rgba(255,255,255,0.35)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
})()

function useTween(target: number, speed = 4) {
  const [v, setV] = useState(target)
  const cur = useRef(target)
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      cur.current += (target - cur.current) * Math.min(1, dt * speed)
      if (Math.abs(target - cur.current) < 0.002) cur.current = target
      setV(cur.current)
      if (cur.current !== target) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, speed])
  return v
}

function CameraRig({ view, azimuth }: { view: GarageView; azimuth: MutableRefObject<number> }) {
  const { camera, size } = useThree()
  const look = useRef(new THREE.Vector3(0, 0.6, 0))
  const az = useRef(azimuth.current)

  useFrame((_, dt) => {
    const engine = view === 'engine'
    const k = Math.min(1, dt * 3.2)
    const goalLook = engine ? new THREE.Vector3(-1.0, 0.5, 0) : new THREE.Vector3(0, 0.8, 0)
    look.current.lerp(goalLook, k)
    const goalAz = engine ? azimuth.current - 1.25 : azimuth.current
    az.current += (goalAz - az.current) * k
    const polar = engine ? 0.95 : 0.98
    const r = 24
    camera.position.set(
      look.current.x + r * Math.sin(polar) * Math.cos(az.current),
      look.current.y + r * Math.cos(polar),
      look.current.z + r * Math.sin(polar) * Math.sin(az.current),
    )
    camera.lookAt(look.current)
    const ortho = camera as THREE.OrthographicCamera
    const base = Math.min(size.width / 13.5, size.height / 9.5)
    const goalZoom = engine ? base * 2.4 : base
    ortho.zoom += (goalZoom - ortho.zoom) * k
    ortho.updateProjectionMatrix()
  })
  return null
}

export default function GarageScene({
  team,
  view,
  paused,
  activePart,
  onSelectPart,
}: {
  team: TeamTheme
  view: GarageView
  paused: boolean
  activePart: string | null
  onSelectPart: (id: string) => void
}) {
  const azimuth = useRef(Math.PI / 4)
  const drag = useRef<{ x: number; az: number } | null>(null)
  const engine = view === 'engine'
  const cover = useTween(engine ? 0.12 : 1)
  const livery = useMemo(() => liveryFrom(team.livery), [team])

  return (
    <Canvas
      orthographic
      shadows
      dpr={[1, 2]}
      frameloop={paused ? 'never' : 'always'}
      camera={{ position: [17, 17, 17], zoom: 60, near: 0.1, far: 200 }}
      gl={{ antialias: true }}
      style={{ position: 'absolute', inset: 0, touchAction: 'pan-y', cursor: 'grab' }}
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, az: azimuth.current }
        ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (!drag.current) return
        const next = drag.current.az + (e.clientX - drag.current.x) * 0.006
        azimuth.current = THREE.MathUtils.clamp(next, Math.PI / 4 - 0.75, Math.PI / 4 + 0.75)
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
    >
      <color attach="background" args={[team.colors.dark]} />
      <fog attach="fog" args={[team.colors.dark, 30, 60]} />
      <hemisphereLight args={['#ffe9d2', '#1a120c', 0.25]} />
      <spotLight position={[0.4, 7, 0.5]} angle={0.55} penumbra={0.7} intensity={140} color="#ffe6c8" castShadow shadow-mapSize={[1024, 1024]} />
      <spotLight position={[-3, 3.5, -4]} angle={0.9} penumbra={1} intensity={60} color={team.colors.primary} />
      <spotLight position={[5, 3, 4]} angle={0.9} penumbra={1} intensity={30} color={team.colors.secondary} />
      <directionalLight
        position={[6, 12, 8]}
        intensity={0.7}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-bias={-0.0004}
      />
      <StudioEnv tint={team.colors.primary} intensity={0.35} />
      <Room team={team} />
      <group position={[0.4, 0, 0]} rotation={[0, 0, 0]}>
        <Suspense fallback={null}>
          <RealCar livery={livery} ghostBody={cover} />
        </Suspense>
        {cover < 0.99 && (
          <group position={[0.1, 0.06, 0]}>
            <PowerUnit accent={team.colors.primary} showLabels={engine && cover < 0.3} active={activePart} onSelect={onSelectPart} />
          </group>
        )}
      </group>
      <ContactShadows position={[0.4, 0.002, 0]} opacity={0.5} scale={8} blur={2} far={1.2} />
      <CameraRig view={view} azimuth={azimuth} />
    </Canvas>
  )
}
