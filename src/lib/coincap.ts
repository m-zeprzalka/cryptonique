type CoinCapAsset = {
  id: string
  symbol: string
  name: string
  priceUsd: string
  changePercent24Hr: string
}

export type HistoryPoint = { t: number; price: number }

const CC_BASE = "https://api.coincap.io/v2"

function ccHeaders() {
  return {
    Accept: "application/json",
    "User-Agent": "Cryptonique/0.1 (+https://localhost)",
  } as Record<string, string>
}

export async function getMarketsCC({ perPage = 10 }: { perPage?: number }) {
  const url = new URL(`${CC_BASE}/assets`)
  url.searchParams.set("limit", String(perPage))
  const res = await fetch(url.toString(), {
    next: { revalidate: 300 },
    headers: ccHeaders(),
  })
  if (!res.ok) throw new Error(`CoinCap error ${res.status}`)
  const json = (await res.json()) as { data: CoinCapAsset[] }
  return json.data.map((a) => ({
    id: a.id,
    symbol: a.symbol.toUpperCase(),
    name: a.name,
    price: Number.parseFloat(a.priceUsd),
    change24h: Number.parseFloat(a.changePercent24Hr),
  }))
}

export async function getHistoryCC({
  id,
  interval = "m1",
}: {
  id: string
  interval?: "m1" | "h1"
}) {
  const url = new URL(`${CC_BASE}/assets/${id}/history`)
  url.searchParams.set("interval", interval)
  const res = await fetch(url.toString(), {
    next: { revalidate: 300 },
    headers: ccHeaders(),
  })
  if (!res.ok) throw new Error(`CoinCap history error ${res.status}`)
  const json = (await res.json()) as {
    data: { time: number; priceUsd: string }[]
  }
  const points: HistoryPoint[] = json.data.map((p) => ({
    t: p.time,
    price: Number.parseFloat(p.priceUsd),
  }))
  return points
}

// Naive prediction: extrapolate last delta
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
