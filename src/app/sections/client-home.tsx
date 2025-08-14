"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { CryptoCard } from "@/components/crypto/crypto-card"

const fetcher = async (url: string) => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}

function CardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4">
          <div className="flex justify-between mb-4">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-14" />
          </div>
          <Skeleton className="h-28" />
        </div>
      ))}
    </div>
  )
}

export function ClientHome() {
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState("change-desc")
  const [h, setH] = useState("1h")
  const [interval, setInterval] = useState("minutely")

  const { data, isLoading, error } = useSWR(
    `/api/markets?vs=usd&h=${h}&i=${interval}&n=10`,
    fetcher,
    { refreshInterval: 120_000 }
  )

  const items = useMemo(() => {
    const list = (data?.items ?? []) as Array<{
      id: string
      symbol: string
      name?: string
      price: number
      change24h: number
      series: Array<{ t: number; price: number }>
    }>
    const filtered = query
      ? list.filter((x) => x.symbol.toLowerCase().includes(query.toLowerCase()))
      : list
    const sorted = [...filtered].sort((a, b) => {
      switch (sort) {
        case "change-asc":
          return (a.change24h ?? 0) - (b.change24h ?? 0)
        case "pred-desc":
        case "pred-asc": {
          const ap = a.series[a.series.length - 1]?.price ?? 0
          const bp = b.series[b.series.length - 1]?.price ?? 0
          return sort === "pred-desc" ? bp - ap : ap - bp
        }
        case "change-desc":
        default:
          return (b.change24h ?? 0) - (a.change24h ?? 0)
      }
    })
    return sorted
  }, [data, query, sort])

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtruj po symbolu"
          className="h-9 w-full sm:w-64"
        />
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue placeholder="Sortowanie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="change-desc">Zmiana 24h ⬇</SelectItem>
            <SelectItem value="change-asc">Zmiana 24h ⬆</SelectItem>
            <SelectItem value="pred-desc">Predykcja ⬇</SelectItem>
            <SelectItem value="pred-asc">Predykcja ⬆</SelectItem>
          </SelectContent>
        </Select>
        <Select value={h} onValueChange={setH}>
          <SelectTrigger className="h-9 w-[120px]">
            <SelectValue placeholder="Horyzont" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1h">1h</SelectItem>
            <SelectItem value="3h">3h</SelectItem>
            <SelectItem value="6h">6h</SelectItem>
          </SelectContent>
        </Select>
        <Select value={interval} onValueChange={setInterval}>
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue placeholder="Interwał" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minutely">Minutely</SelectItem>
            <SelectItem value="hourly">Hourly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <div className="text-sm text-destructive">
          Błąd ładowania danych z API. Spróbuj ponownie za chwilę.
        </div>
      ) : isLoading ? (
        <CardsSkeleton />
      ) : items.length === 0 ? (
        <div className="text-sm text-muted-foreground">Brak wyników.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it) => (
            <CryptoCard
              key={it.id}
              data={{
                symbol: it.symbol,
                name: it.name,
                points: [
                  ...it.series
                    .slice(0, -6)
                    .map((p) => ({ t: p.t, price: p.price })),
                  ...it.series.slice(-6).map((p) => ({
                    t: p.t,
                    price: Number.NaN,
                    predicted: p.price,
                  })),
                ],
                changePct: Math.round((it.change24h ?? 0) * 10) / 10,
              }}
            />
          ))}
        </div>
      )}
    </section>
  )
}
