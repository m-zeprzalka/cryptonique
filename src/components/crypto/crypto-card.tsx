"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import {
  Area,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceArea,
  TooltipProps,
} from "recharts"
import { cn } from "@/lib/utils"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { useId, useMemo } from "react"

function formatTime(ts: number) {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`
}

export type PricePoint = { t: number; price: number; predicted?: number }

export type SeriesData = {
  symbol: string
  points: PricePoint[]
  changePct: number
  vs?: string
  name?: string
  changeValue?: number
  livePrice?: number
}

function iconUrl(sym: string) {
  const s = sym.toLowerCase()
  return `https://assets.coincap.io/assets/icons/${s}@2x.png`
}

// Niestandardowy tooltip (Cena vs Predykcja)
function CustomTooltip(props: TooltipProps<number, string>) {
  const { active, payload, label } = props as {
    active?: boolean
    payload?: Array<{ dataKey: string; value: number | string }>
    label?: string
  }
  if (!active || !payload?.length) return null
  const price = payload.find((p) => p.dataKey === "price")?.value
  const pred = payload.find((p) => p.dataKey === "predicted")?.value
  return (
    <div className="rounded-md border bg-popover/90 backdrop-blur px-2.5 py-2 text-xs shadow-sm">
      <div className="font-medium mb-1">{label}</div>
      {price != null && (
        <div className="flex items-center gap-1 text-foreground">
          <span className="inline-block size-2 rounded-full bg-[var(--chart-2)]" />
          Cena:{" "}
          {typeof price === "number"
            ? price.toLocaleString(undefined, { maximumFractionDigits: 8 })
            : price}
        </div>
      )}
      {pred != null && (
        <div className="flex items-center gap-1 text-foreground">
          <span className="inline-block size-2 rounded-full bg-[var(--chart-1)]" />
          Predykcja:{" "}
          {typeof pred === "number"
            ? pred.toLocaleString(undefined, { maximumFractionDigits: 8 })
            : pred}
        </div>
      )}
    </div>
  )
}

type CryptoCardProps = {
  data?: SeriesData
  loading?: boolean
  error?: string
  compact?: boolean
  highlightPrediction?: boolean
}

