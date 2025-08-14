export type Market = {
  id: string
  symbol: string
  name: string
  image: string
  current_price: number
  price_change_percentage_24h: number
}

// Server-side fetch with Next.js caching
function cgHeaders() {
  const demo =
    process.env.COINGECKO_API_KEY ||
    process.env.NEXT_PUBLIC_COINGECKO_DEMO_KEY ||
    "DEMO_KEY"
  return {
    Accept: "application/json",
    "User-Agent": "Cryptonique/0.1 (+https://localhost)",
    "x-cg-demo-api-key": demo,
  } as Record<string, string>
}

export async function getMarkets({
  vsCurrency = "usd",
  perPage = 12,
  page = 1,
}: {
  vsCurrency?: string
  perPage?: number
  page?: number
}) {
  const url = new URL("https://api.coingecko.com/api/v3/coins/markets")
  url.searchParams.set("vs_currency", vsCurrency)
  url.searchParams.set("order", "market_cap_desc")
  url.searchParams.set("per_page", String(perPage))
  url.searchParams.set("page", String(page))
  url.searchParams.set("price_change_percentage", "1h,24h,7d")

  const res = await fetch(url.toString(), {
    // Revalidate every 300s
    next: { revalidate: 300 },
    headers: cgHeaders(),
  })
  if (!res.ok) throw new Error(`CoinGecko error ${res.status}`)
  const data = (await res.json()) as Market[]
  return data
}

export type HistoryPoint = { t: number; price: number }

export async function getHistory({
  id,
  vsCurrency = "usd",
  days = 1,
  interval = "minutely",
}: {
  id: string
  vsCurrency?: string
  days?: number | "max"
  interval?: "minutely" | "hourly" | "daily"
}) {
  const url = new URL(
    `https://api.coingecko.com/api/v3/coins/${id}/market_chart`
  )
  url.searchParams.set("vs_currency", vsCurrency)
  url.searchParams.set("days", String(days))
  url.searchParams.set("interval", interval)
  const res = await fetch(url.toString(), {
    next: { revalidate: 300 },
    headers: cgHeaders(),
  })
  if (!res.ok) throw new Error(`CoinGecko history error ${res.status}`)
  const json = (await res.json()) as { prices: [number, number][] }
  const points: HistoryPoint[] = json.prices.map(([t, p]) => ({ t, price: p }))
  return points
}

// Very naive prediction: simple drift based on last delta
export function predictNext(points: HistoryPoint[], steps = 6) {
  if (points.length < 2) return [] as HistoryPoint[]
  const last = points[points.length - 1]!
  const prev = points[points.length - 2]!
  const delta = last.price - prev.price
  const intervalMs = last.t - prev.t
  const out: HistoryPoint[] = []
  let cur = { ...last }
  for (let i = 1; i <= steps; i++) {
    cur = { t: cur.t + intervalMs, price: cur.price + delta }
    out.push(cur)
  }
  return out
}
