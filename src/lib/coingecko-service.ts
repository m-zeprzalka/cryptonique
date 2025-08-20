/**
 * CoinGecko API Service - Fallback provider
 * Free public API with better regional availability
 */

import { API_CONFIG } from "./config"
import { CryptoAsset, HistoryPoint } from "./binance-service"

class CoinGeckoService {
  private readonly baseUrl = "https://api.coingecko.com/api/v3"
  private readonly apiKey = API_CONFIG.COINGECKO_API_KEY

  /** Mapping from our symbols to CoinGecko IDs */
  private readonly symbolToId: Record<string, string> = {
    BTC: "bitcoin",
    ETH: "ethereum",
    BNB: "binancecoin",
    SOL: "solana",
    XRP: "ripple",
    ADA: "cardano",
    DOGE: "dogecoin",
    AVAX: "avalanche-2",
    DOT: "polkadot",
    LINK: "chainlink",
  }

  /** Get headers for API requests */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": "Cryptonique/1.0",
    }

    if (this.apiKey) {
      headers["x-cg-demo-api-key"] = this.apiKey
    }

    return headers
  }

  /** Get CoinGecko ID from symbol */
  private getCoinId(symbol: string): string {
    return this.symbolToId[symbol.toUpperCase()] || symbol.toLowerCase()
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
   * Fetch current market data from CoinGecko
   */
  async getMarkets(perPage = 10): Promise<CryptoAsset[]> {
    try {
      const symbols = Object.keys(this.symbolToId).slice(0, perPage)
      const ids = symbols.map((s) => this.getCoinId(s)).join(",")

      console.log(
        `[CoinGeckoService] Fetching markets for symbols: ${symbols.join(", ")}`
      )
      console.log(`[CoinGeckoService] Using CoinGecko IDs: ${ids}`)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT)

      const url = new URL(`${this.baseUrl}/simple/price`)
      url.searchParams.set("ids", ids)
      url.searchParams.set("vs_currencies", "usd")
      url.searchParams.set("include_24hr_change", "true")

      console.log(`[CoinGeckoService] Fetching from: ${url.toString()}`)

      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": "Cryptonique/1.0",
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.error(
          `[CoinGeckoService] API error: ${response.status} ${response.statusText}`
        )
        throw new Error(
          `CoinGecko API error: ${response.status} ${response.statusText}`
        )
      }

      const data = (await response.json()) as Record<
        string,
        {
          usd: number
          usd_24h_change: number
        }
      >

      console.log(`[CoinGeckoService] Raw response:`, Object.keys(data))

      const results = symbols
        .map((symbol) => {
          const id = this.getCoinId(symbol)
          const coinData = data[id]

          if (!coinData) {
            console.warn(`[CoinGeckoService] No data for ${symbol} (${id})`)
            return null
          }

          const price = coinData.usd || 0
          const change24h = coinData.usd_24h_change || 0

          console.log(
            `[CoinGeckoService] ${symbol}: $${price} (${change24h.toFixed(2)}%)`
          )

          return {
            id: symbol.toLowerCase(),
            symbol: symbol,
            name: this.getFullName(symbol),
            price,
            change24h,
          }
        })
        .filter((item): item is CryptoAsset => item !== null && item.price > 0)

      console.log(
        `[CoinGeckoService] Fetched ${results.length} markets from CoinGecko`
      )

      return results
    } catch (error) {
      console.error("[CoinGeckoService] Error fetching markets:", error)
      throw new Error(
        `Failed to fetch market data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      )
    }
  }

  /**
   * Fetch historical price data from CoinGecko
   */
  async getHistory(id: string, hours = 6): Promise<HistoryPoint[]> {
    try {
      // Convert our symbol to CoinGecko ID
      const symbol = id.toUpperCase()
      const coinId = this.getCoinId(symbol)

      console.log(
        `[CoinGeckoService] Getting history for ${symbol} -> ${coinId}, ${hours}h`
      )

      const days = hours <= 24 ? 1 : Math.ceil(hours / 24)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT)

      const url = new URL(`${this.baseUrl}/coins/${coinId}/market_chart`)
      url.searchParams.set("vs_currency", "usd")
      url.searchParams.set("days", String(days))
      url.searchParams.set("interval", hours <= 1 ? "minutely" : "hourly")

      console.log(`[CoinGeckoService] Fetching from: ${url.toString()}`)

      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": "Cryptonique/1.0",
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.error(
          `[CoinGeckoService] API error: ${response.status} ${response.statusText}`
        )
        throw new Error(
          `CoinGecko history API error: ${response.status} ${response.statusText}`
        )
      }

      const data = (await response.json()) as {
        prices: [number, number][]
      }

      console.log(
        `[CoinGeckoService] Raw prices length: ${data.prices?.length || 0}`
      )

      if (!data.prices || data.prices.length === 0) {
        console.warn(`[CoinGeckoService] No price data for ${coinId}`)
        return []
      }

      // Filter to requested time range
      const cutoff = Date.now() - hours * 60 * 60 * 1000
      const recentPrices = data.prices.filter(
        ([timestamp]) => timestamp >= cutoff
      )

      console.log(
        `[CoinGeckoService] Fetched ${recentPrices.length} history points for ${coinId} (filtered from ${data.prices.length})`
      )

      return recentPrices.map(([timestamp, price]) => ({
        t: timestamp,
        price,
      }))
    } catch (error) {
      console.error(
        `[CoinGeckoService] Error fetching history for ${id}:`,
        error
      )
      return []
    }
  }

  /**
   * Test if CoinGecko API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
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

export const coinGeckoService = new CoinGeckoService()
