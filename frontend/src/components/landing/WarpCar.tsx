import { Suspense, useMemo, useRef, type MutableRefObject } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RealCar, liveryFrom } from '../three/RealCar'
import { StudioEnv } from '../three/StudioEnv'
import type { TeamTheme } from '../../theme/teams'

const TRAIL_LEN = 46
const WHEELS: { x: number; z: number; front: boolean }[] = [
  { x: 1.32, z: 0.8, front: true },
  { x: 1.32, z: -0.8, front: true },
  { x: -2.4, z: 0.8, front: false },
  { x: -2.4, z: -0.8, front: false },
]

const trailVertex = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const trailFragment = `
uniform vec3 uColor;
uniform float uTime;
uniform float uIntensity;
varying vec2 vUv;
void main() {
  float along = vUv.x;
  float across = abs(vUv.y - 0.5) * 2.0;
  float core = smoothstep(1.0, 0.0, across);
  core = pow(core, 2.2);
  float tail = pow(along, 1.6);
  float pulse = 0.65 + 0.35 * smoothstep(0.2, 1.0, fract(along * 7.0 + uTime * 2.4));
  float head = smoothstep(1.0, 0.975, along);
  float a = core * tail * pulse * head * uIntensity;
  vec3 col = mix(uColor, vec3(1.0), core * core * 0.55 * tail);
  gl_FragColor = vec4(col * a, a);
}`

const roadVertex = `
varying vec3 vPos;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vPos = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`

const roadFragment = `
uniform float uOffset;
uniform vec3 uBase;
uniform vec3 uLine;
uniform vec3 uGlowA;
uniform vec3 uGlowB;
varying vec3 vPos;
float band(float v, float c, float w) { return smoothstep(w, 0.0, abs(v - c)); }
void main() {
  float x = vPos.x + uOffset;
  float z = vPos.z;
  vec3 col = uBase;
  float grain = fract(sin(dot(floor(vPos.xz * 18.0), vec2(12.9898, 78.233))) * 43758.5453);
  col += (grain - 0.5) * 0.012;
  float dash = step(0.55, fract(x / 5.0));
  float lanes = band(z, 2.4, 0.05) * dash + band(z, -2.4, 0.05) * dash;
  float edges = band(z, 6.4, 0.07) + band(z, -6.4, 0.07);
  col += uLine * (lanes * 0.55 + edges * 0.35);
  float az = abs(z);
  float kerb = step(6.55, az) * step(az, 7.35);
  float kb = step(0.5, fract(x / 1.4));
  vec3 kerbCol = mix(vec3(0.62, 0.06, 0.05), vec3(0.78, 0.76, 0.72), kb);
  col = mix(col, kerbCol * 0.55, kerb);
  float sheen = exp(-pow(az - 0.8, 2.0) * 0.6) * smoothstep(-30.0, -2.0, vPos.x) * 0.05;
  col += mix(uGlowA, uGlowB, step(0.0, -z)) * sheen;
  float underA = exp(-pow((z - 0.82) * 1.6, 2.0)) * smoothstep(-40.0, -1.0, vPos.x) * smoothstep(3.0, -1.0, vPos.x);
  float underB = exp(-pow((z + 0.82) * 1.6, 2.0)) * smoothstep(-40.0, -1.0, vPos.x) * smoothstep(3.0, -1.0, vPos.x);
  col += uGlowA * underA * 0.16 + uGlowB * underB * 0.16;
  float pool = exp(-dot(vPos.xz, vPos.xz) * 0.12);
  col += mix(uGlowA, uGlowB, 0.5) * pool * 0.08;
  float fade = smoothstep(-70.0, -20.0, vPos.x) * smoothstep(40.0, 10.0, vPos.x) * smoothstep(16.0, 7.0, abs(z));
  gl_FragColor = vec4(col * fade, 1.0);
}`

