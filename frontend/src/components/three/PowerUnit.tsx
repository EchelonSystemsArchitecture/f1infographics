import { useMemo, useState } from 'react'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { Paint } from './F1Car'
import { PU_PARTS } from './puParts'

const ALLOY = '#8f949b'
const DARK_ALLOY = '#3a3d42'
const HEAT = '#c99a3b'
const CARBON = '#161618'


function Pipe({ points, r = 0.018, color = HEAT }: { points: [number, number, number][]; r?: number; color?: string }) {
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)))
    return new THREE.TubeGeometry(curve, 24, r, 8, false)
  }, [points, r])
  return (
    <mesh geometry={geo}>
      <Paint color={color} rough={0.35} metal={0.9} edges={false} />
    </mesh>
  )
}

function Bank({ side, accent }: { side: 1 | -1; accent: string }) {
  return (
    <group position={[-0.9, 0.38, 0]} rotation={[side * 0.78, 0, 0]}>
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[0.66, 0.2, 0.16]} />
        <Paint color={ALLOY} rough={0.45} metal={0.8} />
      </mesh>
      <mesh position={[0, 0.29, 0]}>
        <boxGeometry args={[0.7, 0.06, 0.14]} />
        <Paint color={DARK_ALLOY} rough={0.3} metal={0.7} />
      </mesh>
      {[-0.22, 0, 0.22].map((x) => (
        <mesh key={x} position={[x, 0.34, 0]}>
          <cylinderGeometry args={[0.022, 0.022, 0.06, 10]} />
          <Paint color={accent} rough={0.3} metal={0.2} edges={false} />
        </mesh>
      ))}
    </group>
  )
}

export function PowerUnit({
  accent,
  showLabels = true,
  active,
  onSelect,
}: {
  accent: string
  showLabels?: boolean
  active?: string | null
  onSelect?: (id: string) => void
}) {
  const [hover, setHover] = useState<string | null>(null)
  const focus = active ?? hover

  return (
    <group>
      <mesh position={[-0.9, 0.3, 0]}>
        <boxGeometry args={[0.8, 0.2, 0.3]} />
        <Paint color={DARK_ALLOY} rough={0.5} metal={0.7} />
      </mesh>
      <Bank side={1} accent={accent} />
      <Bank side={-1} accent={accent} />

      <mesh position={[-0.9, 0.52, 0]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.07, 0.5, 6, 16]} />
        <Paint color={CARBON} rough={0.6} metal={0.2} />
      </mesh>
      <mesh position={[-0.9, 0.42, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.36, 18]} />
        <Paint color={focus === 'mguh' ? accent : '#5b6068'} rough={0.3} metal={0.9} />
      </mesh>

      <group position={[-0.42, 0.44, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.07, 0.04, 12, 28]} />
          <Paint color={focus === 'turbo' ? accent : ALLOY} rough={0.25} metal={0.95} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.07, 0.08, 20]} />
          <Paint color={ALLOY} rough={0.25} metal={0.95} />
        </mesh>
      </group>
      <group position={[-1.42, 0.42, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.075, 0.045, 12, 28]} />
          <Paint color={focus === 'turbo' ? accent : HEAT} rough={0.3} metal={0.9} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.06, 0.06, 0.1, 20]} />
          <Paint color={HEAT} rough={0.3} metal={0.9} />
        </mesh>
      </group>

      {[1, -1].map((s) =>
        [-0.22, 0, 0.22].map((x) => (
          <Pipe
            key={`${s}${x}`}
            points={[
              [-0.9 + x, 0.36, s * 0.24],
              [-0.9 + x, 0.3, s * 0.3],
              [-1.25, 0.32, s * 0.2],
              [-1.42, 0.38, s * 0.06],
            ]}
          />
        )),
      )}
      <Pipe
        points={[
          [-1.48, 0.42, 0],
          [-1.8, 0.36, 0],
          [-2.2, 0.3, 0],
        ]}
        r={0.04}
      />

      <mesh position={[-0.55, 0.2, 0.2]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, 0.16, 20]} />
        <Paint color={focus === 'mguk' ? accent : '#4b4f56'} rough={0.35} metal={0.8} />
      </mesh>

      <mesh position={[-0.2, 0.16, 0]}>
        <boxGeometry args={[0.36, 0.1, 0.42]} />
        <Paint color={focus === 'es' ? accent : CARBON} rough={0.6} metal={0.2} />
      </mesh>
      <mesh position={[-0.2, 0.212, 0]}>
        <boxGeometry args={[0.36, 0.006, 0.06]} />
        <Paint color={accent} rough={0.6} metal={0.2} edges={false} />
      </mesh>

      <mesh position={[-1.85, 0.28, 0]} rotation={[0, 0, 0.06]}>
        <boxGeometry args={[0.7, 0.2, 0.24]} />
        <Paint color={focus === 'gearbox' ? accent : CARBON} rough={0.55} metal={0.3} />
      </mesh>

      {showLabels &&
        PU_PARTS.map((p) => (
          <Html key={p.id} position={p.anchor} center distanceFactor={4.5} zIndexRange={[20, 0]}>
            <button
              type="button"
              className={`pu-tag${focus === p.id ? ' is-active' : ''}`}
              onPointerEnter={() => setHover(p.id)}
              onPointerLeave={() => setHover(null)}
              onClick={() => onSelect?.(p.id)}
            >
              <span className="pu-tag__dot" />
              {p.label}
            </button>
          </Html>
        ))}
    </group>
  )
}
