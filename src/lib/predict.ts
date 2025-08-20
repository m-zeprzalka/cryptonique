/**
 * Cryptocurrency Price Prediction Module
 * Advanced prediction algorithm using linear regression, momentum analysis,
 * sinusoidal modulation, and volatility calculations
 */

export type PredictPoint = { t: number; price: number }

/**
 * Enhanced cryptocurrency price prediction algorithm
 *
 * Combines multiple factors for more accurate predictions:
 * - Linear regression for trend analysis
 * - Momentum calculation from recent price changes
 * - Sinusoidal modulation for market cycle simulation
 * - Volatility-based variance adjustment
 *
 * @param points Historical price data points
 * @param steps Number of future points to predict (default: 6)
 * @returns Array of predicted price points
 */
export function improvedPredict(
  points: PredictPoint[],
  steps = 6
): PredictPoint[] {
  // Require minimum data points for meaningful prediction
  if (points.length < 3) return []

  const n = points.length
  const xs = points.map((_, i) => i)
  const ys = points.map((p) => p.price)

  // Linear regression calculation for trend analysis
  const sumX = xs.reduce((a, b) => a + b, 0)
  const sumY = ys.reduce((a, b) => a + b, 0)
  const sumXY = xs.reduce((a, b, i) => a + b * ys[i]!, 0)
  const sumX2 = xs.reduce((a, b) => a + b * b, 0)

  const denom = n * sumX2 - sumX * sumX || 1
  const m = (n * sumXY - sumX * sumY) / denom // Trend slope
  const b = (sumY - m * sumX) / n // Y-intercept

  // Volatility calculation (standard deviation of price differences)
  let vol = 0
  if (n > 4) {
    const diffs: number[] = []
    for (let i = 1; i < n; i++) {
      diffs.push(ys[i]! - ys[i - 1]!)
    }
    const mean = diffs.reduce((a, c) => a + c, 0) / diffs.length
    const variance =
      diffs.reduce((a, c) => a + (c - mean) ** 2, 0) / diffs.length
    vol = Math.sqrt(variance)
  }

  // Momentum analysis from recent price changes
  const last = points[n - 1]!
  const prev = points[n - 2]!
  const intervalMs = last.t - prev.t || 60_000 // Default 1-minute intervals

  const lastDelta = last.price - prev.price
  const prevDelta =
    n >= 3 ? points[n - 2]!.price - points[n - 3]!.price : lastDelta
  const momentum = lastDelta - prevDelta

  // Generate prediction points
  const predictions: PredictPoint[] = []
  for (let i = 1; i <= steps; i++) {
    const x = n - 1 + i

    // Base trend from linear regression
    const base = m * x + b

    // Sinusoidal modulation for market cycles
    const sinMod = Math.sin(i / 1.5) * vol * 0.2 + Math.sin(i / 3.2) * vol * 0.1

    // Momentum-based drift
    const drift = momentum * 0.4 * i

    // Combine all factors
    const predictedPrice = base + sinMod + drift

    predictions.push({
      t: last.t + intervalMs * i,
      price: Math.max(0, predictedPrice), // Ensure non-negative prices
    })
  }

  return predictions
}
