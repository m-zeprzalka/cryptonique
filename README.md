# Cryptonique

**Aplikacja do przewidywania kursów kryptowalut z wykorzystaniem AI**

Minimalistyczna, szybka aplikacja webowa dostarczająca dane w czasie rzeczywistym oraz predykcje cenowe dla głównych kryptowalut. Zbudowana z Next.js 15, TypeScript i Tailwind CSS.

## 🎯 **Główne Funkcjonalności**

### **Real-time Data**

- 📊 Streaming cen kryptowalut z Binance API
- 🔄 Aktualizacje co 10 sekund
- 💹 Dokładne dane 24h change (bez zaokrągleń)
- 📈 Wykresy cenowe w czasie rzeczywistym

### **AI Predictions**

- 🤖 Algorytmy predykcyjne oparte na analizie technicznej
- ⏱️ Krótkoterminowe prognozy (1h horyzont)
- 📊 Wizualizacja predykcji na wykresach
- 🎯 6-punktowe predykcje cenowe

### **UI/UX**

- 🌓 Dark/Light mode
- 📱 Responsywny design (mobile-first)
- ⚡ Optymalizacja performance
- 🎨 Minimalistyczny, przejrzysty interfejs

## 🏗️ **Architektura Aplikacji**

### **Tech Stack**

```
Frontend:  Next.js 15 + React 19 + TypeScript
Styling:   Tailwind CSS 4 + CVA
Charts:    Recharts
API:       Next.js API Routes
Data:      Binance API (REST)
State:     SWR (server state)
Icons:     Lucide React + CoinCap Assets
```

### **Struktura Folderów**

```
src/
├── app/
│   ├── api/markets/         # API endpoint dla danych crypto
│   ├── sections/           # Główne sekcje aplikacji
│   └── page.tsx           # Strona główna
├── components/
│   ├── crypto/            # Komponenty crypto-specific
│   ├── site/              # Komponenty layoutu
│   └── ui/                # Podstawowe komponenty UI
└── lib/
    ├── binance-service.ts  # Serwis Binance API
    ├── predict.ts         # Algorytmy predykcyjne
    ├── config.ts          # Konfiguracja aplikacji
    ├── types.ts           # Definicje typów TypeScript
    └── utils.ts           # Pomocnicze funkcje
```

## 📊 **Data Flow**

### **API Architecture**

```
Client → /api/markets → BinanceService → Binance API
                    ↓
                Predict Algorithm
                    ↓
              Response with predictions
```

### **Data Sources**

- **Binance API** (`/ticker/24hr`) - ceny i zmianы 24h
- **Binance API** (`/klines`) - dane historyczne do predykcji
- **CoinCap Assets** - ikony kryptowalut

### **Supported Cryptocurrencies**

```typescript
BTC, ETH, BNB, ADA, XRP, LINK, DOGE, SOL, DOT, AVAX
```

## 🔧 **Instalacja i Uruchomienie**

### **Wymagania**

- Node.js 18+
- npm/yarn/pnpm

### **Setup**

```bash
# Klonowanie repozytorium
git clone https://github.com/m-zeprzalka/cryptonique.git
cd cryptonique

# Instalacja zależności
npm install

# Uruchomienie dev server
npm run dev

# Budowanie produkcyjne
npm run build
npm start
```

### **Environment Variables**

Aplikacja nie wymaga zmiennych środowiskowych - używa publicznego API Binance.

## 🔄 **API Endpoints**

### **GET /api/markets**

Główny endpoint zwracający dane crypto z predykcjami.

**Query Parameters:**

- `vs` - waluta bazowa (default: "usd")
- `h` - horyzont czasowy (default: "1h")
- `i` - interwał (default: "minutely")
- `n` - liczba elementów (default: 10)
- `debug` - tryb debug (boolean)

**Response:**

```typescript
{
  vs: string,
  horizon: string,
  interval: string,
  predictedSteps: number,
  items: [{
    id: string,
    symbol: string,
    name: string,
    price: number,
    change24h: number,
    series: [{
      t: number,      // timestamp
      price: number   // cena lub NaN dla predykcji
    }]
  }]
}
```

### **GET /api/health/providers**

Health check endpoint dla monitorowania dostępności API.

## 🎨 **Komponenty Główne**

### **CryptoCard**

