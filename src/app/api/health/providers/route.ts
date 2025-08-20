import { NextResponse } from "next/server"
import { binanceService } from "@/lib/binance-service"

export const revalidate = 0

// Vercel compatibility
export const runtime = 'nodejs'

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function GET() {
  try {
    const binanceAvailable = await binanceService.isAvailable()
    const timestamp = new Date().toISOString()

    const response = NextResponse.json({
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
    
    // Add CORS headers for Vercel
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
    
    return response
  } catch (error) {
    const response = NextResponse.json(
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
    
    // Add CORS headers for Vercel
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
    
    return response
  }
}
