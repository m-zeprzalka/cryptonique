const CP_BASE = "https://api.coinpaprika.com/v1"

export async function getMarketsCP({ perPage = 10 }: { perPage?: number }) {
  const res = await fetch(`${CP_BASE}/tickers`, {
    next: { revalidate: 300 },
    headers: { Accept: "application/json" },
  })
  if (!res.ok) throw new Error(`CoinPaprika error ${res.status}`)
  const json = (await res.json()) as Array<{
    id: string
    symbol: string
    name: string
    quotes: { USD: { price: number; percent_change_24h: number } }
  }>
  return json.slice(0, perPage).map((t) => ({
    id: t.id,
    symbol: t.symbol.toUpperCase(),
    name: t.name,
    price: t.quotes.USD.price,
    change24h: t.quotes.USD.percent_change_24h,
  }))
}
