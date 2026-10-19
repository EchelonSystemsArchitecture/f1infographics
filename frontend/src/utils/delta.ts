const MIN_SPEED_KMH = 5

export function deltaTimeAt(speedA: number, speedB: number, ds: number): number {
  const va = Math.max(MIN_SPEED_KMH, speedA)
  const vb = Math.max(MIN_SPEED_KMH, speedB)
  return 3.6 * ds * (1 / va - 1 / vb)
}

export function cumulativeDelta(
  speedA: readonly (number | null)[],
  speedB: readonly (number | null)[],
  lengthM: number,
): number[] {
  const n = Math.min(speedA.length, speedB.length)
  const out: number[] = []
  if (n <= 0 || !(lengthM > 0)) return out
  const ds = lengthM / n
  let acc = 0
  for (let i = 0; i < n; i++) {
    const va = speedA[i]
    const vb = speedB[i]
    if (va != null && vb != null && va > 0 && vb > 0) {
      acc += deltaTimeAt(va, vb, ds)
    }
    out.push(acc)
  }
  return out
}
