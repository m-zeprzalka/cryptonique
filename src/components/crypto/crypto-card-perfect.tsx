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
import { useId, useMemo, useState } from "react"

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

export type TimeHorizon = "1h" | "3h" | "6h"

function iconUrl(sym: string) {
  const s = sym.toLowerCase()
  return `https://assets.coincap.io/assets/icons/${s}@2x.png`
}

// Zoptymalizowany tooltip z lepszym formatowaniem
function CustomTooltip(
  props: TooltipProps<number, string> & { predUp?: boolean }
) {
  const {
    active,
    payload,
    label,
    predUp = true,
  } = props as {
    active?: boolean
    payload?: Array<{ dataKey: string; value: number | string }>
    label?: string
    predUp?: boolean
  }
  if (!active || !payload?.length) return null

  const priceData = payload.find((p: any) => p.dataKey === "price")
  const predData = payload.find((p: any) => p.dataKey === "predicted")

  return (
    <div className="rounded-lg border bg-background/95 backdrop-blur-sm px-3 py-2 text-xs shadow-lg">
      <div className="font-medium mb-1.5 text-foreground">{label}</div>
      {priceData?.value != null && (
        <div className="flex items-center gap-2 text-foreground mb-1">
          <span className="inline-block size-2.5 rounded-full bg-blue-500" />
          <span className="font-medium">Cena:</span>
          <span className="font-mono">
            {typeof priceData.value === "number"
              ? priceData.value.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6,
                })
              : priceData.value}
          </span>
        </div>
      )}
      {predData?.value != null && (
        <div className="flex items-center gap-2 text-foreground">
          <span
            className="inline-block size-2.5 rounded-full"
            style={{ backgroundColor: predUp ? "#22c55e" : "#ef4444" }}
          />
          <span className="font-medium">Predykcja:</span>
          <span className="font-mono">
            {typeof predData.value === "number"
              ? predData.value.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6,
                })
              : predData.value}
          </span>
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
  defaultHorizon?: TimeHorizon
}

