import { Environment, Lightformer } from '@react-three/drei'

export function StudioEnv({ tint = '#ff8000', intensity = 1 }: { tint?: string; intensity?: number }) {
  return (
    <Environment resolution={256} frames={1}>
      <color attach="background" args={['#050505']} />
      <Lightformer form="rect" intensity={3 * intensity} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[10, 3, 1]} />
      <Lightformer form="rect" intensity={2 * intensity} position={[-6, 2, 1]} rotation-y={Math.PI / 2} scale={[8, 1.2, 1]} />
      <Lightformer form="rect" intensity={2 * intensity} position={[6, 2, -1]} rotation-y={-Math.PI / 2} scale={[8, 1.2, 1]} />
      <Lightformer form="ring" color={tint} intensity={4 * intensity} position={[0, 3, -6]} scale={3} />
      <Lightformer form="rect" color={tint} intensity={1.5 * intensity} position={[0, 0.5, 6]} scale={[10, 0.6, 1]} />
    </Environment>
  )
}
