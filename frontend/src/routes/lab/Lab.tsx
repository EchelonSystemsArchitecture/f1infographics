import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import { useSearchParams } from 'react-router-dom'
import { StudioEnv } from '../../components/three/StudioEnv'
import { F1Car, type RenderMode } from '../../components/three/F1Car'
import { PowerUnit } from '../../components/three/PowerUnit'
import { RealCar, liveryFrom } from '../../components/three/RealCar'
import { TEAMS } from '../../theme/teams'

export function Lab() {
  const [params] = useSearchParams()
  const mode = (params.get('mode') as RenderMode) ?? 'standard'
  const engine = params.has('engine')
  const real = params.has('real')
  const view = params.get('view') ?? 'three'
  const team = TEAMS.papaya
  const cam: [number, number, number] =
    view === 'top' ? [0, 9, 0.001] : view === 'side' ? [0, 0.6, 7] : view === 'rear' ? [-5, 2.2, 2.6] : view === 'front' ? [6, 1.6, 2.4] : [4.6, 2.6, 5]

  return (
    <div style={{ height: '100svh', background: mode === 'blueprint' ? '#d8113a' : '#1a1918' }}>
      <Canvas shadows camera={{ position: cam, fov: 32 }} dpr={[1, 2]}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[4, 8, 3]} intensity={2.4} castShadow />
        <StudioEnv />
        <Suspense fallback={null}>
          {real ? (
            <RealCar livery={liveryFrom(team.livery)} mode={mode} line={mode === 'blueprint' ? '#ffffff' : '#111111'} />
          ) : (
            <F1Car
              livery={team.livery}
              mode={mode}
              line={mode === 'blueprint' ? '#ffffff' : '#111111'}
              coverOpacity={engine ? 0.12 : 1}
              showEngine={engine}
            >
              <PowerUnit accent={team.colors.primary} />
            </F1Car>
          )}
        </Suspense>
        <axesHelper args={[3]} />
        <ContactShadows position={[0, 0, 0]} opacity={0.6} scale={10} blur={2.4} far={2} />
        <OrbitControls target={[0, 0.4, 0]} />
      </Canvas>
    </div>
  )
}
