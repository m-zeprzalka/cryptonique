// Core application types
export interface CryptoMarket {
  id: string
  symbol: string
  name: string
  price: number
  change24h: number
}

export interface CryptoMarketWithHistory extends CryptoMarket {
  series: PricePoint[]
}

export interface PricePoint {
  t: number
  price: number
  predicted?: number
}

export interface APIResponse {
  vs: string
  horizon: string
  interval: string
  predictedSteps: number
  items: CryptoMarketWithHistory[]
}

export interface BinanceTickerData {
  symbol: string
  lastPrice: string
  priceChangePercent: string
  [key: string]: string | number
}

export interface BinanceKlineData extends Array<string | number> {
  0: number // timestamp
  1: string // open
  2: string // high
  3: string // low
  4: string // close
  5: string // volume
  6: number // close timestamp
}

// UI Component types
export interface CryptoCardData {
  symbol: string
  name?: string
  livePrice: number
  points: PricePoint[]
  changePct: number
}

export interface CryptoCardProps {
  data?: CryptoCardData
  loading?: boolean
  error?: string | null
  compact?: boolean
  highlightPrediction?: boolean
}
