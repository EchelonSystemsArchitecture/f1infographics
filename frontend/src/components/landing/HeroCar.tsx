import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RealCar, liveryFrom } from '../three/RealCar'
import { StudioEnv } from '../three/StudioEnv'
import type { TeamTheme } from '../../theme/teams'

function Rig({ team, intro, paused }: { team: TeamTheme; intro: boolean; paused: boolean }) {
  const group = useRef<THREE.Group>(null)
  const key = useRef<THREE.DirectionalLight>(null)
  const t0 = useRef<number | null>(null)
  const pointer = useRef({ x: 0, y: 0 })
  const livery = useMemo(() => liveryFrom(team.livery), [team])

  useFrame((state) => {
    if (paused || !group.current) return
    const now = state.clock.elapsedTime
    if (intro && t0.current === null) t0.current = now
    const p = t0.current === null ? 0 : Math.min((now - t0.current) / 1.8, 1)
    const ease = 1 - Math.pow(1 - p, 4)
    pointer.current.x += (state.pointer.x - pointer.current.x) * 0.05
    pointer.current.y += (state.pointer.y - pointer.current.y) * 0.05
    const g = group.current
    g.position.z = THREE.MathUtils.lerp(9, 0.2, ease) + Math.sin(now * 0.8) * 0.04
    g.position.x = pointer.current.x * 0.2
    g.rotation.y = Math.PI / 2 - pointer.current.x * 0.06
    if (key.current) {
      key.current.position.set(-pointer.current.x * 6, 5.5, pointer.current.y * 5)
      key.current.target.position.set(0, 0, 0)
      key.current.target.updateMatrixWorld()
    }
  })

  return (
    <>
      <directionalLight
        ref={key}
        position={[0, 5.5, 0]}
        intensity={3.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-normalBias={0.03}
      />
      <group ref={group} position={[0, 0, 9]} rotation={[0, Math.PI / 2, 0]}>
        <Suspense fallback={null}>
          <RealCar livery={livery} />
        </Suspense>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.001, 0]}>
        <planeGeometry args={[40, 40]} />
        <shadowMaterial opacity={0.6} />
      </mesh>
    </>
  )
}

export default function HeroCar({ team, intro, paused }: { team: TeamTheme; intro: boolean; paused: boolean }) {
  return (
    <Canvas
      orthographic
      shadows
      dpr={[1, 2]}
      frameloop={paused ? 'never' : 'always'}
      camera={{ position: [0, 20, 0.0001], zoom: 118, near: 0.1, far: 100 }}
      gl={{ alpha: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <ambientLight intensity={0.15} />
      <spotLight position={[0, 9, 0]} angle={0.5} penumbra={0.8} intensity={70} color={team.colors.primary} />
      <StudioEnv tint={team.colors.primary} intensity={0.8} />
      <Rig team={team} intro={intro} paused={paused} />
    </Canvas>
  )
}
