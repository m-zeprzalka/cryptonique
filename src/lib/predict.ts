export type PredictPoint = { t: number; price: number }

// Ulepszona predykcja: regresja liniowa (trend) + momentum + modulacja sinus + volatility
export function improvedPredict(
  points: PredictPoint[],
  steps = 6
): PredictPoint[] {
  if (points.length < 3) return []
  const n = points.length
  const xs = points.map((_, i) => i)
  const ys = points.map((p) => p.price)
  const sumX = xs.reduce((a, b) => a + b, 0)
  const sumY = ys.reduce((a, b) => a + b, 0)
  const sumXY = xs.reduce((a, b, i) => a + b * ys[i]!, 0)
  const sumX2 = xs.reduce((a, b) => a + b * b, 0)
  const denom = n * sumX2 - sumX * sumX || 1
  const m = (n * sumXY - sumX * sumY) / denom // nachylenie trendu
  const b = (sumY - m * sumX) / n

  // Volatility (std dev diffs)
  let vol = 0
  if (n > 4) {
    const diffs: number[] = []
    for (let i = 1; i < n; i++) diffs.push(ys[i]! - ys[i - 1]!)
    const mean = diffs.reduce((a, c) => a + c, 0) / diffs.length
    const variance =
      diffs.reduce((a, c) => a + (c - mean) ** 2, 0) / diffs.length
    vol = Math.sqrt(variance)
  }
  const last = points[n - 1]!
  const prev = points[n - 2]!
  const intervalMs = last.t - prev.t || 60_000
  const lastDelta = last.price - prev.price
  const prevDelta =
    n >= 3 ? points[n - 2]!.price - points[n - 3]!.price : lastDelta
  const momentum = lastDelta - prevDelta

  const out: PredictPoint[] = []
  for (let i = 1; i <= steps; i++) {
    const x = n - 1 + i
    const base = m * x + b
    const sinMod = Math.sin(i / 1.5) * vol * 0.2 + Math.sin(i / 3.2) * vol * 0.1
    const drift = momentum * 0.4 * i
    const combined = base + sinMod + drift
    out.push({ t: last.t + intervalMs * i, price: Math.max(0, combined) })
  }
  return out
}
