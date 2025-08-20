import { NextRequest, NextResponse } from "next/server"
import { cryptoProviderManager } from "@/lib/crypto-provider-manager"
import { improvedPredict } from "@/lib/predict"

// Next.js requires this to be a literal for static analysis
export const revalidate = 30

// Vercel edge runtime compatibility
export const runtime = "nodejs"

/**
 * Generate synthetic historical data for charts when real data is unavailable
 */
function generateSyntheticHistory(
  currentPrice: number,
  hours: number
): Array<{ t: number; price: number }> {
  const points: Array<{ t: number; price: number }> = []
  const now = Date.now()
  const intervalMs = hours <= 1 ? 60000 : 300000 // 1min for 1h, 5min for longer
  const totalPoints = hours <= 1 ? 60 : Math.min(72, hours * 12)

  let price = currentPrice

  for (let i = totalPoints - 1; i >= 0; i--) {
    const timestamp = now - i * intervalMs

    // Generate realistic price variations (±0.5% per interval)
    const variation = (Math.random() - 0.5) * 0.01
    price = price * (1 + variation)

    // Add some trend and noise
    const trendFactor = Math.sin(i / (totalPoints / 4)) * 0.002
    const noiseFactor = (Math.random() - 0.5) * 0.003
    price = price * (1 + trendFactor + noiseFactor)

    // Ensure price stays positive and realistic
    price = Math.max(price, currentPrice * 0.8)
    price = Math.min(price, currentPrice * 1.2)

    points.push({
      t: timestamp,
      price: parseFloat(price.toFixed(8)),
    })
  }

  // Ensure the last point matches current price
  if (points.length > 0) {
    points[points.length - 1]!.price = currentPrice
  }

  return points
}

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
      providerStatus = await cryptoProviderManager.getProviderStatus()
    }

    // Fetch market data with automatic fallback
    const marketResult = await cryptoProviderManager.getMarkets(perPage)
    const markets = marketResult.data
    usedProvider = marketResult.provider

    if (markets.length === 0) {
      // Use fallback synthetic data as last resort
      console.warn("[api/markets] No data from providers, using fallback data")
      const fallbackMarkets =
        cryptoProviderManager.generateFallbackData(perPage)

      const responseData = {
        vs,
        horizon,
        interval,
        predictedSteps: 6,
        items: fallbackMarkets.map((market) => ({
          id: market.id,
          symbol: market.symbol,
          name: market.name,
          price: market.price,
          change24h: market.change24h,
          series: generateSyntheticHistory(market.price, hours), // Generate synthetic chart data
        })),
        fallback: true,
        provider: "synthetic",
      }

      const response = NextResponse.json(responseData)
      response.headers.set("Access-Control-Allow-Origin", "*")
      response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS")
      response.headers.set("Access-Control-Allow-Headers", "Content-Type")
      return response
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
            // Get historical data with fallback
            const historyResult = await cryptoProviderManager.getHistory(
              market.id,
              hours
            )
            const history = historyResult.data

            console.log(
              `[api/markets] History for ${market.symbol}: ${history.length} points from ${historyResult.provider}`
            )

            // Filter recent data points
            const cutoff = Date.now() - hours * 60 * 60 * 1000
            const recentHistory = history.filter((point) => point.t >= cutoff)

            // If no historical data, generate synthetic series for chart visualization
            let finalHistory = recentHistory
            if (recentHistory.length === 0) {
              console.log(
                `[api/markets] No history for ${market.symbol}, generating synthetic data`
              )
              finalHistory = generateSyntheticHistory(market.price, hours)
            }

            // Generate predictions if we have historical data
            const predictions =
              finalHistory.length > 0 ? improvedPredict(finalHistory) : []

            console.log(
              `[api/markets] ${market.symbol}: ${finalHistory.length} history + ${predictions.length} predictions`
            )

            return {
              id: market.id,
              symbol: market.symbol,
              name: market.name,
              price: market.price,
              change24h: market.change24h,
              series: [...finalHistory, ...predictions],
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

    // Determine hours for fallback data
    const hours = horizon === "6h" ? 6 : horizon === "3h" ? 3 : 1

    // Fallback to synthetic data on complete failure
    console.warn("[api/markets] Complete failure, using synthetic fallback")
    const fallbackMarkets = cryptoProviderManager.generateFallbackData(perPage)

    const errorResponse = {
      vs,
      horizon,
      interval,
      predictedSteps: 6,
      items: fallbackMarkets.map((market) => ({
        id: market.id,
        symbol: market.symbol,
        name: market.name,
        price: market.price,
        change24h: market.change24h,
        series: generateSyntheticHistory(market.price, hours),
      })),
      error: error instanceof Error ? error.message : "Unknown error",
      fallback: true,
      provider: "synthetic",
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
