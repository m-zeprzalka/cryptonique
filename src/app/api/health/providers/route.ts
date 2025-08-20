import { NextResponse } from "next/server"
import { binanceService } from "@/lib/binance-service"

export const revalidate = 0

export async function GET() {
  try {
    const binanceAvailable = await binanceService.isAvailable()
    const timestamp = new Date().toISOString()

    return NextResponse.json({
      timestamp,
      provider: "Binance",
      available: binanceAvailable,
      status: binanceAvailable ? "healthy" : "unhealthy",
      details: {
        apiUrl: "https://api.binance.com/api/v3",
        description: "Binance public API - no authentication required",
        lastChecked: timestamp,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        provider: "Binance",
        available: false,
        status: "error",
        error: "Failed to check Binance API status",
        details: String(error),
      },
      { status: 500 }
    )
  }
}
