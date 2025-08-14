import {
  ArrowRight,
  LineChart,
  Zap,
  Shield,
  Activity,
  Sparkles,
  Layers,
  Cpu,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { HeroLiveFeed } from "./hero-live-feed"
import { CryptoCard, SeriesData } from "../crypto/crypto-card"
import { improvedPredict } from "@/lib/predict"
import { getHistoryCC, getMarketsCC } from "@/lib/coincap"
import { getMarketsCP } from "@/lib/coinpaprika"

// HERO z poprawionymi animacjami i czystą strukturą
export async function Hero() {
  // Server-side prepare single BTC card
  let btcCard: SeriesData | null = null
  try {
    // Try CoinCap first
    let markets: any[] = []
    try {
      markets = await getMarketsCC({ perPage: 25 })
    } catch (err) {
      if (process.env.NODE_ENV !== "production")
        console.warn("CoinCap failed, fallback to CoinPaprika", err)
      try {
        markets = await getMarketsCP({ perPage: 25 })
      } catch (err2) {
        if (process.env.NODE_ENV !== "production")
          console.error("CoinPaprika fallback also failed", err2)
      }
    }
    const btc = markets.find((m) => m.symbol === "BTC" || m.id === "bitcoin")
    if (btc) {
      let recentHist: { t: number; price: number }[] = []
      try {
        const hist = await getHistoryCC({ id: btc.id, interval: "m1" })
        const cutoff = Date.now() - 60 * 60 * 1000
        recentHist = hist.filter((p) => p.t >= cutoff)
      } catch (histErr) {
        if (process.env.NODE_ENV !== "production")
          console.warn("History fetch failed, using synthetic tail", histErr)
        const now = Date.now()
        const base = btc.price
        recentHist = Array.from({ length: 60 }).map((_, idx) => {
          const t = now - (59 - idx) * 60 * 1000
          const noise =
            (Math.sin(idx / 6) * 0.002 + (Math.random() - 0.5) * 0.0015) * base
          return { t, price: Math.max(0, base + noise) }
        })
      }
      const pred = improvedPredict(recentHist)
      const tailCount = 6
      const merged = [...recentHist, ...pred]
      const realPart = merged.slice(0, -tailCount)
      const predTail = merged.slice(-tailCount)
      const points = [
        ...realPart.map((p) => ({ t: p.t, price: p.price })),
        ...predTail.map((p) => ({
          t: p.t,
          price: Number.NaN,
          predicted: p.price,
        })),
      ]
      btcCard = {
        symbol: btc.symbol,
        name: (btc as any).name,
        changePct: Math.round((btc.change24h ?? 0) * 10) / 10,
        vs: "USD",
        points,
      }
    }
  } catch (e) {
    if (process.env.NODE_ENV !== "production")
      console.error("Hero BTC aggregate fetch failed", e)
  }
  return (
    <section
      className="relative w-full overflow-hidden"
      aria-labelledby="hero-heading"
    >
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          <div className="xl:col-span-6 space-y-8">
            <Announcement />
            <HeroHeading />
            <HeroCopy />
            <HeroCTAs />
            <div className="max-w-lg">
              <HeroLiveFeed />
            </div>
            <TrustBar />
          </div>
          <div className="xl:col-span-6">
            {btcCard ? (
              <CryptoCard data={btcCard} />
            ) : (
              <div className="rounded-lg border p-6 text-sm text-muted-foreground">
                Ładowanie danych BTC...
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

// ----- Stat & Sparkline -----
function HeroStat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground/80 font-medium">
        {label}
      </span>
      <span className="text-lg font-semibold tabular-nums tracking-tight">
        {value}
      </span>
      <span className="text-[10px] text-muted-foreground leading-none">
        {hint}
      </span>
    </div>
  )
}

function MiniSparkline() {
  return (
    <div className="h-20 w-full flex items-center justify-center">
      <svg viewBox="0 0 140 44" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="sparkGrad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="var(--chart-2)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-2)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--chart-2)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0 30 L10 26 L20 29 L30 19 L40 23 L50 11 L60 16 L70 9 L80 18 L90 13 L100 20 L110 15 L120 23 L130 19 L140 26"
          fill="none"
          stroke="url(#sparkGrad)"
          strokeWidth="2"
          strokeLinecap="round"
          className="[stroke-dasharray:500] [stroke-dashoffset:500] motion-safe:animate-[dash_2.8s_cubic-bezier(.7,.05,.25,1)_forwards]"
        />
        <path
          d="M0 30 L10 26 L20 29 L30 19 L40 23 L50 11 L60 16 L70 9 L80 18 L90 13 L100 20 L110 15 L120 23 L130 19 L140 26 V44 H0 Z"
          fill="url(#sparkFill)"
          className="opacity-60"
        />
        <style>{`@keyframes dash { to { stroke-dashoffset: 0; } }`}</style>
      </svg>
    </div>
  )
}

// ----- Content components -----
function Announcement() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 backdrop-blur px-4 py-1.5 text-[11px] font-medium shadow-sm">
      <span className="flex items-center gap-1">
        <Sparkles className="size-3" />
        Algorytm AI
      </span>
      <span className="h-1 w-1 rounded-full bg-border" />
      <span className="text-muted-foreground">Predykcje live ZA DARMO!</span>
      <span className="h-1 w-1 rounded-full bg-border" />
      <Link
        href="#demo"
        className="underline decoration-dotted underline-offset-2 hover:text-foreground"
      >
        Zobacz demo
      </Link>
    </div>
  )
}

function HeroHeading() {
  return (
    <h1
      id="hero-heading"
      className="text-3xl sm:text-5xl leading-tight font-semibold tracking-tight"
    >
      Przewidywania kursów kryptowalut{" "}
      <span className="inline text-balance mt-2 text-chart-2">
        w przejrzysty sposób
      </span>
    </h1>
  )
}

function HeroCopy() {
  return (
    <p className="text-sm sm:text-lg text-muted-foreground max-w-[60ch]">
      Jedna aplikacja łącząca streaming cen, krótkoterminową estymację i
      natychmiastową prezentację danych. Minimalistycznie, czytelnie, bez
      zbędnych funkcjonalności.
    </p>
  )
}

function HeroCTAs() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Button asChild size="lg" className="group relative">
        <Link href="#app" className="flex items-center gap-2">
          Uruchom pulpit
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </Button>
      <Button asChild variant="outline" size="lg" className="backdrop-blur">
        <Link href="#demo" className="flex items-center gap-2">
          Zobacz demo
          <LineChart className="size-4" />
        </Link>
      </Button>
      <div className="flex flex-col text-[11px] text-muted-foreground leading-tight gap-1">
        <span>Brak rejestracji – wstępna wersja projektu</span>
        <span className="text-foreground/80">
          Otwarte MVP • aktualizacje live
        </span>
      </div>
    </div>
  )
}

function TrustBar() {
  const items = [
    { icon: <Cpu className="size-3.5" />, label: "Niskie opóźnienie" },
    { icon: <Shield className="size-3.5" />, label: "Bezpieczne API" },
    { icon: <Layers className="size-3.5" />, label: "Wielowarstwowe wykresy" },
  ]
  return (
    <ul className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
      {items.map((i) => (
        <li
          key={i.label}
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 bg-background/60 backdrop-blur"
        >
          <span className="text-chart-2">{i.icon}</span>
          {i.label}
        </li>
      ))}
    </ul>
  )
}
