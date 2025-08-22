"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { REFRESH_MS } from "@/lib/config"
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

  const { data, isLoading, error } = useSWR(
    `/api/markets?vs=usd&h=1h&i=minutely&n=10`,
    fetcher,
    { refreshInterval: REFRESH_MS }
  )

  const items = useMemo(() => {
    // API zwraca zarówno items jak i markets - używamy markets jako główny
    const list = (data?.markets ?? data?.items ?? []) as Array<{
      id: string
      symbol: string
      name?: string
      price: number
      change24h: number
      series?: Array<{ t: number; price: number; predicted?: number }>
    }>

    const filtered = query
      ? list.filter((x) => x.symbol.toLowerCase().includes(query.toLowerCase()))
      : list

    const sorted = [...filtered].sort((a, b) => {
      switch (sort) {
        case "change-asc":
          return (a.change24h ?? 0) - (b.change24h ?? 0)
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
          {items.map((it) => {
            // Konwertuj format danych z API na format oczekiwany przez CryptoCard
            const cardData = {
              symbol: it.symbol,
              name: it.name,
              livePrice: it.price,
              points: (it.series || []).map((point) => ({
                t: point.t,
                price: point.price,
                predicted: point.predicted,
              })),
              changePct: it.change24h ?? 0,
            }

            return (
              <CryptoCard
                key={it.id}
                symbol={it.symbol}
                // Przekazujemy dane jako fallback - każda karta może je nadpisać własnym SWR
                data={cardData}
              />
            )
          })}
        </div>
      )}
    </section>
  )
}
