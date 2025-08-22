import {
  ArrowRight,
  LineChart,
  Sparkles,
  Layers,
  Cpu,
  Shield,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { HeroLiveFeed } from "./hero-live-feed"
import { CryptoCard } from "../crypto/crypto-card"
import { REVALIDATE_SECONDS } from "@/lib/config"
import { headers } from "next/headers"

// HERO z poprawionymi animacjami i czystą strukturą
export async function Hero() {
  // Server-side: fetch 4 items from our API and render 4 standard CryptoCards
  let cards: Array<{
    id: string
    symbol: string
    name?: string
    price: number
    change24h: number
    series: Array<{ t: number; price: number }>
  }> = []
  let predictedSteps = 6
  try {
    const h = await headers()
    const host = h.get("x-forwarded-host") || h.get("host")
    const proto = h.get("x-forwarded-proto") || "http"
    const base = host ? `${proto}://${host}` : ""
    const res = await fetch(`${base}/api/markets?vs=usd&h=1h&i=minutely&n=4`, {
      next: { revalidate: REVALIDATE_SECONDS },
    })
    if (res.ok) {
      const data = await res.json()
      cards = (data.items as typeof cards) ?? []
      predictedSteps = data.predictedSteps ?? 6
    }
  } catch (e) {
    if (process.env.NODE_ENV !== "production")
      console.error("Hero fetch /api/markets failed", e)
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
            {cards.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {cards.map((it) => (
                  <CryptoCard
                    key={it.id}
                    symbol={it.symbol}
                    data={{
                      symbol: it.symbol,
                      name: it.name,
                      livePrice: it.price,
                      points: [
                        ...it.series
                          .slice(0, -predictedSteps)
                          .map((p) => ({ t: p.t, price: p.price })),
                        ...it.series.slice(-predictedSteps).map((p) => ({
                          t: p.t,
                          price: Number.NaN,
                          predicted: p.price,
                        })),
                      ],
                      changePct: it.change24h ?? 0,
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border p-6 text-sm text-muted-foreground">
                Brak danych z API.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
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
