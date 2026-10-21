import { useEffect, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { TeamLivery } from '../../theme/teams'
import type { RenderMode } from './F1Car'

export const CAR_URL = '/models/papaya-f1.glb'
const TARGET_LENGTH = 5.4

export interface Livery {
  body: string
  lower: string
  stripe: string
  lowerLine: number
  stripeY: [number, number]
}

export function liveryFrom(l: TeamLivery): Livery {
  return { body: l.body, lower: l.accent, stripe: l.secondary, lowerLine: 0.47, stripeY: [0.7, 0.74] }
}

type LiveryUniforms = Record<string, THREE.IUniform>

function patchChassis(mat: THREE.Material, uniforms: LiveryUniforms) {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform mat4 uCarInv;\nvarying vec3 vCarPos;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvCarPos = (uCarInv * modelMatrix * vec4(transformed, 1.0)).xyz;',
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform vec3 uBody;
uniform vec3 uLower;
uniform vec3 uStripe;
uniform float uLowerLine;
uniform vec2 uStripeY;
varying vec3 vCarPos;`,
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
float shadeL = diffuseColor.r;
vec3 liv = uBody;
float lower = 1.0 - smoothstep(uLowerLine - 0.01, uLowerLine + 0.01, vCarPos.y);
liv = mix(liv, uLower, lower);
liv = mix(liv, uLower, smoothstep(2.3, 2.4, vCarPos.x));
liv = mix(liv, uLower, smoothstep(-2.0, -2.1, vCarPos.x) * step(0.75, vCarPos.y));
float stripe = smoothstep(uStripeY.x - 0.005, uStripeY.x + 0.005, vCarPos.y) * (1.0 - smoothstep(uStripeY.y - 0.005, uStripeY.y + 0.005, vCarPos.y));
stripe *= step(-0.6, vCarPos.x) * step(vCarPos.x, 1.6);
liv = mix(liv, uStripe, stripe);
diffuseColor.rgb = liv * shadeL;`,
      )
  }
  mat.customProgramCacheKey = () => `gt-livery-${mat.type}`
  mat.needsUpdate = true
}

const toonRamp = (() => {
  const data = new Uint8Array([60, 60, 60, 255, 150, 150, 150, 255, 255, 255, 255, 255])
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat)
  tex.minFilter = THREE.NearestFilter
  tex.magFilter = THREE.NearestFilter
  tex.needsUpdate = true
  return tex
})()

function outlineMaterial(color: string, thickness: number) {
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide })
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
vec4 wp = modelMatrix * vec4(transformed, 1.0);
float dist = length(cameraPosition - wp.xyz);
transformed += normalize(normal) * ${thickness.toFixed(4)} * dist / max(length(modelMatrix[0].xyz), 1e-4);`,
    )
  }
  return m
}

export function RealCar({
  livery,
  mode = 'standard',
  line = '#111111',
  castShadow = true,
  ghostBody = 1,
}: {
  livery: Livery
  mode?: RenderMode
  line?: string
  castShadow?: boolean
  ghostBody?: number
}) {
  const { scene } = useGLTF(CAR_URL, false, true)
  const outer = useRef<THREE.Group>(null)

  const uniforms = useMemo<LiveryUniforms>(
    () => ({
      uCarInv: { value: new THREE.Matrix4() },
      uBody: { value: new THREE.Color() },
      uLower: { value: new THREE.Color() },
      uStripe: { value: new THREE.Color() },
      uLowerLine: { value: 0.47 },
      uStripeY: { value: new THREE.Vector2() },
    }),
    [],
  )

  useEffect(() => {
    uniforms.uBody.value.set(livery.body)
    uniforms.uLower.value.set(livery.lower)
    uniforms.uStripe.value.set(livery.stripe)
    uniforms.uLowerLine.value = livery.lowerLine
    uniforms.uStripeY.value.set(...livery.stripeY)
  }, [livery, uniforms])

  const { model, fit } = useMemo(() => {
    const model = scene.clone(true)
    const meshes: THREE.Mesh[] = []
    model.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh)
    })
    for (const mesh of meshes) {
      const src = mesh.material as THREE.MeshStandardMaterial
      const name = src.name
      mesh.castShadow = castShadow && mode === 'standard'
      mesh.receiveShadow = mode === 'standard'
      if (mode === 'blueprint') {
        mesh.material = new THREE.MeshBasicMaterial({
          color: line,
          transparent: true,
          opacity: 0.05,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(mesh.geometry, 32),
          new THREE.LineBasicMaterial({ color: line, transparent: true, opacity: 0.85 }),
        )
        mesh.add(edges)
        continue
      }
      if (mode === 'toon') {
        const toon = new THREE.MeshToonMaterial({
          name,
          color: src.color,
          map: src.map,
          gradientMap: toonRamp,
          side: THREE.DoubleSide,
        })
        if (name === 'car_chassis') patchChassis(toon, uniforms)
        mesh.material = toon
        const hull = new THREE.Mesh(mesh.geometry, outlineMaterial(line, 0.0022))
        hull.raycast = () => null
        mesh.add(hull)
        continue
      }
      const mat = src.clone()
      if (name === 'car_chassis') {
        mat.roughness = 0.3
        mat.metalness = 0.12
        patchChassis(mat, uniforms)
      }
      if (name === 'Wheels_TREAD') mat.roughness = 0.85
      mesh.material = mat
    }
    const box = new THREE.Box3().setFromObject(model)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const scale = TARGET_LENGTH / Math.max(size.x, size.z)
    return { model, fit: { scale, center, minY: box.min.y, alongZ: size.z > size.x } }
  }, [scene, castShadow, uniforms, mode, line])

  useEffect(() => {
    if (mode !== 'standard') return
    model.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const mat = mesh.material as THREE.MeshStandardMaterial
      if (mat.name !== 'car_chassis' && mat.name !== 'carbon') return
      mat.transparent = ghostBody < 1
      mat.opacity = ghostBody
      mat.depthWrite = ghostBody > 0.5
      mesh.castShadow = castShadow && ghostBody > 0.5
    })
  }, [model, ghostBody, mode, castShadow])

  useFrame(() => {
    if (outer.current) uniforms.uCarInv.value.copy(outer.current.matrixWorld).invert()
  })

  return (
    <group ref={outer}>
      <group rotation={[0, fit.alongZ ? Math.PI / 2 : 0, 0]} scale={fit.scale}>
        <primitive object={model} position={[-fit.center.x, -fit.minY, -fit.center.z]} />
      </group>
    </group>
  )
}

useGLTF.preload(CAR_URL, false, true)
