/**
 * Application Configuration
 * Centralized configuration for Cryptonique app
 */

/** Cache revalidation time in seconds for API responses */
export const REVALIDATE_SECONDS = 30

/** Client-side refresh interval in milliseconds */
export const REFRESH_MS = 10_000

/** Default number of crypto assets to display */
export const DEFAULT_CRYPTO_COUNT = 10

/** API Configuration */
export const API_CONFIG = {
  /** Request timeout in milliseconds - reduced for Vercel */
  TIMEOUT: process.env.NODE_ENV === "production" ? 8000 : 10000,

  /** Maximum retries for failed requests */
  MAX_RETRIES: 3,

  /** Binance API base URL */
  BINANCE_BASE: process.env.BINANCE_API_URL || "https://api.binance.com/api/v3",

  /** CoinGecko API Key (optional) */
  COINGECKO_API_KEY: process.env.COINGECKO_API_KEY || null,
} as const

/** Application environment helpers */
export const IS_DEVELOPMENT = process.env.NODE_ENV === "development"
export const IS_PRODUCTION = process.env.NODE_ENV === "production"
