/**
 * CoinGecko API Service - Fallback provider
 * Free public API with better regional availability
 */

import { API_CONFIG } from "./config"
import { CryptoAsset, HistoryPoint } from "./binance-service"

class CoinGeckoService {
  private readonly baseUrl = "https://api.coingecko.com/api/v3"

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

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT)

      const url = new URL(`${this.baseUrl}/simple/price`)
      url.searchParams.set("ids", ids)
      url.searchParams.set("vs_currencies", "usd")
      url.searchParams.set("include_24hr_change", "true")

      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": "Cryptonique/1.0",
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
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

      console.log(
        `[CoinGeckoService] Fetched ${
          Object.keys(data).length
        } markets from CoinGecko`
      )

      return symbols
        .map((symbol) => {
          const id = this.getCoinId(symbol)
          const price = data[id]?.usd || 0
          const change24h = data[id]?.usd_24h_change || 0

          return {
            id: symbol.toLowerCase(),
            symbol: symbol,
            name: this.getFullName(symbol),
            price,
            change24h,
          }
        })
        .filter((item) => item.price > 0)
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
      const coinId = this.getCoinId(id)
      const days = hours <= 24 ? 1 : Math.ceil(hours / 24)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT)

      const url = new URL(`${this.baseUrl}/coins/${coinId}/market_chart`)
      url.searchParams.set("vs_currency", "usd")
      url.searchParams.set("days", String(days))
      url.searchParams.set("interval", hours <= 1 ? "minutely" : "hourly")

      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": "Cryptonique/1.0",
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(
          `CoinGecko history API error: ${response.status} ${response.statusText}`
        )
      }

      const data = (await response.json()) as {
        prices: [number, number][]
      }

      // Filter to requested time range
      const cutoff = Date.now() - hours * 60 * 60 * 1000
      const recentPrices = data.prices.filter(
        ([timestamp]) => timestamp >= cutoff
      )

      console.log(
        `[CoinGeckoService] Fetched ${recentPrices.length} history points for ${coinId}`
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
