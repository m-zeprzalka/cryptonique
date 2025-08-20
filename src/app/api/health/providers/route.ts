import { NextResponse } from "next/server"
import { cryptoProviderManager } from "@/lib/crypto-provider-manager"

export const revalidate = 0

// Vercel compatibility
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

export async function GET() {
  try {
    const providerStatus = await cryptoProviderManager.getProviderStatus()
    const timestamp = new Date().toISOString()

    // Determine overall health
    const anyAvailable = providerStatus.some((p) => p.available)
    const allAvailable = providerStatus.every((p) => p.available)

    const response = NextResponse.json({
      timestamp,
      overallStatus: anyAvailable
        ? allAvailable
          ? "healthy"
          : "degraded"
        : "unhealthy",
      providers: providerStatus,
      summary: {
        total: providerStatus.length,
        available: providerStatus.filter((p) => p.available).length,
        unavailable: providerStatus.filter((p) => !p.available).length,
      },
    })

    // Add CORS headers for Vercel
    response.headers.set("Access-Control-Allow-Origin", "*")
    response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS")
    response.headers.set("Access-Control-Allow-Headers", "Content-Type")

    return response
  } catch (error) {
    const response = NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        overallStatus: "error",
        error: "Failed to check provider status",
        details: String(error),
      },
      { status: 500 }
    )

    // Add CORS headers for Vercel
    response.headers.set("Access-Control-Allow-Origin", "*")
    response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS")
    response.headers.set("Access-Control-Allow-Headers", "Content-Type")

    return response
  }
}
