export type TPoint = { t: number; price: number; predicted?: number }
export type TSeries = { symbol: string; points: TPoint[]; changePct: number }

// Create simple synthetic series with a prediction tail
export function makeSeries(symbol: string, base = 40000): TSeries {
  const now = Date.now()
  const points: TPoint[] = []
  let price = base
  for (let i = 20; i >= 0; i--) {
    const t = now - i * 5 * 60 * 1000 // 5-min steps past hour or so
    price =
      price * (1 + (Math.sin(i / 2) * 0.003 + (Math.random() - 0.5) * 0.002))
    points.push({ t, price: round(price) })
  }
  // prediction next 6 points (next 30 minutes)
  let last = price
  for (let i = 1; i <= 6; i++) {
    const t = now + i * 5 * 60 * 1000
    last = last * (1 + 0.003 + (Math.random() - 0.5) * 0.001)
    points.push({ t, price: NaN, predicted: round(last) })
  }

  const start = points[0]!.price
  const end = (points.findLast((p) => !isNaN(p.price))?.price ??
    start) as number
  const changePct = ((end - (start as number)) / (start as number)) * 100
  return { symbol, points, changePct: Math.round(changePct * 10) / 10 }
}

function round(n: number) {
  return Math.round(n * 100) / 100
}

export function sampleData() {
  return [
    makeSeries("BTC", 43000),
    makeSeries("ETH", 2400),
    makeSeries("SOL", 160),
    makeSeries("BNB", 580),
    makeSeries("XRP", 0.52),
    makeSeries("DOGE", 0.17),
  ]
}