function Trail({ x, z, color, timeRef, intensity, wall }: {
  wall: boolean
  x: number
  z: number
  color: string
  timeRef: MutableRefObject<number>
  intensity: MutableRefObject<number>
}) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: trailVertex,
        fragmentShader: trailFragment,
        uniforms: {
          uColor: { value: new THREE.Color(color) },
          uTime: { value: 0 },
          uIntensity: { value: 1 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [color],
  )
  const glowMat = useMemo(() => {
    const g = mat.clone()
    g.uniforms = THREE.UniformsUtils.clone(mat.uniforms)
    return g
  }, [mat])
  useFrame(() => {
    mat.uniforms.uTime.value = timeRef.current
    mat.uniforms.uIntensity.value = intensity.current
    glowMat.uniforms.uTime.value = timeRef.current
    glowMat.uniforms.uIntensity.value = intensity.current * 0.22
  })
  return (
    <group position={[x - TRAIL_LEN / 2, 0, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} material={mat}>
        <planeGeometry args={[TRAIL_LEN, 0.42]} />
      </mesh>
      {wall && (
        <mesh position={[0, 0.16, 0]} material={mat}>
          <planeGeometry args={[TRAIL_LEN, 0.3]} />
        </mesh>
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} material={glowMat}>
        <planeGeometry args={[TRAIL_LEN, 1.6]} />
      </mesh>
      <sprite position={[TRAIL_LEN / 2 - 0.05, 0.08, 0]} scale={[1.1, 0.55, 1]}>
        <spriteMaterial map={flareTex} color={color} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
    </group>
  )
}

const STREAKS = 110

function radialTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.25, 'rgba(255,255,255,0.55)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}

function streakTexture() {
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createLinearGradient(0, 0, 0, 128)
  grad.addColorStop(0, 'rgba(255,255,255,0)')
  grad.addColorStop(0.75, 'rgba(255,255,255,0.8)')
  grad.addColorStop(0.95, 'rgba(255,255,255,1)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 4, 128)
  return new THREE.CanvasTexture(c)
}

const flareTex = typeof document !== 'undefined' ? radialTexture() : null
const streakAlpha = typeof document !== 'undefined' ? streakTexture() : null

function Streaks({ colors, speed, near }: { colors: string[]; speed: MutableRefObject<number>; near: MutableRefObject<number> }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const data = useMemo(() => {
    const rand = (a: number, b: number) => a + Math.random() * (b - a)
    return Array.from({ length: STREAKS }, (_, i) => {
      const side = i % 2 ? 1 : -1
      return {
        x: rand(-80, 30),
        y: rand(0.08, 1.4),
        z: side > 0 ? rand(1.9, 4.2) : -rand(1.9, 9),
        len: rand(2.5, 9),
        r: rand(0.012, 0.035),
        v: rand(0.7, 1.4),
        color: new THREE.Color(colors[i % colors.length]).multiplyScalar(rand(1.2, 2.4)),
      }
    })
  }, [colors])
  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame((_, dt) => {
    const m = mesh.current
    if (!m) return
    const step = Math.min(dt, 0.05) * speed.current
    data.forEach((d, i) => {
      d.x -= step * d.v
      if (d.x < -90) d.x = 30 + Math.random() * 20
      dummy.position.set(d.x, d.y, d.z)
      dummy.rotation.set(0, 0, Math.PI / 2)
      const k = d.z > 0 ? near.current : 1
      dummy.scale.set(d.r * k, d.len * (0.6 + speed.current / 90) * k, d.r * k)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
      m.setColorAt(i, d.color)
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, STREAKS]} frustumCulled={false}>
      <cylinderGeometry args={[1, 1, 1, 6]} />
      <meshBasicMaterial toneMapped={false} transparent alphaMap={streakAlpha} blending={THREE.AdditiveBlending} depthWrite={false} />
    </instancedMesh>
  )
}

const SPARKS = 260
const EMITTERS: [number, number, number][] = [
  [-2.0, 0.03, 0.62],
  [-2.0, 0.03, -0.62],
  [-1.1, 0.02, 0.3],
  [-1.1, 0.02, -0.3],
  [-2.55, 0.05, 0],
]

interface Spark {
  p: THREE.Vector3
  v: THREE.Vector3
  life: number
  max: number
  len: number
  c: THREE.Color
}

function Sparks({ speed, boost }: { speed: MutableRefObject<number>; boost: MutableRefObject<number> }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const pool = useMemo<Spark[]>(
    () =>
      Array.from({ length: SPARKS }, () => ({
        p: new THREE.Vector3(),
        v: new THREE.Vector3(),
        life: 0,
        max: 0,
        len: 0,
        c: new THREE.Color(),
      })),
    [],
  )
  const palette = useMemo(() => ['#fff6d6', '#ffd27a', '#ffb347', '#ff7a1a'].map((c) => new THREE.Color(c)), [])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const dir = useMemo(() => new THREE.Vector3(), [])
  const xAxis = useMemo(() => new THREE.Vector3(1, 0, 0), [])
  const tmp = useMemo(() => new THREE.Color(), [])
  const acc = useRef(0)
  const next = useRef(0)

  useFrame((state, dt) => {
    const m = mesh.current
    if (!m) return
    const d = Math.min(dt, 0.05)
    const rate = 70 + boost.current * 420 + (Math.sin(state.clock.elapsedTime * 3.7) > 0.92 ? 600 : 0)
    acc.current += rate * d
    while (acc.current >= 1) {
      acc.current -= 1
      const s = pool[next.current]
      next.current = (next.current + 1) % SPARKS
      const e = EMITTERS[Math.floor(Math.random() * EMITTERS.length)]
      s.p.set(e[0] + (Math.random() - 0.5) * 0.3, e[1], e[2] + (Math.random() - 0.5) * 0.25)
      const k = speed.current / 40
      s.v.set(-(4 + Math.random() * 9) * k, 0.6 + Math.random() * 2.6, (Math.random() - 0.5) * 2.4)
      s.max = 0.25 + Math.random() * 0.45
      s.life = s.max
      s.len = 0.08 + Math.random() * 0.22
      s.c.copy(palette[Math.floor(Math.random() * palette.length)])
    }
    for (let i = 0; i < SPARKS; i++) {
      const s = pool[i]
      if (s.life <= 0) {
        dummy.scale.setScalar(0)
        dummy.updateMatrix()
        m.setMatrixAt(i, dummy.matrix)
        continue
      }
      s.life -= d
      s.v.y -= 9.8 * d
      s.p.addScaledVector(s.v, d)
      if (s.p.y < 0.005) {
        s.p.y = 0.005
        s.v.y *= -0.35
        s.v.x *= 0.7
      }
      const t = Math.max(0, s.life / s.max)
      dir.copy(s.v).normalize()
      dummy.position.copy(s.p)
      dummy.quaternion.setFromUnitVectors(xAxis, dir)
      const stretch = s.len * (0.4 + s.v.length() * 0.08)
      dummy.scale.set(stretch, 0.012 * (0.5 + t), 0.012 * (0.5 + t))
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
      tmp.copy(s.c).multiplyScalar(1.2 + t * 2.2)
      m.setColorAt(i, tmp)
    }
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, SPARKS]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial toneMapped={false} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
    </instancedMesh>
  )
}

const HAZE = 46

function Haze({ speed, color }: { speed: MutableRefObject<number>; color: string }) {
  const points = useRef<THREE.Points>(null)
  const data = useMemo(() => {
    const pos = new Float32Array(HAZE * 3)
    const seed = Array.from({ length: HAZE }, (_, i) => ({ side: i % 2 ? 1 : -1, t: Math.random() }))
    return { pos, seed }
  }, [])
  const tex = useMemo(() => flareTex, [])

  useFrame((_, dt) => {
    const p = points.current
    if (!p) return
    const d = Math.min(dt, 0.05)
    const k = speed.current / 40
    data.seed.forEach((s, i) => {
      s.t += d * (0.9 + k * 0.6)
      if (s.t > 1) s.t -= 1
      const x = -2.2 - s.t * 7
      const y = 0.15 + s.t * 0.7
      const z = s.side * (0.8 + s.t * 0.9) + Math.sin(i * 12.3 + s.t * 6) * 0.15
      data.pos.set([x, y, z], i * 3)
    })
    const attr = p.geometry.getAttribute('position') as THREE.BufferAttribute
    attr.needsUpdate = true
  })

  return (
    <points ref={points} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.pos, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={tex}
        color={color}
        size={1.6}
        sizeAttenuation
        transparent
        opacity={0.09}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

function Road({ team, offset }: { team: TeamTheme; offset: MutableRefObject<number> }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: roadVertex,
        fragmentShader: roadFragment,
        uniforms: {
          uOffset: { value: 0 },
          uBase: { value: new THREE.Color('#0b0a0a') },
          uLine: { value: new THREE.Color('#d9d4cc') },
          uGlowA: { value: new THREE.Color(team.colors.primary) },
          uGlowB: { value: new THREE.Color(team.colors.secondary) },
        },
      }),
    [team],
  )
  useFrame(() => {
    mat.uniforms.uOffset.value = offset.current
  })
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-15, 0, 0]} material={mat}>
      <planeGeometry args={[130, 34]} />
    </mesh>
  )
}

