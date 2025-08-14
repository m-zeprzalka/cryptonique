"use client"
import * as React from "react"

type TItem = { symbol: string; change: string }

const BASE: TItem[] = [
  { symbol: "BTC", change: "+1.2%" },
  { symbol: "ETH", change: "+0.6%" },
  { symbol: "SOL", change: "+2.4%" },
  { symbol: "XRP", change: "-0.3%" },
  { symbol: "DOGE", change: "+4.1%" },
  { symbol: "ADA", change: "+0.9%" },
]

export function HeroLiveFeed() {
  const [items, setItems] = React.useState<TItem[]>(BASE)
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches

  // Co pewien czas tylko aktualizujemy procenty (bez zmiany kolejności)
  React.useEffect(() => {
    if (prefersReduced) return
    const id = setInterval(() => {
      setItems((prev) =>
        prev.map((it) => {
          const sign = Math.random() > 0.5 ? 1 : -1
          // lekko ważone mniejsze zmiany
          const val = (Math.random() * (sign > 0 ? 3.2 : 2.6)).toFixed(1)
          return { ...it, change: `${sign > 0 ? "+" : "-"}${val}%` }
        })
      )
    }, 3500)
    return () => clearInterval(id)
  }, [prefersReduced])

  // Duplikujemy listę do płynnej pętli
  const loop = items.concat(items)

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
