import { RoundedBox } from '@react-three/drei'

const CARBON = '#141A21'
const CARBON_DEEP = '#0D1116'
const CARBON_RISE = '#1C242D'
const CHALK = '#D5DEE4'
const SIGNAL = '#FF5B49'
const STEEL = '#35414E'
const TYRE = '#0A0C0F'

type Vec3 = [number, number, number]

interface SingleSeater3DProps {
  position?: Vec3
  rotation?: Vec3
  scale?: number
  body?: string
  accent?: string
}

function Wheel({
  x,
  z,
  radius,
  width,
}: {
  x: number
  z: number
  radius: number
  width: number
}) {
  return (
    <group position={[x, radius, z]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[radius, radius, width, 36]} />
        <meshStandardMaterial color={TYRE} roughness={0.95} metalness={0} />
      </mesh>
      <mesh position={[0, width / 2 + 0.005, 0]}>
        <cylinderGeometry args={[radius * 0.6, radius * 0.6, 0.02, 28]} />
        <meshStandardMaterial color={STEEL} roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[0, -width / 2 - 0.005, 0]}>
        <cylinderGeometry args={[radius * 0.6, radius * 0.6, 0.02, 28]} />
        <meshStandardMaterial color={STEEL} roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[0, width / 2 + 0.02, 0]}>
        <cylinderGeometry args={[radius * 0.22, radius * 0.22, 0.03, 20]} />
        <meshStandardMaterial color={CHALK} roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, -width / 2 - 0.02, 0]}>
        <cylinderGeometry args={[radius * 0.22, radius * 0.22, 0.03, 20]} />
        <meshStandardMaterial color={CHALK} roughness={0.5} metalness={0.3} />
      </mesh>
    </group>
  )
}

function SuspensionArm({ x, y, z, depth }: { x: number; y: number; z: number; depth: number }) {
  return (
    <mesh position={[x, y, z]} castShadow>
      <boxGeometry args={[0.06, 0.03, depth]} />
      <meshStandardMaterial color={CARBON_RISE} roughness={0.5} metalness={0.2} />
    </mesh>
  )
}

