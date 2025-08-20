import { NextRequest, NextResponse } from "next/server"
import { binanceService } from "@/lib/binance-service"
import { improvedPredict } from "@/lib/predict"

// Next.js requires this to be a literal for static analysis
export const revalidate = 30

// Vercel edge runtime compatibility
export const runtime = "nodejs"

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const vs = searchParams.get("vs") ?? "usd"
  const horizon = searchParams.get("h") ?? "1h"
  const interval = searchParams.get("i") ?? "minutely"
  const perPage = Number(searchParams.get("n") ?? 10)
  const debug = searchParams.get("debug") === "1"

  let usedProvider = "unknown"
  let providerStatus: Array<{
    name: string
    available: boolean
    lastChecked: string
  }> = []

  try {
    // Get provider status for debug info
    if (debug) {
      const isAvailable = await binanceService.isAvailable()
      providerStatus = [
        {
          name: "Binance",
          available: isAvailable,
          lastChecked: new Date().toISOString(),
        },
      ]
    }

    // Fetch market data from Binance only
    const markets = await binanceService.getMarkets(perPage)
    usedProvider = "binance"

    if (markets.length === 0) {
      console.error("[api/markets] No data from any provider - API failure")

      return NextResponse.json(
        {
          vs,
          horizon,
          interval,
          predictedSteps: 6,
          items: [],
          error: "No cryptocurrency data available from any provider",
          fallback: false,
          provider: "none",
        },
        { status: 503 }
      ) // Service Unavailable
    }

    console.log(
      `[api/markets] Fetched ${markets.length} markets from ${usedProvider}`
    )

    // Determine hours for historical data
    const hours = horizon === "6h" ? 6 : horizon === "3h" ? 3 : 1

    // Process markets with historical data and predictions
    const results: Array<{
      id: string
      symbol: string
      name: string
      price: number
      change24h: number
      series: Array<{ t: number; price: number }>
    }> = []

    // Process markets in batches to avoid overwhelming the API
    const batchSize = 4
    for (let i = 0; i < markets.length; i += batchSize) {
      const batch = markets.slice(i, i + batchSize)

      const batchResults = await Promise.allSettled(
        batch.map(async (market) => {
          try {
            // Get historical data from Binance
            const history = await binanceService.getHistory(market.id, hours)

            console.log(
              `[api/markets] History for ${market.symbol}: ${history.length} points from Binance`
            )

            // Filter recent data points
            const cutoff = Date.now() - hours * 60 * 60 * 1000
            const recentHistory = history.filter(
              (point: { t: number; price: number }) => point.t >= cutoff
            )

            // Generate predictions if we have historical data
            const predictions =
              recentHistory.length > 0 ? improvedPredict(recentHistory) : []

            console.log(
              `[api/markets] ${market.symbol}: ${recentHistory.length} history + ${predictions.length} predictions`
            )

            return {
              id: market.id,
              symbol: market.symbol,
              name: market.name,
              price: market.price,
              change24h: market.change24h,
              series: [...recentHistory, ...predictions],
            }
          } catch (error) {
            console.warn(
              `[api/markets] Failed to process ${market.symbol}:`,
              error
            )
            // Return market data without series on error
            return {
              id: market.id,
              symbol: market.symbol,
              name: market.name,
              price: market.price,
              change24h: market.change24h,
              series: [],
            }
          }
        })
      )

      // Collect successful results
      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          results.push(result.value)
        }
      }
    }

    const predictedSteps = 6
    const responseData = {
      vs,
      horizon,
      interval,
      predictedSteps,
      items: results,
      provider: usedProvider,
    }

    // Add debug information if requested
    if (debug) {
      const response = NextResponse.json({
        ...responseData,
        debug: {
          provider: usedProvider,
          marketsCount: markets.length,
          processedCount: results.length,
          providerStatus,
          timestamp: new Date().toISOString(),
        },
      })

      // Add CORS headers for Vercel
      response.headers.set("Access-Control-Allow-Origin", "*")
      response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS")
      response.headers.set("Access-Control-Allow-Headers", "Content-Type")

      return response
    }

    console.log(
      `[api/markets] Processed ${results.length} markets successfully using ${usedProvider}`
    )

    const response = NextResponse.json(responseData)

    // Add CORS headers for Vercel
    response.headers.set("Access-Control-Allow-Origin", "*")
    response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS")
    response.headers.set("Access-Control-Allow-Headers", "Content-Type")

    return response
  } catch (error) {
    console.error("[api/markets] Error:", error)

    // Return error response without fallback data
    const errorResponse = {
      vs,
      horizon,
      interval,
      predictedSteps: 6,
      items: [],
      error: error instanceof Error ? error.message : "Unknown error",
      fallback: false,
      provider: "none",
    }

    if (debug) {
      const response = NextResponse.json({
        ...errorResponse,
        debug: {
          provider: usedProvider,
          providerStatus,
          error: String(error),
          timestamp: new Date().toISOString(),
        },
      })

      // Add CORS headers for Vercel
      response.headers.set("Access-Control-Allow-Origin", "*")
      response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS")
      response.headers.set("Access-Control-Allow-Headers", "Content-Type")

      return response
    }

    const response = NextResponse.json(errorResponse, { status: 200 }) // Return 200 with fallback data

    // Add CORS headers for Vercel
    response.headers.set("Access-Control-Allow-Origin", "*")
    response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS")
    response.headers.set("Access-Control-Allow-Headers", "Content-Type")

    return response
  }
}
