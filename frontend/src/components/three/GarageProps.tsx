import { useMemo } from 'react'
import { useGLTF, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'

const CONE_URL = '/models/cone.glb'

export function Cone({ position, rotation = 0, height = 0.72 }: { position: [number, number, number]; rotation?: number; height?: number }) {
  const { scene } = useGLTF(CONE_URL, false, true)
  const { model, scale, offset } = useMemo(() => {
    const model = scene.clone(true)
    model.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) {
        m.castShadow = true
        m.receiveShadow = true
      }
    })
    const box = new THREE.Box3().setFromObject(model)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    return { model, scale: height / size.y, offset: new THREE.Vector3(-center.x, -box.min.y, -center.z) }
  }, [scene, height])
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <primitive object={model} position={offset} />
    </group>
  )
}

useGLTF.preload(CONE_URL, false, true)

function screenTexture(primary: string, secondary: string, kind: 'trace' | 'tower') {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 288
  const g = c.getContext('2d')!
  g.fillStyle = '#05060a'
  g.fillRect(0, 0, 512, 288)
  g.strokeStyle = 'rgba(255,255,255,0.06)'
  for (let x = 0; x < 512; x += 32) {
    g.beginPath()
    g.moveTo(x, 0)
    g.lineTo(x, 288)
    g.stroke()
  }
  if (kind === 'trace') {
    ;[primary, secondary].forEach((col, k) => {
      g.strokeStyle = col
      g.lineWidth = 3
      g.beginPath()
      for (let x = 0; x <= 512; x += 4) {
        const y = 150 + Math.sin(x / 38 + k * 0.9) * 46 + Math.sin(x / 11 + k) * 10 - k * 18
        if (x === 0) g.moveTo(x, y)
        else g.lineTo(x, y)
      }
      g.stroke()
    })
  } else {
    for (let r = 0; r < 9; r++) {
      g.fillStyle = r === 0 ? primary : 'rgba(255,255,255,0.08)'
      g.fillRect(24, 20 + r * 28, 464, 20)
      g.fillStyle = r === 0 ? '#140a00' : 'rgba(255,255,255,0.55)'
      g.fillRect(36, 27 + r * 28, 18, 6)
      g.fillRect(70, 27 + r * 28, 120 - r * 6, 6)
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function Monitor({
  position,
  rotation = 0,
  primary,
  secondary,
  kind = 'trace',
}: {
  position: [number, number, number]
  rotation?: number
  primary: string
  secondary: string
  kind?: 'trace' | 'tower'
}) {
  const tex = useMemo(() => screenTexture(primary, secondary, kind), [primary, secondary, kind])
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.012, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.18, 0.024, 20]} />
        <meshStandardMaterial color="#1a1a1c" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.2, -0.04]} rotation={[0.12, 0, 0]} castShadow>
        <boxGeometry args={[0.05, 0.38, 0.03]} />
        <meshStandardMaterial color="#2a2a2d" metalness={0.7} roughness={0.3} />
      </mesh>
      <group position={[0, 0.5, 0]} rotation={[-0.05, 0, 0]}>
        <RoundedBox args={[0.98, 0.58, 0.035]} radius={0.012} smoothness={2} castShadow>
          <meshStandardMaterial color="#0d0d0f" metalness={0.4} roughness={0.4} />
        </RoundedBox>
        <mesh position={[0, 0.01, 0.019]}>
          <planeGeometry args={[0.94, 0.52]} />
          <meshStandardMaterial map={tex} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.9} toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.27, 0.019]}>
          <boxGeometry args={[0.06, 0.008, 0.002]} />
          <meshBasicMaterial color={primary} toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}

