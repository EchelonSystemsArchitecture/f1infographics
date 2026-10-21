import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import type { RenderMode } from '../three/F1Car'
import { RealCar, liveryFrom } from '../three/RealCar'
import { StudioEnv } from '../three/StudioEnv'
import type { TeamTheme } from '../../theme/teams'

export interface StudyShot {
  mode: RenderMode
  camera: [number, number, number]
  rotation: [number, number, number]
  zoom: number
  line: string
  lights?: 'flat' | 'rim'
}

export default function StudyCanvas({ team, shot, angle = 0 }: { team: TeamTheme; shot: StudyShot; angle?: number }) {
  const livery = useMemo(() => liveryFrom(team.livery), [team])
  return (
    <Canvas
      orthographic
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ position: shot.camera, zoom: shot.zoom, near: 0.1, far: 100 }}
      gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
      onCreated={({ camera }) => camera.lookAt(0, 0.4, 0)}
      style={{ position: 'absolute', inset: 0 }}
    >
      {shot.lights === 'rim' ? (
        <>
          <ambientLight intensity={0.05} />
          <spotLight position={[-3, 2, -4]} intensity={160} angle={0.8} penumbra={1} color={team.colors.secondary} />
          <spotLight position={[3, 3, 4]} intensity={90} angle={0.8} penumbra={1} color={team.colors.primary} />
          <StudioEnv tint={team.colors.primary} intensity={0.25} />
        </>
      ) : (
        <>
          <ambientLight intensity={0.9} />
          <directionalLight position={[3, 6, 4]} intensity={2.2} />
        </>
      )}
      <group rotation={[shot.rotation[0], shot.rotation[1] + angle, shot.rotation[2]]}>
        <Suspense fallback={null}>
          <RealCar livery={livery} mode={shot.mode} line={shot.line} castShadow={false} />
        </Suspense>
      </group>
    </Canvas>
  )
}
