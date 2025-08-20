"use client"
import * as React from "react"
import useSWR from "swr"

type TItem = { symbol: string; change: string; price?: number }

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch')
  return response.json()
}

export function HeroLiveFeed() {
  const { data, error } = useSWR('/api/markets?vs=usd&h=1h&i=minutely&n=6', fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
    revalidateOnFocus: false
  })

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches

  // Create items from real API data or fallback
  const items: TItem[] = React.useMemo(() => {
    if (data?.items && data.items.length > 0) {
      return data.items.slice(0, 6).map((item: {
        symbol: string
        change24h: number
        price: number
      }) => ({
        symbol: item.symbol,
        change: `${item.change24h >= 0 ? '+' : ''}${item.change24h.toFixed(1)}%`,
        price: item.price
      }))
    }
    
    // Fallback data if API fails
    return [
      { symbol: "BTC", change: "+1.2%" },
      { symbol: "ETH", change: "+0.6%" },
      { symbol: "SOL", change: "+2.4%" },
      { symbol: "XRP", change: "-0.3%" },
      { symbol: "DOGE", change: "+4.1%" },
      { symbol: "ADA", change: "+0.9%" },
    ]
  }, [data])

  // Duplikujemy listę do płynnej pętli
  const loop = items.concat(items)

  if (error) {
    console.warn('Hero live feed API error:', error)
  }

  return (
    <div className="relative overflow-hidden rounded-lg border bg-background/60 backdrop-blur px-3 py-2 text-xs font-mono">
      <div
        className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background/80 to-transparent pointer-events-none z-10"
        aria-hidden="true"
      />
      <ul
        className={
          prefersReduced
            ? "flex gap-6 flex-wrap"
            : "flex gap-6 animate-marquee will-change-transform"
        }
        aria-live="off"
      >
        {loop.map((it, i) => {
          const negative = it.change.startsWith("-")
          return (
            <li
              key={i}
              className="flex items-center gap-1 whitespace-nowrap text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="font-semibold text-foreground/90">
                {it.symbol}
              </span>
              <span
                className={
                  negative
                    ? "text-red-500 dark:text-red-400"
                    : "text-green-600 dark:text-green-400"
                }
              >
                {it.change}
              </span>
              {it.price && (
                <span className="text-muted-foreground/70 ml-1">
                  ${it.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              )}
            </li>
          )
        })}
      </ul>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 12s linear infinite;
        }
        @media (max-width:640px){
          .animate-marquee {
            animation-duration: 40s;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-marquee {
            animation: none;
            transform: none;
          }
        }
      `}</style>
    </div>
  )
}
