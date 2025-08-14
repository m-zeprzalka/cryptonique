import { NextRequest, NextResponse } from "next/server"
import { getHistoryCC, getMarketsCC } from "@/lib/coincap"
import { improvedPredict } from "@/lib/predict"
import { getMarketsCP } from "@/lib/coinpaprika"

export const revalidate = 300

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const vs = searchParams.get("vs") ?? "usd" // CoinCap zawsze USD, ale zachowujemy parametr dla zgodności
  const horizon = searchParams.get("h") ?? "1h" // 1h | 3h | 6h
  const interval = searchParams.get("i") ?? "minutely" // minutely | hourly
  const perPage = Number(searchParams.get("n") ?? 10)

  let markets: Array<{
    id: string
    symbol: string
    name?: string
    price: number
    change24h: number
  }>
  try {
    markets = await getMarketsCC({ perPage })
  } catch {
    markets = await getMarketsCP({ perPage })
  }

  // Choose history "days" param based on horizon
  const hours = horizon === "6h" ? 6 : horizon === "3h" ? 3 : 1

  const out: Array<{
    id: string
    symbol: string
    name?: string
    price: number
    change24h: number
    series: Array<{ t: number; price: number }>
  }> = []
  // Small concurrency pool to avoid rate limits
  const poolSize = 4
  let i = 0
  while (i < markets.length) {
    const batch = markets.slice(i, i + poolSize)
    const results = await Promise.allSettled(
      batch.map(async (m) => {
        try {
          const hist = await getHistoryCC({
            id: m.id,
            interval: interval === "hourly" ? "h1" : "m1",
          })
          const cutoff = Date.now() - hours * 60 * 60 * 1000
          const recent = hist.filter((p) => p.t >= cutoff)
          const pred = improvedPredict(recent)
          return {
            id: m.id,
            symbol: m.symbol,
            price: m.price,
            name: m.name,
            change24h: m.change24h,
            series: recent.length ? [...recent, ...pred] : [],
          }
        } catch {
          // Fallback synthetic series around current price (last ~1h, 5min step)
          const now = Date.now()
          const base = m.price
          const recent = Array.from({ length: 12 }).map((_, idx) => {
            const t = now - (11 - idx) * 5 * 60 * 1000
            const noise =
              (Math.sin(idx / 2) * 0.004 + (Math.random() - 0.5) * 0.002) * base
            return { t, price: Math.max(0, base + noise) }
          })
          const pred = improvedPredict(recent)
          return {
            id: m.id,
            symbol: m.symbol,
            price: m.price,
            name: m.name,
            change24h: m.change24h,
            series: [...recent, ...pred],
          }
        }
      })
    )
    for (const r of results) {
      if (r.status === "fulfilled") out.push(r.value)
    }
    i += poolSize
  }

  return NextResponse.json({ vs, horizon, interval, items: out })
}