export function CryptoCard({
  data,
  loading,
  error,
  compact,
  highlightPrediction = true,
}: CryptoCardProps) {
  const gradId = useId()

  // All hooks must be called before any conditional returns
  const {
    chartData,
    lastRealPrice,
    basePrice,
    predictedLast,
    predUp,
    horizonMinutes,
  } = useMemo(() => {
    if (!data)
      return {
        chartData: [],
        lastRealPrice: 0,
        basePrice: 0,
        predictedLast: undefined,
        predUp: false,
        horizonMinutes: 0,
      }

    const lastReal = [...data.points].reverse().find((p) => !isNaN(p.price))
    const lastPred = [...data.points].reverse().find((p) => p.predicted)
    const realPoints = data.points.filter((p) => !isNaN(p.price))
    const predictedPoints = data.points.filter((p) => p.predicted != null)
    const lastRealPrice = lastReal?.price ?? realPoints.at(-1)?.price ?? 0
    const basePrice = data.livePrice ?? lastRealPrice
    const predictedLast = lastPred?.predicted
    const predUp = predictedLast != null ? predictedLast >= basePrice : false
    const bridge = predictedPoints.length
      ? [
          {
            t: realPoints.at(-1)!.t,
            price: realPoints.at(-1)!.price,
            predicted: realPoints.at(-1)!.price,
          },
        ]
      : []
    const chartData = [
      ...realPoints.map((p: { t: number; price: number }) => ({
        time: formatTime(p.t),
        price: p.price,
        predicted: undefined,
      })),
      ...bridge.map((p: { t: number; price: number; predicted: number }) => ({
        time: formatTime(p.t),
        price: p.price,
        predicted: p.predicted,
      })),
      ...predictedPoints
        .filter((p) => p.predicted !== undefined)
        .map((p) => ({
          time: formatTime(p.t),
          price: undefined,
          predicted: p.predicted,
        })),
    ]
    // Szacowany horyzont w minutach (liczba punktów pred * średni interwał)
    const lastTwo = realPoints.slice(-2)
    const intervalMs =
      lastTwo.length === 2 ? lastTwo[1]!.t - lastTwo[0]!.t : 60_000
    const horizonMinutes = Math.max(
      0,
      Math.round((predictedPoints.length * intervalMs) / 60_000)
    )
    return {
      chartData,
      lastRealPrice,
      basePrice,
      predictedLast,
      predUp,
      horizonMinutes,
    }
  }, [data])

  const predictedCount = useMemo(() => {
    if (!data) return 0
    return data.points.filter((p) => p.predicted != null).length
  }, [data])

  // Dev warning when full name missing
  if (process.env.NODE_ENV !== "production" && data && !data.name) {
    console.warn("CryptoCard: missing data.name for", data.symbol)
  }

  // Stany ładowania / błędu
  if (loading) {
    return (
      <Card className={cn("shadow-none overflow-hidden", compact && "text-xs")}>
        <div className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-7 rounded-md border bg-muted animate-pulse" />
            <div className="space-y-1">
              <div className="h-3 w-20 bg-muted rounded animate-pulse" />
              <div className="h-2.5 w-10 bg-muted/70 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-5 w-14 bg-muted rounded animate-pulse" />
        </div>
        <div className="px-3 pb-3">
          <div className="h-28 bg-muted/40 rounded animate-pulse" />
        </div>
      </Card>
    )
  }
  if (error) {
    return (
      <Card className="shadow-none border-destructive/40">
        <div className="p-4 text-xs text-destructive">{error}</div>
      </Card>
    )
  }

  if (!data) return null

  return (
    <Card className={cn("shadow-none transition-colors", compact && "text-xs")}>
      <CardHeader
        className={cn(
          "pb-2 flex-row items-start justify-between gap-2",
          compact && "pb-1"
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative size-12 rounded-md border bg-card overflow-hidden">
            <Image
              src={iconUrl(data!.symbol)}
              alt={data!.symbol}
              className="object-contain w-full h-full p-1"
              width={48}
              height={48}
              loading="lazy"
              onError={() => {
                // Fallback - show just symbol initials if image fails
              }}
            />
          </div>
          <div className="flex flex-col truncate">
            <h2 className="font-semibold leading-tight truncate">
              {data!.name ?? data!.symbol}
              {data!.name && (
                <span className="ml-1 text-xs text-muted-foreground font-normal">
                  ({data!.symbol})
                </span>
              )}
            </h2>
            <span className="text-sm font-medium tabular-nums">
              {(data.livePrice ?? lastRealPrice).toLocaleString(undefined, {
                maximumFractionDigits: 6,
              })}
              <span className="ml-1 text-[10px] text-muted-foreground tracking-wide">
                {data.vs || "USD"}
              </span>
            </span>
          </div>
        </div>
        {/* Badge 24h wg changePct */}
        <Badge
          variant="outline"
          className={cn(
            "gap-1 bg-white dark:bg-black border-border",
            (data.changePct ?? 0) >= 0
              ? "text-green-700 dark:text-green-400"
              : "text-red-700 dark:text-red-400"
          )}
        >
          {(data.changePct ?? 0) >= 0 ? (
            <ArrowUpRight className="size-3" />
          ) : (
            <ArrowDownRight className="size-3" />
          )}
          {data!.changePct.toFixed(2)}%
          <span className="ml-1 text-[10px] text-muted-foreground">24h</span>
        </Badge>
      </CardHeader>
      <CardContent className={cn(compact && "pt-0")}>
        <div className={cn("h-28 sm:h-32", compact && "h-24")}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient
                  id={`priceFill-${gradId}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="var(--chart-2)"
                    stopOpacity={0.18}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--chart-2)"
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="time" hide tickLine={false} axisLine={false} />
              <YAxis hide domain={["auto", "auto"]} />
              {highlightPrediction && predictedCount > 0 && (
                <ReferenceArea
                  x1={chartData[chartData.length - predictedCount - 1]?.time}
                  x2={chartData[chartData.length - 1]?.time}
                  ifOverflow="hidden"
                  fill="var(--chart-1)"
                  fillOpacity={0.05}
                  strokeOpacity={0}
                />
              )}
              <Tooltip
                cursor={{
                  stroke: "var(--border)",
                  strokeWidth: 1,
                  strokeDasharray: "3 3",
                }}
                content={<CustomTooltip />}
              />
              <Area
                type="monotone"
                dataKey="price"
                fill={`url(#priceFill-${gradId})`}
                stroke="transparent"
                isAnimationActive={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="var(--chart-2)"
                dot={false}
                strokeWidth={2}
                connectNulls
                isAnimationActive={false}
                activeDot={{
                  r: 3,
                  stroke: "var(--card)",
                  strokeWidth: 2,
                  fill: "var(--chart-2)",
                }}
              />
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="var(--chart-1)"
                strokeDasharray="4 4"
                dot={false}
                strokeWidth={2}
                connectNulls
                isAnimationActive={false}
                activeDot={{
                  r: 3,
                  stroke: "var(--card)",
                  strokeWidth: 2,
                  fill: "var(--chart-1)",
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {/* Mini metryki */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] leading-tight text-muted-foreground">
          <div className="flex flex-col">
            <span className="uppercase tracking-wide">Now</span>
            <span className="text-foreground font-medium tabular-nums">
              {basePrice.toLocaleString(undefined, {
                maximumFractionDigits: 4,
              })}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="uppercase tracking-wide">
              Pred{horizonMinutes ? ` (+${horizonMinutes}m)` : ""}
            </span>
            <span className="text-foreground font-medium tabular-nums">
              {predictedLast?.toLocaleString(undefined, {
                maximumFractionDigits: 4,
              }) ?? "—"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="uppercase tracking-wide">
              Δ{horizonMinutes ? ` (+${horizonMinutes}m)` : ""}
            </span>
            <span
              className={cn(
                "font-medium tabular-nums",
                predUp
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {predictedLast != null
                ? (predictedLast - basePrice).toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })
                : "—"}
            </span>
            {predictedLast != null && basePrice > 0 && (
              <span className="tabular-nums">
                {(
                  ((predictedLast - basePrice) / basePrice) *
                  100
                ).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                %
              </span>
            )}
          </div>
        </div>
        {/* Legenda */}
        <div className="mt-2 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-[var(--chart-2)]" /> Cena
          </div>
          <div className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-[var(--chart-1)]" />{" "}
            Predykcja
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
