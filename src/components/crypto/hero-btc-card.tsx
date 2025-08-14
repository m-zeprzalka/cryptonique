"use client"

import useSWR from "swr"
import { CryptoCard } from "@/components/crypto/crypto-card"
import { Skeleton } from "@/components/ui/skeleton"
import { TSeries } from "@/lib/mock"

// Prosty fetcher
const fetcher = async (url: string) => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}

// Transformacja elementu API -> TSeries (z konwersją ogona na predicted)
function toSeries(item: {
  symbol: string
  change24h: number
  series: Array<{ t: number; price: number }>
}): TSeries {
  const predTail = 6
  const hist = item.series.slice(0, -predTail)
  const pred = item.series.slice(-predTail)
  const points = [
    ...hist.map((p) => ({ t: p.t, price: p.price })),
    ...pred.map((p) => ({ t: p.t, price: Number.NaN, predicted: p.price })),
  ]
  // changePct bazujemy na change24h (zaokrąglone jak wcześniej)
  const changePct = Math.round((item.change24h ?? 0) * 10) / 10
  return { symbol: item.symbol, points, changePct }
}

export function HeroBTCCard({
  horizon = "1h",
  interval = "minutely",
  limit = 15,
}: {
  horizon?: string
  interval?: string
  limit?: number
}) {
  const { data, error, isLoading } = useSWR(
    `/api/markets?vs=usd&h=${horizon}&i=${interval}&n=${limit}`,
    fetcher,
    { refreshInterval: 120_000 }
  )

  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-background/70 backdrop-blur p-6">
        <div className="flex justify-between mb-4">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-16" />
        </div>
        <Skeleton className="h-32" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border bg-background/70 backdrop-blur p-6 text-xs text-destructive">
        Błąd ładowania BTC.
      </div>
    )
  }

  const items: Array<{
    id: string
    symbol: string
    price: number
    change24h: number
    series: Array<{ t: number; price: number }>
  }> = data.items || []
  const btc = items.find((x) => x.symbol === "BTC") || items[0]

  if (!btc) {
    return (
      <div className="rounded-2xl border bg-background/70 backdrop-blur p-6 text-xs text-muted-foreground">
        Brak danych BTC.
      </div>
    )
  }

  const series = toSeries(btc)

  return (
    <div className="rounded-2xl border bg-background/70 backdrop-blur p-3">
      <CryptoCard data={series} />
    </div>
  )
}
