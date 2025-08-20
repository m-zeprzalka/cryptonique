/**
 * Crypto Data Provider Manager
 * Handles multiple API providers with automatic fallback
 */

import { binanceService } from "./binance-service"
import { coinGeckoService } from "./coingecko-service"
import type { CryptoAsset, HistoryPoint } from "./binance-service"

export interface CryptoProvider {
  name: string
  getMarkets(perPage?: number): Promise<CryptoAsset[]>
  getHistory(id: string, hours?: number): Promise<HistoryPoint[]>
  isAvailable(): Promise<boolean>
}

class CryptoProviderManager {
  private providers: CryptoProvider[] = [
    {
      name: "Binance",
      getMarkets: (perPage) => binanceService.getMarkets(perPage),
      getHistory: (id, hours) => binanceService.getHistory(id, hours),
      isAvailable: () => binanceService.isAvailable(),
    },
    {
      name: "CoinGecko",
      getMarkets: (perPage) => coinGeckoService.getMarkets(perPage),
      getHistory: (id, hours) => coinGeckoService.getHistory(id, hours),
      isAvailable: () => coinGeckoService.isAvailable(),
    },
  ]

  private lastSuccessfulProvider: string | null = null

  /**
   * Get market data with automatic provider fallback
   */
  async getMarkets(perPage = 10): Promise<{
    data: CryptoAsset[]
    provider: string
  }> {
    // Try last successful provider first
    if (this.lastSuccessfulProvider) {
      const provider = this.providers.find(
        (p) => p.name === this.lastSuccessfulProvider
      )
      if (provider) {
        try {
          const data = await provider.getMarkets(perPage)
          console.log(
            `[ProviderManager] Successfully used ${provider.name} (cached)`
          )
          return { data, provider: provider.name }
        } catch (error) {
          console.warn(
            `[ProviderManager] Cached provider ${provider.name} failed:`,
            error
          )
          this.lastSuccessfulProvider = null
        }
      }
    }

    // Try all providers in order
    for (const provider of this.providers) {
      try {
        console.log(`[ProviderManager] Trying ${provider.name}...`)
        const data = await provider.getMarkets(perPage)

        console.log(
          `[ProviderManager] ${provider.name} returned ${data.length} items`
        )

        if (data.length > 0) {
          console.log(`[ProviderManager] Successfully used ${provider.name}`)
          this.lastSuccessfulProvider = provider.name
          return { data, provider: provider.name }
        } else {
          console.warn(`[ProviderManager] ${provider.name} returned empty data`)
        }
      } catch (error) {
        console.warn(`[ProviderManager] ${provider.name} failed:`, error)
        continue
      }
    }

    throw new Error("All cryptocurrency data providers are unavailable")
  }

  /**
   * Get historical data with automatic provider fallback
   */
  async getHistory(
    id: string,
    hours = 6
  ): Promise<{
    data: HistoryPoint[]
    provider: string
  }> {
    // Try last successful provider first
    if (this.lastSuccessfulProvider) {
      const provider = this.providers.find(
        (p) => p.name === this.lastSuccessfulProvider
      )
      if (provider) {
        try {
          const data = await provider.getHistory(id, hours)
          return { data, provider: provider.name }
        } catch (error) {
          console.warn(
            `[ProviderManager] History from ${provider.name} failed:`,
            error
          )
        }
      }
    }

    // Try all providers in order
    for (const provider of this.providers) {
      try {
        const data = await provider.getHistory(id, hours)
        return { data, provider: provider.name }
      } catch (error) {
        console.warn(
          `[ProviderManager] History from ${provider.name} failed:`,
          error
        )
        continue
      }
    }

    // Return empty array for graceful degradation
    return { data: [], provider: "none" }
  }

  /**
   * Check which providers are available
   */
  async getProviderStatus(): Promise<
    Array<{
      name: string
      available: boolean
      lastChecked: string
    }>
  > {
    const results = await Promise.allSettled(
      this.providers.map(async (provider) => ({
        name: provider.name,
        available: await provider.isAvailable(),
        lastChecked: new Date().toISOString(),
      }))
    )

    return results.map((result, index) =>
      result.status === "fulfilled"
        ? result.value
        : {
            name: this.providers[index]!.name,
            available: false,
            lastChecked: new Date().toISOString(),
          }
    )
  }

  /**
   * Generate synthetic data as last resort fallback
   */
  generateFallbackData(perPage = 10): CryptoAsset[] {
    const symbols = [
      "BTC",
      "ETH",
      "BNB",
      "SOL",
      "XRP",
      "ADA",
      "DOGE",
      "AVAX",
      "DOT",
      "LINK",
    ]
    const basePrices = [43000, 2400, 580, 160, 0.52, 0.45, 0.17, 35, 8.5, 18]

    return symbols.slice(0, perPage).map((symbol, index) => {
      // Generate realistic-looking synthetic data
      const basePrice = basePrices[index] || 1
      const variation = (Math.random() - 0.5) * 0.1 // ±5% variation
      const price = basePrice * (1 + variation)
      const change24h = (Math.random() - 0.5) * 10 // ±5% change

      return {
        id: symbol.toLowerCase(),
        symbol,
        name: symbol,
        price: parseFloat(
          price.toFixed(symbol === "BTC" ? 0 : symbol === "ETH" ? 0 : 4)
        ),
        change24h: parseFloat(change24h.toFixed(2)),
      }
    })
  }
}

export const cryptoProviderManager = new CryptoProviderManager()
