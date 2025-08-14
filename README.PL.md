# Cryptonique — Dokumentacja (PL)

Minimalistyczny, mobilny pulpit do podglądu kursów kryptowalut z prostą predykcją na najbliższe minuty/godziny. Zbudowany w Next.js (App Router) + Tailwind CSS v4 + shadcn/ui, z wykresami w Recharts.

## Spis treści

- Opis projektu i cele
- Stos technologiczny
- Architektura i przepływ danych
- Uruchomienie (dev/produkcyjnie) i wymagania
- Struktura plików (opis wszystkich ważnych plików)
- Kontrakty danych (API i komponenty)
- Jakość i znane ograniczenia
- Plan rozwoju (roadmap)
- FAQ i rozwiązywanie problemów

---

## Opis projektu i cele

- Cel: szybki podgląd trendu i prostych predykcji dla topowych kryptowalut.
- UX: minimalizm, wireframe’owy styl, mobile-first, szybka nawigacja i filtracja.
- Dane: darmowi dostawcy (CoinCap + fallback CoinPaprika), bez kluczy API.

## Stos technologiczny

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS v4 (z postcss) + shadcn/ui (komponenty Radix)
- Recharts (wykresy liniowe)
- SWR (klientowe pobieranie i cache)
- next-themes (tryb jasny/ciemny, SSR-safe)

## Architektura i przepływ danych

1. UI (klient):

   - Sekcja `ClientHome` pobiera `/api/markets?vs=usd&h=1h&i=minutely&n=10` przez SWR.
   - Użytkownik filtruje po symbolu, sortuje (zmiana 24h / predykcja), ustawia horyzont (1h/3h/6h) oraz interwał (minutely/hourly).
   - Siatka kart (`CryptoCard`) renderuje wykres: linia ceny + linia predykcji (ostatnie punkty).

2. API (serwer): `/app/api/markets/route.ts`

   - Próbuje `CoinCap` (rynki), w razie problemów — fallback do `CoinPaprika` (rynki).
   - Historię punktów pobiera z CoinCap; gdy to zawiedzie, buduje syntetyczną serię wokół aktualnej ceny.
   - Na podstawie ostatniego przyrostu wylicza krótką predykcję (`predictNext`).
   - Cache po stronie Next: `revalidate = 300` (5 min) dla stabilności i limitów.

3. Motywy i styl:
   - `next-themes` + zmienne CSS (`--chart-1..5`, `--background`, itp.).
   - W dark mode komponenty (w tym tooltip/hover kropki wykresu) mają poprawiony kontrast.

Schemat (uproszczony):
Klient (SWR) → /api/markets (Next API) → CoinCap (rynki + historia) || CoinPaprika (rynki, fallback) → Transformacja → JSON → Recharts/UI

## Uruchomienie i wymagania

- Node.js 18+ zalecany, Windows/macOS/Linux.
- Instalacja zależności: `npm install`
- Dev: `npm run dev` i otwórz http://localhost:3000
- Build: zatrzymaj serwer deweloperski, następnie `npm run build`
- Start prod: `npm start`

Uwaga (Windows): Błąd EPERM przy buildzie zwykle oznacza, że serwer dev nadal blokuje `.next` — zatrzymaj `npm run dev` przed `npm run build`.

## Struktura plików i opis

Poniżej opis istniejących plików/katalogów.

Root:

- `package.json` — skrypty, zależności.
- `package-lock.json` — lockfile npm.
- `next.config.ts` — konfiguracja Next.
- `tsconfig.json` — TypeScript.
- `eslint.config.mjs` — ESLint.
- `postcss.config.mjs` — PostCSS/Tailwind v4.
- `components.json` — konfiguracja shadcn/ui.
- `.gitignore` — ignorowane pliki.
- `README.md` — domyślny README szablonu Next.
- `README.PL.md` — ten dokument.

Public:

- `public/*.svg` — statyczne grafiki (ikony).

App (Next App Router):

- `src/app/layout.tsx` — layout root, fonty Geist, ThemeProvider, metadata.
- `src/app/globals.css` — zmienne kolorów (w tym `--chart-*`), style bazowe.
- `src/app/page.tsx` — skład strony głównej: `SiteHeader`, `Hero`, `ClientHome`.
- `src/app/favicon.ico` — favicon.
- `src/app/sections/client-home.tsx` — komponent kliencki (SWR, filtry, siatka kart, skeletony/empty/error).
- `src/app/api/markets/route.ts` — API serwerowe (agregacja rynków, historia, predykcje, fallback, revalidate).

Komponenty UI (shadcn/ui):

- `src/components/ui/button.tsx`, `input.tsx`, `select.tsx`, `badge.tsx`, `card.tsx`, `skeleton.tsx`, `separator.tsx`, `sheet.tsx`, `navigation-menu.tsx`, `avatar.tsx`, `label.tsx`, `switch.tsx`, `toggle.tsx` — małe, dostępne komponenty UI z wariantami i klasami Tailwind.

Komponenty strony:

