import * as THREE from 'three'

export interface LoftSection {
  x: number
  w: number
  h: number
  y: number
  z?: number
  n?: number
}

export type VertexPaint = (x: number, y: number, z: number, t: number) => THREE.Color

function superellipse(angle: number, n: number) {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const e = 2 / n
  return [Math.sign(c) * Math.abs(c) ** e, Math.sign(s) * Math.abs(s) ** e]
}

function cr(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t
  const t3 = t2 * t
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
}

export function subdivide(sections: LoftSection[], steps = 8): LoftSection[] {
  if (sections.length < 2) return sections
  const out: LoftSection[] = []
  const keys = ['x', 'w', 'h', 'y', 'z', 'n'] as const
  for (let i = 0; i < sections.length - 1; i++) {
    const s0 = sections[Math.max(0, i - 1)]
    const s1 = sections[i]
    const s2 = sections[i + 1]
    const s3 = sections[Math.min(sections.length - 1, i + 2)]
    for (let k = 0; k < steps; k++) {
      const t = k / steps
      const sec = {} as LoftSection
      for (const key of keys) {
        const v = (s: LoftSection) => (key === 'z' ? (s.z ?? 0) : key === 'n' ? (s.n ?? 2.6) : s[key])
        sec[key] = cr(v(s0), v(s1), v(s2), v(s3), t)
      }
      sec.w = Math.max(sec.w, 0.001)
      sec.h = Math.max(sec.h, 0.001)
      out.push(sec)
    }
  }
  out.push(sections[sections.length - 1])
  return out
}

export function loftGeometry(input: LoftSection[], radial = 28, paint?: VertexPaint) {
  const sections = subdivide(input)
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const ring = radial + 1
  const total = sections.length

  sections.forEach((sec, i) => {
    const t = total > 1 ? i / (total - 1) : 0
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2
      const [cy, cz] = superellipse(a, sec.n ?? 2.6)
      const px = sec.x
      const py = sec.y + (cy * sec.h) / 2
      const pz = (sec.z ?? 0) + (cz * sec.w) / 2
      positions.push(px, py, pz)
      const col = paint ? paint(px, py, pz, t) : new THREE.Color(1, 1, 1)
      colors.push(col.r, col.g, col.b)
    }
  })

  for (let i = 0; i < total - 1; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * ring + j
      const b = (i + 1) * ring + j
      indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }

  const capStart = positions.length / 3
  const s0 = sections[0]
  positions.push(s0.x, s0.y, s0.z ?? 0)
  const c0 = paint ? paint(s0.x, s0.y, s0.z ?? 0, 0) : new THREE.Color(1, 1, 1)
  colors.push(c0.r, c0.g, c0.b)
  for (let j = 0; j < radial; j++) indices.push(capStart, j + 1, j)

  const capEnd = positions.length / 3
  const sl = sections[total - 1]
  positions.push(sl.x, sl.y, sl.z ?? 0)
  const c1 = paint ? paint(sl.x, sl.y, sl.z ?? 0, 1) : new THREE.Color(1, 1, 1)
  colors.push(c1.r, c1.g, c1.b)
  const off = (total - 1) * ring
  for (let j = 0; j < radial; j++) indices.push(capEnd, off + j, off + j + 1)

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

export function mirrorZ(sections: LoftSection[]): LoftSection[] {
  return sections.map((s) => ({ ...s, z: -(s.z ?? 0) }))
}