function Rig({ team, progress }: { team: TeamTheme; progress: MutableRefObject<number> }) {
  const car = useRef<THREE.Group>(null)
  const rim = useRef<THREE.SpotLight>(null)
  const time = useRef(0)
  const speed = useRef(40)
  const offset = useRef(0)
  const glow = useRef(1)
  const boostRef = useRef(0)
  const near = useRef(1)
  const look = useMemo(() => new THREE.Vector3(), [])
  const right = useMemo(() => new THREE.Vector3(), [])
  const livery = useMemo(() => liveryFrom(team.livery), [team])

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05)
    const p = progress.current
    const boost = THREE.MathUtils.smoothstep(p, 0.25, 0.4) * (1 - THREE.MathUtils.smoothstep(p, 0.55, 0.7))
    const target = 40 + boost * 70
    speed.current += (target - speed.current) * Math.min(1, d * 2.5)
    time.current += d * (speed.current / 40)
    offset.current += d * speed.current
    glow.current = 0.8 + boost * 0.7
    boostRef.current = boost

    const swing = THREE.MathUtils.smoothstep(p, 0.55, 0.95)
    near.current = 1 - THREE.MathUtils.smoothstep(swing, 0.05, 0.4)
    const angle = THREE.MathUtils.lerp(Math.PI, Math.PI * 0.6, swing)
    const dist = THREE.MathUtils.lerp(9.2, 8.6, swing) - boost * 0.8
    const height = THREE.MathUtils.lerp(2.0, 1.15, swing)
    const shake = boost * 0.012
    state.camera.position.set(
      Math.cos(angle) * dist + Math.sin(time.current * 31) * shake,
      height + Math.sin(time.current * 27) * shake,
      Math.sin(angle) * dist * 0.92,
    )
    const cam = state.camera as THREE.PerspectiveCamera
    cam.fov = 30 + boost * 8
    cam.updateProjectionMatrix()

    look.set(0, 0.45, 0)
    state.camera.lookAt(look)
    const wide = state.size.width > 900
    right.setFromMatrixColumn(state.camera.matrixWorld, 0)
    look.addScaledVector(right, wide ? -1.7 : 0)
    state.camera.lookAt(look)

    if (car.current) {
      car.current.position.y = Math.sin(time.current * 40) * 0.006
      car.current.rotation.x = Math.sin(time.current * 5.1) * 0.004
      car.current.rotation.y = Math.sin(time.current * 0.9) * 0.012
    }
    if (rim.current) rim.current.intensity = 40 + swing * 150
  })

  const front = team.colors.secondary
  const rear = team.colors.primary

  return (
    <>
      <fog attach="fog" args={[team.colors.darker, 18, 60]} />
      <spotLight ref={rim} position={[-4, 3, -3]} angle={0.6} penumbra={1} color={team.colors.secondary} intensity={40} />
      <spotLight position={[4, 2.4, 2]} angle={0.7} penumbra={1} color={team.colors.primary} intensity={60} />
      <pointLight position={[-1.5, 0.15, 0]} color={rear} intensity={6} distance={4} />
      <pointLight position={[1.5, 0.15, 0]} color={front} intensity={4} distance={3.5} />
      <Road team={team} offset={offset} />
      <Sparks speed={speed} boost={boostRef} />
      <Haze speed={speed} color={rear} />
      <Streaks colors={[rear, front, '#ffb15c', '#ffffff']} speed={speed} near={near} />
      {WHEELS.map((w) => (
        <Trail key={`${w.x}${w.z}`} wall={!w.front} x={w.x} z={w.z} color={w.front ? front : rear} timeRef={time} intensity={glow} />
      ))}
      <group ref={car}>
        <Suspense fallback={null}>
          <RealCar livery={livery} />
        </Suspense>
      </group>
    </>
  )
}

export default function WarpCar({
  team,
  progress,
  paused,
}: {
  team: TeamTheme
  progress: MutableRefObject<number>
  paused: boolean
}) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop={paused ? 'never' : 'always'}
      camera={{ fov: 30, position: [-9, 2, 0], near: 0.1, far: 200 }}
      gl={{ antialias: true }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={[team.colors.darker]} />
      <ambientLight intensity={0.08} />
      <StudioEnv tint={team.colors.primary} intensity={0.35} />
      <Rig team={team} progress={progress} />
    </Canvas>
  )
}