- `src/components/site/header.tsx` — nagłówek z menu, wyszukiwaniem, sortowaniem i przełącznikiem motywu.
- `src/components/site/hero.tsx` — sekcja hero ze skrótowymi statystykami.
- `src/components/site/theme-toggle.tsx` — przełącznik jasny/ciemny; SSR-safe (renderuje po zamontowaniu).

Komponenty domenowe:

- `src/components/crypto/crypto-card.tsx` — karta kryptowaluty: symbol, cena, chip zmiany (outline), wykres (Recharts: linie, delikatny grid i area fill), tooltip i active dot z poprawnym kontrastem.

Biblioteki/dane:

- `src/lib/coincap.ts` — provider CoinCap: rynki, historia, oraz `predictNext` (prosty drift).
- `src/lib/coinpaprika.ts` — fallback provider (rynki).
- `src/lib/coingecko.ts` — pierwotny provider (obecnie nieaktywny, zachowany jako referencja).
- `src/lib/mock.ts` — generator syntetycznych danych testowych.
- `src/lib/utils.ts` — narzędzia (np. `cn` do klas).

## Kontrakty danych

API `/api/markets` (GET):

- Query params:
  - `vs`: waluta bazowa (string, zachowana dla zgodności; CoinCap zwraca USD) — domyślnie `usd`.
  - `h`: horyzont danych do wykresu (`1h` | `3h` | `6h`) — domyślnie `1h`.
  - `i`: interwał historii (`minutely` → `m1` | `hourly` → `h1`) — domyślnie `minutely`.
  - `n`: liczba pozycji (liczba, domyślnie 10).
- Odpowiedź:
  ```json
  {
    "vs": "usd",
    "horizon": "1h",
    "interval": "minutely",
    "items": [
      {
        "id": "bitcoin",
        "symbol": "BTC",
        "price": 43000.12,
        "change24h": 1.7,
        "series": [{ "t": 1723375200000, "price": 43000.12 }, ...]
      }
    ]
  }
  ```
- Zachowanie:
  - Rynki: CoinCap; fallback: CoinPaprika (gdy CoinCap niedostępny).
  - Historia: CoinCap; w razie błędu seria syntetyczna (ostatnia ~1h, krok 5 min).
  - Predykcja: na końcu serii dokładanych jest kilka punktów na podstawie ostatniego przyrostu.
  - Cache: `revalidate = 300` (po stronie serwera Next).

Frontend `CryptoCard` (wejście):

- `{ symbol: string, points: { t: number, price: number, predicted?: number }[], changePct: number }`
- Ostatnie punkty z `predicted` rysowane jako linia przerywana, realne punkty jako pełna linia.

## Jakość i ograniczenia (stan MVP)

- Brak testów automatycznych (unit/e2e).
- Prosty model predykcyjny (drift na ostatniej różnicy) — do wymiany.
- Brak wyboru waluty (CoinCap = USD), brak liczby pozycji w UI (parametr istnieje).
- Ochrona przed limitami: mała pula równoległości; czasem fallback na serię syntetyczną.
- Hydration i theming: zabezpieczone (ThemeToggle montuje się po stronie klienta; `suppressHydrationWarning`).

## Plan rozwoju

1. Dane i wydajność

   - Wybór waluty (USD/EUR/PLN) i prosta konwersja FX.
   - Regulacja liczby pozycji (n) w UI + paginacja/virtualizacja.
   - Retry/backoff dla providerów; metryki, logowanie błędów.
   - Lepsze cache’owanie po stronie serwera (ISR na poziomie dostawców, deduplikacja).

2. Predykcje

   - Modele statystyczne (EMA/SMA), regresja, warianty ML (ostrożnie, bezpieczne koszty).
   - Przedziały ufności i sygnały (buy/sell) z progiem.

3. UI/UX

   - Widoki szczegółowe (modal/sheet) z większym wykresem i zakresem czasu.
   - Watchlisty, „ulubione”, grupowanie według sektora.
   - Ulepszenia dostępności (ARIA, focus trap, kontrast) i nawigacji klawiaturą.
   - Animacje mikro-interakcji i delikatne efekty hover.

4. Testy i jakość

   - Unit (Vitest/Jest) dla logiki i mapperów.
   - E2E (Playwright) dla głównych ścieżek.
   - Lint/format i CI (lint + typecheck + testy).

5. Produkcja i DevOps
   - Deployment (Vercel lub inny), zmienne środowiskowe, monitorowanie.
   - Rate-limit/timeouty na API (ochrona serwera), obsługa błędów.

## FAQ / Troubleshooting

- „Nie widzę linii na wykresie” → Upewnij się, że kolory używają zmiennych CSS (`stroke="var(--chart-*)"`), a nie `hsl(var(...))`. Sprawdź kontrast w dark mode.
- „Hydration failed” → Przełącznik motywu renderowany po zamontowaniu klienta; tag `<html>` ma `suppressHydrationWarning`.
- CoinCap 404 / limity → Odczekaj, zadziała fallback lub seria syntetyczna; odśwież po chwili. Pula równoległości jest ograniczona do 4.
- EPERM na Windows przy `next build` → Zamknij proces dev, potem buduj.

---

Autor: Zespół Cryptonique
Licencja: MIT (jeżeli nie ustalono inaczej)
