/**
 * Binance API Service
 * Simple, direct connection to Binance API without multi-provider complexity
 */

import { API_CONFIG } from "./config"

export interface CryptoAsset {
  id: string
  symbol: string
  name: string
  price: number
  change24h: number
}

export interface HistoryPoint {
  t: number // timestamp in milliseconds
  price: number // price in USD
}

/**
 * Simple Binance service for cryptocurrency data
 */
class BinanceService {
  private readonly baseUrl = "https://api.binance.com/api/v3"

  /** Top crypto symbols supported by Binance */
  private readonly supportedSymbols = [
    "BTCUSDT",
    "ETHUSDT",
    "BNBUSDT",
    "SOLUSDT",
    "XRPUSDT",
    "ADAUSDT",
    "DOGEUSDT",
    "AVAXUSDT",
    "DOTUSDT",
    "LINKUSDT",
  ]

  /** Convert generic crypto symbol to Binance format */
  private mapSymbol(symbol: string): string {
    const symbolMap: Record<string, string> = {
      BTC: "BTCUSDT",
      ETH: "ETHUSDT",
      BNB: "BNBUSDT",
      SOL: "SOLUSDT",
      XRP: "XRPUSDT",
      ADA: "ADAUSDT",
      DOGE: "DOGEUSDT",
      AVAX: "AVAXUSDT",
      DOT: "DOTUSDT",
      LINK: "LINKUSDT",
    }

    return symbolMap[symbol.toUpperCase()] || `${symbol.toUpperCase()}USDT`
  }

  /** Get full cryptocurrency name from symbol */
  private getFullName(symbol: string): string {
    const nameMap: Record<string, string> = {
      BTC: "Bitcoin",
      ETH: "Ethereum",
      BNB: "BNB",
      SOL: "Solana",
      XRP: "XRP",
      ADA: "Cardano",
      DOGE: "Dogecoin",
      AVAX: "Avalanche",
      DOT: "Polkadot",
      LINK: "Chainlink",
    }

    return nameMap[symbol] || symbol
  }

  /**
   * Fetch current market data from Binance
   */
  async getMarkets(perPage = 10): Promise<CryptoAsset[]> {
    try {
      // Use targeted symbol query to get specific cryptocurrencies
      const symbolsQuery = this.supportedSymbols
        .slice(0, Math.min(perPage * 2, this.supportedSymbols.length))
        .map((s) => `"${s}"`)
        .join(",")

      // Create manual timeout for Vercel compatibility
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT)

      const response = await fetch(
        `${this.baseUrl}/ticker/24hr?symbols=[${symbolsQuery}]`,
        {
          next: { revalidate: 30 }, // Cache for 30 seconds
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            "User-Agent": "Cryptonique/1.0",
          },
        }
      )

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(
          `Binance API error: ${response.status} ${response.statusText}`
        )
      }

      const data = (await response.json()) as Array<{
        symbol: string
        lastPrice: string
        priceChangePercent: string
      }>

      console.log(
        `[BinanceService] Fetched ${data.length} markets from Binance`
      )

      return data.slice(0, perPage).map((ticker) => {
        const baseSymbol = ticker.symbol.replace("USDT", "")
        const result = {
          id: baseSymbol.toLowerCase(),
          symbol: baseSymbol,
          name: this.getFullName(baseSymbol),
          price: parseFloat(ticker.lastPrice),
          change24h: parseFloat(ticker.priceChangePercent),
        }

        return result
      })
    } catch (error) {
      console.error("[BinanceService] Error fetching markets:", error)
      throw new Error(
        `Failed to fetch market data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      )
    }
  }

  /**
   * Fetch historical price data from Binance
   */
  async getHistory(id: string, hours = 6): Promise<HistoryPoint[]> {
    try {
      const symbol = this.mapSymbol(id)

      // Determine optimal interval based on time range
      const interval = hours <= 1 ? "1m" : hours <= 6 ? "5m" : "1h"
      const limit = hours <= 1 ? 60 : hours <= 6 ? 72 : 24

      const url = new URL(`${this.baseUrl}/klines`)
      url.searchParams.set("symbol", symbol)
      url.searchParams.set("interval", interval)
      url.searchParams.set("limit", String(limit))

      // Create manual timeout for Vercel compatibility
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT)

      const response = await fetch(url.toString(), {
        next: { revalidate: 30 },
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": "Cryptonique/1.0",
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(
          `Binance klines API error: ${response.status} ${response.statusText}`
        )
      }

      const data = (await response.json()) as Array<
        [
          number, // Open time
          string, // Open price
          string, // High price
          string, // Low price
          string, // Close price
          string, // Volume
          number, // Close time
          string, // Quote asset volume
          number, // Number of trades
          string, // Taker buy base asset volume
          string, // Taker buy quote asset volume
          string // Ignore
        ]
      >

      console.log(
        `[BinanceService] Fetched ${data.length} history points for ${symbol}`
      )

      return data.map((kline) => ({
        t: kline[0], // Open time
        price: parseFloat(kline[4]), // Close price
      }))
    } catch (error) {
      console.error(`[BinanceService] Error fetching history for ${id}:`, error)
      // Return empty array for graceful degradation
      return []
    }
  }

  /**
   * Test if Binance API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Create manual timeout for Vercel compatibility
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(`${this.baseUrl}/ping`, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": "Cryptonique/1.0",
        },
      })

      clearTimeout(timeoutId)
      return response.ok
    } catch {
      return false
    }
  }
}

// Export singleton instance
export const binanceService = new BinanceService()