export function Desk({ position, rotation = 0, length = 5.2, primary }: { position: [number, number, number]; rotation?: number; length?: number; primary: string }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <RoundedBox args={[1.0, 0.06, length]} radius={0.02} smoothness={2} position={[0, 0.98, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#141414" roughness={0.35} metalness={0.25} />
      </RoundedBox>
      <mesh position={[0.5, 0.98, 0]}>
        <boxGeometry args={[0.012, 0.03, length]} />
        <meshStandardMaterial color={primary} emissive={primary} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      {[-length / 2 + 0.12, length / 2 - 0.12].map((z) => (
        <mesh key={z} position={[0, 0.48, z]} castShadow>
          <boxGeometry args={[0.86, 0.96, 0.05]} />
          <meshStandardMaterial color="#1c1c1e" roughness={0.5} metalness={0.3} />
        </mesh>
      ))}
      <mesh position={[-0.3, 0.84, 0]}>
        <boxGeometry args={[0.24, 0.08, length - 0.4]} />
        <meshStandardMaterial color="#0e0e0f" roughness={0.6} />
      </mesh>
      <mesh position={[-0.42, 0.5, 0]} castShadow>
        <boxGeometry args={[0.04, 0.6, length - 0.3]} />
        <meshStandardMaterial color="#171718" roughness={0.6} />
      </mesh>
    </group>
  )
}

export function Barstool({ position, primary }: { position: [number, number, number]; primary: string }) {
  const chrome = <meshStandardMaterial color="#b9bcc2" metalness={1} roughness={0.22} />
  return (
    <group position={position}>
      <mesh position={[0, 0.015, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.22, 0.24, 0.03, 20]} />
        {chrome}
      </mesh>
      <mesh position={[0, 0.38, 0]} castShadow>
        <cylinderGeometry args={[0.028, 0.034, 0.72, 10]} />
        {chrome}
      </mesh>
      <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.16, 0.012, 6, 24]} />
        {chrome}
      </mesh>
      <mesh position={[0, 0.74, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.17, 0.04, 20]} />
        <meshStandardMaterial color="#1e1e20" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.79, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.07, 20]} />
        <meshStandardMaterial color={primary} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.828, 0]}>
        <torusGeometry args={[0.185, 0.016, 6, 24]} />
        <meshStandardMaterial color={primary} roughness={0.75} />
      </mesh>
    </group>
  )
}

function useTyreGeometry(radius: number, width: number) {
  return useMemo(() => {
    const pts: THREE.Vector2[] = []
    const inner = radius * 0.6
    const hw = width / 2
    pts.push(new THREE.Vector2(inner, -hw * 0.86))
    for (let i = 0; i <= 10; i++) {
      const a = -Math.PI / 2 + (i / 10) * Math.PI
      pts.push(new THREE.Vector2(radius - 0.05 + Math.cos(a) * 0.05, Math.sin(a) * hw))
    }
    pts.push(new THREE.Vector2(inner, hw * 0.86))
    return new THREE.LatheGeometry(pts, 28)
  }, [radius, width])
}

export function RaceTyre({ radius = 0.36, width = 0.38, compound = '#e10600' }: { radius?: number; width?: number; compound?: string }) {
  const geo = useTyreGeometry(radius, width)
  return (
    <group>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial color="#121213" roughness={0.88} side={THREE.DoubleSide} />
      </mesh>
      {[1, -1].map((s) => (
        <group key={s} position={[0, (s * width) / 2 * 0.88, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[radius * 0.82, 0.014, 4, 28]} />
            <meshStandardMaterial color={compound} roughness={0.6} />
          </mesh>
          <mesh>
            <cylinderGeometry args={[radius * 0.6, radius * 0.6, 0.018, 20]} />
            <meshStandardMaterial color="#1b1c1f" metalness={0.75} roughness={0.35} />
          </mesh>
          {Array.from({ length: 5 }, (_, i) => (
            <mesh key={i} rotation={[0, (i * Math.PI * 2) / 5, 0]} position={[0, s * 0.012, 0]}>
              <boxGeometry args={[radius * 1.02, 0.012, 0.035]} />
              <meshStandardMaterial color="#3a3c41" metalness={0.8} roughness={0.3} />
            </mesh>
          ))}
          <mesh position={[0, s * 0.02, 0]}>
            <cylinderGeometry args={[radius * 0.13, radius * 0.13, 0.03, 6]} />
            <meshStandardMaterial color="#d0d0d0" metalness={0.9} roughness={0.25} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export function TyreStack({ position, color, count = 4 }: { position: [number, number, number]; color: string; count?: number }) {
  return (
    <group position={position}>
      {Array.from({ length: count }, (_, i) => (
        <group key={i} position={[0, 0.19 + i * 0.39, 0]} rotation={[0, (i * 0.7) % 1, 0]}>
          <RaceTyre compound={color} />
        </group>
      ))}
    </group>
  )
}