export function SingleSeater3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  body = CARBON,
  accent = SIGNAL,
}: SingleSeater3DProps) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <RoundedBox args={[3.4, 0.07, 1.62]} radius={0.03} smoothness={3} position={[-0.2, 0.08, 0]} castShadow>
        <meshStandardMaterial color={CARBON_DEEP} roughness={0.55} metalness={0.25} />
      </RoundedBox>

      <RoundedBox args={[1.7, 0.42, 0.88]} radius={0.08} smoothness={4} position={[0.35, 0.44, 0]} castShadow>
        <meshStandardMaterial color={body} roughness={0.42} metalness={0.3} />
      </RoundedBox>

      <mesh position={[1.85, 0.38, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.07, 0.2, 1.3, 24]} />
        <meshStandardMaterial color={body} roughness={0.42} metalness={0.3} />
      </mesh>

      <mesh position={[0.3, 0.6, 0]}>
        <boxGeometry args={[0.95, 0.14, 0.6]} />
        <meshStandardMaterial color={CARBON_DEEP} roughness={0.85} metalness={0} />
      </mesh>

      <RoundedBox args={[1.6, 0.34, 0.44]} radius={0.06} smoothness={4} position={[-0.5, 0.36, 0.56]} castShadow>
        <meshStandardMaterial color={body} roughness={0.42} metalness={0.3} />
      </RoundedBox>
      <RoundedBox args={[1.6, 0.34, 0.44]} radius={0.06} smoothness={4} position={[-0.5, 0.36, -0.56]} castShadow>
        <meshStandardMaterial color={body} roughness={0.42} metalness={0.3} />
      </RoundedBox>
      <mesh position={[0.32, 0.44, 0.56]}>
        <boxGeometry args={[0.1, 0.18, 0.3]} />
        <meshStandardMaterial color={CARBON_DEEP} roughness={0.9} metalness={0} />
      </mesh>
      <mesh position={[0.32, 0.44, -0.56]}>
        <boxGeometry args={[0.1, 0.18, 0.3]} />
        <meshStandardMaterial color={CARBON_DEEP} roughness={0.9} metalness={0} />
      </mesh>

      <RoundedBox args={[1.5, 0.36, 0.52]} radius={0.08} smoothness={4} position={[-1.0, 0.6, 0]} castShadow>
        <meshStandardMaterial color={body} roughness={0.42} metalness={0.3} />
      </RoundedBox>
      <RoundedBox args={[0.5, 0.3, 0.38]} radius={0.07} smoothness={4} position={[-0.7, 0.9, 0]} castShadow>
        <meshStandardMaterial color={body} roughness={0.42} metalness={0.3} />
      </RoundedBox>
      <mesh position={[-0.48, 0.94, 0]}>
        <boxGeometry args={[0.1, 0.18, 0.26]} />
        <meshStandardMaterial color={CARBON_DEEP} roughness={0.9} metalness={0} />
      </mesh>

      <mesh position={[-0.55, 0.79, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[2.1, 0.03, 0.14]} />
        <meshStandardMaterial color={accent} roughness={0.35} metalness={0.1} />
      </mesh>

      <mesh position={[1.4, 0.56, 0]}>
        <boxGeometry args={[0.3, 0.02, 0.14]} />
        <meshStandardMaterial color={accent} roughness={0.35} metalness={0.1} />
      </mesh>

      <group position={[0.35, 0.8, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.4, 0.032, 12, 40]} />
          <meshStandardMaterial color={CARBON_RISE} roughness={0.35} metalness={0.45} />
        </mesh>
        <mesh position={[0.4, -0.14, 0]} rotation={[0, 0, 0.3]} castShadow>
          <cylinderGeometry args={[0.028, 0.028, 0.34, 12]} />
          <meshStandardMaterial color={CARBON_RISE} roughness={0.35} metalness={0.45} />
        </mesh>
      </group>

      <mesh position={[0.95, 0.66, 0.5]} castShadow>
        <boxGeometry args={[0.16, 0.07, 0.06]} />
        <meshStandardMaterial color={CHALK} roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh position={[0.95, 0.66, -0.5]} castShadow>
        <boxGeometry args={[0.16, 0.07, 0.06]} />
        <meshStandardMaterial color={CHALK} roughness={0.5} metalness={0.2} />
      </mesh>

      <mesh position={[2.45, 0.07, 0]} castShadow>
        <boxGeometry args={[0.55, 0.04, 1.98]} />
        <meshStandardMaterial color={body} roughness={0.42} metalness={0.3} />
      </mesh>
      <mesh position={[2.34, 0.17, 0]} rotation={[0, 0, 0.14]} castShadow>
        <boxGeometry args={[0.4, 0.035, 1.92]} />
        <meshStandardMaterial color={accent} roughness={0.35} metalness={0.1} />
      </mesh>
      <mesh position={[2.42, 0.14, 0.99]} castShadow>
        <boxGeometry args={[0.62, 0.24, 0.05]} />
        <meshStandardMaterial color={body} roughness={0.42} metalness={0.3} />
      </mesh>
      <mesh position={[2.42, 0.14, -0.99]} castShadow>
        <boxGeometry args={[0.62, 0.24, 0.05]} />
        <meshStandardMaterial color={body} roughness={0.42} metalness={0.3} />
      </mesh>

      <mesh position={[-2.4, 0.88, 0]} rotation={[0, 0, -0.16]} castShadow>
        <boxGeometry args={[0.38, 0.05, 1.06]} />
        <meshStandardMaterial color={body} roughness={0.42} metalness={0.3} />
      </mesh>
      <mesh position={[-2.54, 1.0, 0]} rotation={[0, 0, -0.36]} castShadow>
        <boxGeometry args={[0.26, 0.04, 1.06]} />
        <meshStandardMaterial color={accent} roughness={0.35} metalness={0.1} />
      </mesh>
      <mesh position={[-2.46, 0.9, 0.53]} castShadow>
        <boxGeometry args={[0.58, 0.52, 0.05]} />
        <meshStandardMaterial color={body} roughness={0.42} metalness={0.3} />
      </mesh>
      <mesh position={[-2.46, 0.9, -0.53]} castShadow>
        <boxGeometry args={[0.58, 0.52, 0.05]} />
        <meshStandardMaterial color={body} roughness={0.42} metalness={0.3} />
      </mesh>
      <mesh position={[-2.1, 0.7, 0]} castShadow>
        <boxGeometry args={[0.55, 0.34, 0.08]} />
        <meshStandardMaterial color={CARBON_RISE} roughness={0.5} metalness={0.25} />
      </mesh>
      <mesh position={[-2.5, 0.44, 0]} castShadow>
        <boxGeometry args={[0.22, 0.04, 0.84]} />
        <meshStandardMaterial color={CARBON_RISE} roughness={0.5} metalness={0.25} />
      </mesh>

      <Wheel x={1.6} z={0.84} radius={0.33} width={0.3} />
      <Wheel x={1.6} z={-0.84} radius={0.33} width={0.3} />
      <Wheel x={-1.55} z={0.86} radius={0.36} width={0.4} />
      <Wheel x={-1.55} z={-0.86} radius={0.36} width={0.4} />

      <SuspensionArm x={1.45} y={0.24} z={0.62} depth={0.44} />
      <SuspensionArm x={1.45} y={0.42} z={0.62} depth={0.44} />
      <SuspensionArm x={1.45} y={0.24} z={-0.62} depth={0.44} />
      <SuspensionArm x={1.45} y={0.42} z={-0.62} depth={0.44} />
      <SuspensionArm x={-1.4} y={0.26} z={0.6} depth={0.5} />
      <SuspensionArm x={-1.4} y={0.46} z={0.6} depth={0.5} />
      <SuspensionArm x={-1.4} y={0.26} z={-0.6} depth={0.5} />
      <SuspensionArm x={-1.4} y={0.46} z={-0.6} depth={0.5} />
    </group>
  )
}
