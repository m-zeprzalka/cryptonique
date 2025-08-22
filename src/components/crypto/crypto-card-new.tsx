"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
} from "recharts"
import { cn } from "@/lib/utils"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { useId, useMemo, useState } from "react"
import type { CryptoCardData, PricePoint } from "@/lib/types"
import { improvedPredict, type PredictPoint } from "@/lib/predict"

type TimeHorizon = "1h" | "3h" | "6h"

interface SeriesData {
  time: string
  price?: number
  predicted?: number
  segment: "historical" | "current" | "prediction"
  index: number
  timestamp: number
}

function formatTime(ts: number) {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`
}

const CustomTooltip = ({
  active,
  payload,
  label,
  predUp,
}: {
  active?: boolean
  payload?: any[]
  label?: string
  predUp: boolean
}) => {
  if (!active || !payload?.length) return null

  const data = payload[0]?.payload
  const isHistorical = data?.segment === "historical"
  const isPrediction = data?.segment === "prediction"
  const isCurrent = data?.segment === "current"

  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-medium">{label}</div>
      {data && (
        <div className="space-y-1">
          {(isHistorical || isCurrent) && data.price != null && (
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[var(--chart-2)]" />
              <span className="text-muted-foreground">Cena:</span>
              <span className="font-medium tabular-nums">
                $
                {data.price.toLocaleString(undefined, {
                  maximumFractionDigits: 4,
                })}
              </span>
            </div>
          )}
          {(isPrediction || isCurrent) && data.predicted != null && (
            <div className="flex items-center gap-2">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: predUp ? "#22c55e" : "#ef4444" }}
              />
              <span className="text-muted-foreground">Predykcja:</span>
              <span
                className={cn(
                  "font-medium tabular-nums",
                  predUp ? "text-green-600" : "text-red-600"
                )}
              >
                $
                {data.predicted.toLocaleString(undefined, {
                  maximumFractionDigits: 4,
                })}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface CryptoCardProps {
  data?: CryptoCardData
  compact?: boolean
  loading?: boolean
  error?: string | null
  highlightPrediction?: boolean
}

export function CryptoCard({
  data,
  compact = false,
  loading = false,
  error = null,
  highlightPrediction = false,
}: CryptoCardProps) {
  const gradId = useId()
  const [selectedHorizon, setSelectedHorizon] = useState<TimeHorizon>("3h")

  // Main chart data processing with proper prediction integration
  const { chartData, currentPrice, predictedLast, predUp } = useMemo(() => {
    if (!data?.points || data.points.length === 0) {
      console.log("❌ No data points available")
      return {
        chartData: [],
        currentPrice: 0,
        predictedLast: null,
        predUp: false,
      }
    }

    console.log(`\n🚀 PROCESSING ${data.symbol} (${selectedHorizon})`)

    // Time configuration for 50/50 split
    const timeConfig = {
      "1h": { historyMinutes: 30, predictionMinutes: 30 },
      "3h": { historyMinutes: 90, predictionMinutes: 90 },
      "6h": { historyMinutes: 180, predictionMinutes: 180 },
    }

    const { historyMinutes, predictionMinutes } = timeConfig[selectedHorizon]
    const currentTime = Date.now()
    const historicalCutoffTime = currentTime - historyMinutes * 60 * 1000

    console.log(
      `⏰ Config: ${historyMinutes}min history + ${predictionMinutes}min predictions`
    )
    console.log(`📊 Total data points: ${data.points.length}`)

    // Filter to last X minutes only
    const historicalPoints = data.points.filter(
      (p: PricePoint) => p.t >= historicalCutoffTime
    )

    console.log(
      `✅ Filtered to ${historicalPoints.length} points from last ${historyMinutes} minutes`
    )

    if (historicalPoints.length === 0) {
      console.warn("❌ No historical points after filtering!")
      return {
        chartData: [],
        currentPrice: 0,
        predictedLast: null,
        predUp: false,
      }
    }

    // Current price = most recent historical point
    const currentPrice = historicalPoints[historicalPoints.length - 1].price
    console.log(`💰 Current price: $${currentPrice.toFixed(4)}`)

    // Convert historical data to chart format
    const historicalChartData: SeriesData[] = historicalPoints.map(
      (point: PricePoint, index: number) => ({
        time: formatTime(point.t),
        price: point.price,
        predicted: undefined,
        segment: "historical",
        index,
        timestamp: point.t,
      })
    )

    // Generate predictions using our advanced algorithm
    console.log("🔮 Generating predictions with improvedPredict...")
    const numPredictionPoints = Math.max(5, Math.min(20, predictionMinutes / 5)) // 5-20 points depending on horizon
    const predictionResults = improvedPredict(
      historicalPoints,
      numPredictionPoints
    )

    console.log(`📈 Generated ${predictionResults.length} prediction points`)

    // Create prediction chart data with proper timestamps
    const predictionIntervalMs =
      (predictionMinutes * 60 * 1000) / predictionResults.length
    const predictionChartData: SeriesData[] = predictionResults.map(
      (predictedPoint: PredictPoint, index: number) => ({
        time: formatTime(currentTime + (index + 1) * predictionIntervalMs),
        price: undefined,
        predicted: predictedPoint.price,
        segment: "prediction",
        index: historicalChartData.length + 1 + index,
        timestamp: currentTime + (index + 1) * predictionIntervalMs,
      })
    )

    // Current transition point
    const currentPoint: SeriesData = {
      time: formatTime(currentTime),
      price: currentPrice,
      predicted: currentPrice, // Both lines meet here
      segment: "current",
      index: historicalChartData.length,
      timestamp: currentTime,
    }

    const finalPredictedPrice =
      predictionResults[predictionResults.length - 1].price
    const predUp = finalPredictedPrice >= currentPrice

    const chartData = [
      ...historicalChartData,
      currentPoint,
      ...predictionChartData,
    ]

    console.log(
      `📊 Final chart: ${historicalChartData.length} history + 1 current + ${predictionChartData.length} predictions = ${chartData.length} total`
    )
    console.log(
      `🎯 Prediction: ${predUp ? "📈 UP" : "📉 DOWN"} ($${currentPrice.toFixed(
        4
      )} → $${finalPredictedPrice.toFixed(4)})`
    )
    console.log("✅ Processing complete\n")

    return {
      chartData,
      currentPrice,
      predictedLast: finalPredictedPrice,
      predUp,
    }
  }, [data, selectedHorizon])

  // Loading state
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

  // Error state
  if (error) {
    return (
      <Card className="shadow-none border-destructive/40">
        <div className="p-4 text-xs text-destructive">{error}</div>
      </Card>
    )
  }

  // No data state
  if (!data) {
    return (
      <Card className="shadow-none">
        <div className="p-4 text-xs text-muted-foreground">
          Dane historyczne nie mogą zostać pobrane
        </div>
      </Card>
    )
  }

  return (
    <Card className="shadow-none overflow-hidden">
      <CardHeader className={cn("pb-2", compact && "pb-1")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-7 rounded-md border bg-muted overflow-hidden">
              <div className="size-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                {data.symbol.slice(0, 2)}
              </div>
            </div>
            <div className="space-y-0.5">
              <h3
                className={cn(
                  "font-semibold leading-none",
                  compact && "text-sm"
                )}
              >
                {data.name || data.symbol}
              </h3>
              <p className="text-xs text-muted-foreground uppercase">
                {data.symbol}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div
              className={cn(
                "font-mono text-sm font-medium",
                compact && "text-xs"
              )}
            >
              $
              {(data.livePrice ?? 0).toLocaleString(undefined, {
                maximumFractionDigits: 4,
              })}
            </div>
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
              {data.changePct?.toFixed(2) ?? "0.00"}%
              <span className="ml-1 text-[12px] text-muted-foreground">
                24h
              </span>
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn(compact && "pt-0")}>
        {/* Time Horizon Selector */}
        <div className="mb-3 flex justify-center">
          <div className="flex rounded-lg border bg-muted/30 p-1">
            {(["1h", "3h", "6h"] as TimeHorizon[]).map((horizon) => (
              <button
                key={horizon}
                onClick={() => setSelectedHorizon(horizon)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                  selectedHorizon === horizon
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {horizon}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className={cn("h-28 sm:h-32", compact && "h-24")}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                style={{ outline: "none" }}
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
                  <linearGradient
                    id={`predictionFill-${gradId}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={predUp ? "#22c55e" : "#ef4444"}
                      stopOpacity={0.18}
                    />
                    <stop
                      offset="100%"
                      stopColor={predUp ? "#22c55e" : "#ef4444"}
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="time" hide tickLine={false} axisLine={false} />
                <YAxis hide domain={["auto", "auto"]} />

                {highlightPrediction && (
                  <ReferenceArea
                    x1={chartData.find((d) => d.segment === "current")?.time}
                    x2={chartData.at(-1)?.time}
                    ifOverflow="hidden"
                    fill={predUp ? "#22c55e" : "#ef4444"}
                    fillOpacity={0.08}
                    strokeOpacity={0}
                  />
                )}

                <Tooltip
                  cursor={{
                    stroke: "var(--border)",
                    strokeWidth: 1,
                    strokeDasharray: "3 3",
                  }}
                  content={<CustomTooltip predUp={predUp} />}
                  wrapperStyle={{ outline: "none" }}
                />

                {/* Historical line with area */}
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
                    style: { outline: "none" },
                  }}
                />

                {/* Prediction line */}
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke={predUp ? "#22c55e" : "#ef4444"}
                  strokeDasharray="4 4"
                  dot={false}
                  strokeWidth={2}
                  connectNulls
                  isAnimationActive={false}
                  activeDot={{
                    r: 3,
                    stroke: "var(--card)",
                    strokeWidth: 2,
                    fill: predUp ? "#22c55e" : "#ef4444",
                    style: { outline: "none" },
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center border-2 border-dashed border-muted-foreground/20 rounded-lg">
              <div className="text-center">
                <div className="text-muted-foreground text-xs mb-1">
                  Brak danych wykresu
                </div>
                <div className="text-muted-foreground/70 text-[10px]">
                  Dane historyczne nie mogą zostać pobrane
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Metrics */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] leading-tight text-muted-foreground">
          <div className="flex flex-col">
            <span className="uppercase tracking-wide">Aktualna</span>
            <span className="text-foreground font-medium tabular-nums">
              $
              {currentPrice.toLocaleString(undefined, {
                maximumFractionDigits: 4,
              })}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="uppercase tracking-wide">
              Pred ({selectedHorizon})
            </span>
            <span
              className={cn(
                "font-medium tabular-nums",
                predictedLast != null
                  ? predUp
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                  : "text-foreground"
              )}
            >
              {predictedLast != null
                ? `$${predictedLast.toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })}`
                : "—"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="uppercase tracking-wide">
              Δ ({selectedHorizon})
            </span>
            <div className="flex flex-col">
              <span
                className={cn(
                  "font-medium tabular-nums",
                  predictedLast != null
                    ? predUp
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                    : "text-foreground"
                )}
              >
                {predictedLast != null
                  ? `$${(predictedLast - currentPrice).toLocaleString(
                      undefined,
                      {
                        maximumFractionDigits: 4,
                      }
                    )}`
                  : "—"}
              </span>
              {predictedLast != null && currentPrice > 0 && (
                <span
                  className={cn(
                    "tabular-nums",
                    predUp
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  )}
                >
                  {(
                    ((predictedLast - currentPrice) / currentPrice) *
                    100
                  ).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  %
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-2 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-[var(--chart-2)]" />
            Historyczna
          </div>
          <div className="flex items-center gap-1">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: predUp ? "#22c55e" : "#ef4444" }}
            />
            Predykcja
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
