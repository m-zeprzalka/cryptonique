# Environment Variables Setup for Vercel

## Required for Production Deployment

Add these environment variables in your Vercel project dashboard:

### 1. CoinGecko API Key (Optional but Recommended)

```
COINGECKO_API_KEY=your_api_key_here
```

- Get a free API key from: https://www.coingecko.com/en/api/pricing
- Improves rate limits and reliability
- Without this, the app may hit rate limits on Vercel

### 2. Node Environment

```
NODE_ENV=production
```

### 3. App URL

```
NEXT_PUBLIC_APP_URL=https://your-vercel-domain.vercel.app
```

## How to Add Variables to Vercel

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable with its value
4. Redeploy your application

## Local Development

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

## Troubleshooting

If you see "No cryptocurrency data available" errors:

- Check that COINGECKO_API_KEY is set correctly
- Verify the API key is valid
- Check Vercel function logs for detailed error messages