Centralny komponent wyświetlający dane pojedynczej kryptowaluty.

**Features:**

- Real-time price display z formatowaniem
- 24h change badge z kolorami
- Interaktywny wykres Recharts
- Loading states i error handling
- Ikony z zewnętrznego API

**Props:**

```typescript
{
  data?: {
    symbol: string,
    name?: string,
    livePrice: number,
    points: PricePoint[],
    changePct: number
  },
  loading?: boolean,
  error?: string,
  compact?: boolean,
  highlightPrediction?: boolean
}
```

### **ClientHome**

Główna sekcja aplikacji z listą wszystkich kryptowalut.

**Features:**

- SWR data fetching z auto-refresh (10s)
- Search i filtering (funkcjonalność UI ready)
- Responsywna siatka kart
- Loading skeletons

### **BinanceService**

Główny serwis do komunikacji z Binance API.

**Methods:**

- `getMarkets(limit)` - pobiera dane ticker
- `getHistory(symbol, interval, limit)` - pobiera klines
- `isAvailable()` - sprawdza dostępność API

## 🤖 **Algorytm Predykcyjny**

### **Improved Predict Algorithm**

Funkcja `improvedPredict()` w `lib/predict.ts`:

**Input:** Tablica cen historycznych
**Output:** 6-punktowa predykcja cenowa

**Metody:**

1. **Simple Moving Average (SMA)** - trend długoterminowy
2. **Exponential Moving Average (EMA)** - trend krótkoterminowy
3. **Linear Regression** - prognoza kierunkowa
4. **Weighted Ensemble** - kombinacja powyższych

**Parametry:**

- Okno SMA: 10 punktów
- Smoothing EMA: 0.3
- Wagi: SMA(30%), EMA(40%), Regression(30%)

## 🚀 **Performance**

### **Optimalizacje**

- Next.js Image optimization
- Bundle splitting i tree shaking
- CSS-in-JS minification
- Gzip compression
- Turbo Mode w dev

### **Metrics** (Production Build)

- **First Load JS:** ~268kB
- **Main Bundle:** ~168kB
- **Build Time:** ~10s
- **API Response:** <500ms
- **Chart Render:** <100ms

## 📱 **Responsive Design**

### **Breakpoints**

```css
xs: 480px   # Małe telefony
sm: 640px   # Duże telefony
md: 768px   # Tablety
lg: 1024px  # Laptopy
xl: 1280px  # Desktopy
```

### **Grid System**

- Mobile: 1 kolumna
- Tablet: 2 kolumny
- Desktop: 3 kolumny

## 🔒 **Security & Reliability**

### **Error Handling**

- Comprehensive try-catch blocks
- Graceful API failure handling
- User-friendly error messages
- Fallback states dla wszystkich komponentów

### **Rate Limiting**

- SWR automatic request deduplication
- 10s refresh interval (nie przeciąża API)
- Binance API limity: 1200 requests/min

### **Data Validation**

- TypeScript strict mode
- Runtime type checking na krytycznych ścieżkach
- Sanityzacja danych API

## 🧪 **Development**

### **Available Scripts**

```bash
npm run dev      # Development server z Turbopack
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint check
```

### **Code Quality**

- TypeScript strict mode
- ESLint + Next.js rules
- Prettier formatting
- Git hooks (pre-commit)

### **Browser Support**

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 📈 **Future Roadmap**

### **Phase 1** (Current)

- ✅ Real-time data streaming
- ✅ Basic AI predictions
- ✅ Responsive UI
- ✅ Performance optimization

### **Phase 2** (Planned)

- 🔄 User accounts & preferences
- 🔄 Advanced charting tools
- 🔄 Portfolio tracking
- 🔄 Push notifications

### **Phase 3** (Future)

- 🔄 Advanced AI models
- 🔄 Multiple timeframes
- 🔄 Social features
- 🔄 Mobile app

## 📞 **Support & Contributing**

### **Issues**

Jeśli znajdziesz błąd lub masz sugestię, proszę utwórz issue na GitHub.

### **Contributing**

1. Fork repository
2. Utwórz feature branch
3. Commit changes z opisem
4. Otwórz Pull Request

### **License**

MIT License - szczegóły w pliku LICENSE

---

**Built with ❤️ by Michał Zeprzalka**  
_Cryptonique - making crypto predictions accessible to everyone_