export function CryptoCard({
  data,
  loading,
  error,
  compact,
  highlightPrediction = true,
  defaultHorizon = "1h",
}: CryptoCardProps) {
  const gradId = useId()
  const [selectedHorizon, setSelectedHorizon] =
    useState<TimeHorizon>(defaultHorizon)

  // Główna logika przetwarzania danych z PRAWDZIWYM podziałem 50/50
  const {
    chartData,
    predictionStartIndex,
    currentPrice,
    predictedPrice,
    priceChange,
    priceChangePercent,
    predUp,
    totalDataPoints,
    historicalPoints,
    predictionPoints,
  } = useMemo(() => {
    if (!data?.points?.length) {
      return {
        chartData: [],
        predictionStartIndex: 0,
        currentPrice: 0,
        predictedPrice: 0,
        priceChange: 0,
        priceChangePercent: 0,
        predUp: false,
        totalDataPoints: 0,
        historicalPoints: 0,
        predictionPoints: 0,
      }
    }

    // Separacja danych: historyczne vs predykcje (z API)
    const historicalData = data.points.filter(
      (p) => p.predicted == null && !isNaN(p.price)
    )
    const predictionData = data.points.filter((p) => p.predicted != null)

    // Konfiguracja horyzontów czasowych dla IDEALNEGO podziału 50/50
    const horizonConfig = {
      "1h": { maxHistorical: 15, maxPrediction: 15 }, // 15+15 = 30 punktów
      "3h": { maxHistorical: 20, maxPrediction: 20 }, // 20+20 = 40 punktów
      "6h": { maxHistorical: 25, maxPrediction: 25 }, // 25+25 = 50 punktów
    }

    const { maxHistorical, maxPrediction } = horizonConfig[selectedHorizon]

    // Wybierz DOKŁADNIE potrzebną liczbę punktów historycznych (ostatnie X punktów)
    const selectedHistorical = historicalData.slice(-maxHistorical)

    // Wybierz DOKŁADNIE potrzebną liczbę punktów predykcji (pierwsze X punktów)
    const selectedPredictions = predictionData.slice(0, maxPrediction)

    // Stwórz tablicę chart data z DOKŁADNYM podziałem 50/50
    const historicalChartData = selectedHistorical.map((point, index) => ({
      time: formatTime(point.t),
      price: point.price,
      predicted: undefined,
      segment: "historical" as const,
      originalIndex: index,
      timestamp: point.t,
    }))

    const predictionChartData = selectedPredictions.map((point, index) => ({
      time: formatTime(point.t),
      price: undefined,
      predicted: point.predicted,
      segment: "prediction" as const,
      originalIndex: index,
      timestamp: point.t,
    }))

    // Punkt przejścia (ostatni historyczny = pierwszy predykcji)
    const lastHistoricalPrice = selectedHistorical.at(-1)?.price ?? 0
    const firstPredictionPrice =
      selectedPredictions.at(0)?.predicted ?? lastHistoricalPrice

    const transitionPoint = {
      time: formatTime(selectedHistorical.at(-1)?.t ?? Date.now()),
      price: lastHistoricalPrice,
      predicted: firstPredictionPrice,
      segment: "transition" as const,
      originalIndex: historicalChartData.length,
      timestamp: selectedHistorical.at(-1)?.t ?? Date.now(),
    }

    // Finalna tablica chart data z PERFEKCYJNYM podziałem 50/50
    const chartData = [
      ...historicalChartData,
      transitionPoint,
      ...predictionChartData,
    ]

    // Indeks gdzie zaczynają się predykcje (dla ReferenceArea)
    const predictionStartIndex = historicalChartData.length

    // Obliczenia metryki
    const currentPrice = data.livePrice ?? lastHistoricalPrice
    const predictedPrice = selectedPredictions.at(-1)?.predicted ?? currentPrice
    const priceChange = predictedPrice - currentPrice
    const priceChangePercent =
      currentPrice > 0 ? (priceChange / currentPrice) * 100 : 0
    const predUp = predictedPrice >= currentPrice

    console.log(`[PERFECT] ${data.symbol} ${selectedHorizon}:`, {
      historical: selectedHistorical.length,
      predictions: selectedPredictions.length,
      total: chartData.length,
      split: `${selectedHistorical.length}/${selectedPredictions.length}`,
      predictionStartAt: predictionStartIndex,
    })

    return {
      chartData,
      predictionStartIndex,
      currentPrice,
      predictedPrice,
      priceChange,
      priceChangePercent,
      predUp,
      totalDataPoints: chartData.length,
      historicalPoints: selectedHistorical.length,
      predictionPoints: selectedPredictions.length,
    }
  }, [data, selectedHorizon])

  // Loading state z skeleton
  if (loading) {
    return (
      <Card className={cn("overflow-hidden", compact && "text-xs")}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg border bg-muted animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                <div className="h-3 w-16 bg-muted/70 rounded animate-pulse" />
              </div>
            </div>
            <div className="h-6 w-16 bg-muted rounded animate-pulse" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <div className="h-8 w-40 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-32 bg-muted/40 rounded animate-pulse" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                <div className="h-4 w-12 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardContent className="p-6">
          <div className="text-sm text-destructive font-medium">
            Błąd ładowania
          </div>
          <div className="text-xs text-destructive/80 mt-1">{error}</div>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-200 hover:shadow-md",
        compact && "text-xs"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          {/* Crypto Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative size-10 rounded-lg border bg-gradient-to-br from-background to-muted/50 overflow-hidden p-1">
              <Image
                src={iconUrl(data.symbol)}
                alt={data.symbol}
                className="object-contain w-full h-full"
                width={40}
                height={40}
                loading="lazy"
                onError={(e) => {
                  // Fallback: pokazuje inicjały symbolu
                  const img = e.target as HTMLImageElement
                  img.style.display = "none"
                  const parent = img.parentElement
                  if (parent) {
                    parent.innerHTML = `
                      <div class="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                        ${data.symbol.slice(0, 2)}
                      </div>
                    `
                  }
                }}
              />
            </div>
            <div className="flex flex-col min-w-0">
              <h3 className="font-semibold leading-tight truncate">
                {data.name || data.symbol}
                {data.name && (
                  <span className="ml-2 text-xs text-muted-foreground font-normal">
                    {data.symbol}
                  </span>
                )}
              </h3>
              <div className="text-sm font-mono tabular-nums">
                $
                {currentPrice.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6,
                })}
              </div>
            </div>
          </div>

          {/* 24h Change Badge */}
          <Badge
            variant="outline"
            className={cn(
              "gap-1.5 shrink-0",
              data.changePct >= 0
                ? "text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
                : "text-red-700 dark:text-red-400 border-red-200 dark:border-red-800"
            )}
          >
            {data.changePct >= 0 ? (
              <ArrowUpRight className="size-3" />
            ) : (
              <ArrowDownRight className="size-3" />
            )}
            {Math.abs(data.changePct).toFixed(2)}%
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Time Horizon Selector */}
        <div className="flex justify-center">
          <div className="inline-flex rounded-lg border bg-muted/50 p-1">
            {(["1h", "3h", "6h"] as TimeHorizon[]).map((horizon) => (
              <button
                key={horizon}
                onClick={() => setSelectedHorizon(horizon)}
                className={cn(
                  "px-4 py-1.5 text-xs font-medium rounded-md transition-all duration-200",
                  selectedHorizon === horizon
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
              >
                {horizon}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className={cn("h-32", compact && "h-28")}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <defs>
                  <linearGradient
                    id={`gradient-${gradId}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="rgb(59, 130, 246)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="100%"
                      stopColor="rgb(59, 130, 246)"
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                  <linearGradient
                    id={`predGradient-${gradId}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={
                        predUp ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)"
                      }
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="100%"
                      stopColor={
                        predUp ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)"
                      }
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  className="opacity-30"
                  vertical={false}
                />

                <XAxis dataKey="time" hide tickLine={false} axisLine={false} />

                <YAxis
                  hide
                  domain={["dataMin - dataMin*0.02", "dataMax + dataMax*0.02"]}
                />

                {/* Highlight Prediction Area */}
                {highlightPrediction &&
                  predictionStartIndex < chartData.length && (
                    <ReferenceArea
                      x1={chartData[predictionStartIndex]?.time}
                      x2={chartData[chartData.length - 1]?.time}
                      fill={predUp ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)"}
                      fillOpacity={0.08}
                      strokeOpacity={0}
                    />
                  )}

                <Tooltip
                  cursor={{
                    stroke: "rgb(148, 163, 184)",
                    strokeWidth: 1,
                    strokeDasharray: "4 4",
                  }}
                  content={<CustomTooltip predUp={predUp} />}
                />

                {/* Historical Price Area */}
                <Area
                  type="monotone"
                  dataKey="price"
                  fill={`url(#gradient-${gradId})`}
                  stroke="transparent"
                  isAnimationActive={false}
                  connectNulls={false}
                />

                {/* Historical Price Line */}
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="rgb(59, 130, 246)"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                  connectNulls={false}
                  activeDot={{
                    r: 4,
                    stroke: "rgb(255, 255, 255)",
                    strokeWidth: 2,
                    fill: "rgb(59, 130, 246)",
                  }}
                />

                {/* Prediction Line */}
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke={predUp ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)"}
                  strokeWidth={2.5}
                  strokeDasharray="5 5"
                  dot={false}
                  isAnimationActive={false}
                  connectNulls={false}
                  activeDot={{
                    r: 4,
                    stroke: "rgb(255, 255, 255)",
                    strokeWidth: 2,
                    fill: predUp ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)",
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg">
              <div className="text-center text-muted-foreground">
                <div className="text-sm font-medium">Brak danych</div>
                <div className="text-xs">Dane historyczne niedostępne</div>
              </div>
            </div>
          )}
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <div className="text-muted-foreground font-medium uppercase tracking-wide">
              Aktualna
            </div>
            <div className="font-mono text-sm font-semibold">
              $
              {currentPrice.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4,
              })}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-muted-foreground font-medium uppercase tracking-wide">
              Pred. {selectedHorizon}
            </div>
            <div
              className={cn(
                "font-mono text-sm font-semibold",
                predUp
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              $
              {predictedPrice.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4,
              })}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-muted-foreground font-medium uppercase tracking-wide">
              Zmiana
            </div>
            <div className="space-y-0.5">
              <div
                className={cn(
                  "font-mono text-sm font-semibold",
                  predUp
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {predUp ? "+" : ""}$
                {priceChange.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 4,
                })}
              </div>
              <div
                className={cn(
                  "font-mono text-xs",
                  predUp
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {predUp ? "+" : ""}
                {priceChangePercent.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

        {/* Chart Legend */}
        <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground pt-2 border-t border-border/50">
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-full bg-blue-500" />
            <span>Historia ({historicalPoints})</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="size-3 rounded-full"
              style={{
                backgroundColor: predUp
                  ? "rgb(34, 197, 94)"
                  : "rgb(239, 68, 68)",
              }}
            />
            <span>Predykcja ({predictionPoints})</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
