/**
 * Fetches Top 10 Crypto Data from CoinGecko with LocalStorage Caching
 * Minimizes API calls to avoid rate limits.
 */

const CACHE_KEY = 'crypto_top_10_cache';
const CACHE_TTL = 10 * 60 * 1000; // 10 Minutes in milliseconds

const MOCK_DATA = [
    { name: "Bitcoin", symbol: "btc", current_price: 65000, image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png" },
    { name: "Ethereum", symbol: "eth", current_price: 3500, image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png" },
    { name: "Tether", symbol: "usdt", current_price: 1.0, image: "https://assets.coingecko.com/coins/images/325/large/Tether.png" },
    { name: "BNB", symbol: "bnb", current_price: 600, image: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png" },
    { name: "Solana", symbol: "sol", current_price: 140, image: "https://assets.coingecko.com/coins/images/4128/large/solana.png" },
    { name: "USDC", symbol: "usdc", current_price: 1.0, image: "https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png" },
    { name: "XRP", symbol: "xrp", current_price: 0.6, image: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png" },
    { name: "Dogecoin", symbol: "doge", current_price: 0.15, image: "https://assets.coingecko.com/coins/images/5/large/dogecoin.png" },
    { name: "Toncoin", symbol: "ton", current_price: 7.0, image: "https://assets.coingecko.com/coins/images/17980/large/ton_symbol.png" },
    { name: "Cardano", symbol: "ada", current_price: 0.45, image: "https://assets.coingecko.com/coins/images/975/large/cardano.png" }
];

export async function fetchTop10Cryptos() {
    try {
        // 1. Check Cache
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const { timestamp, data } = JSON.parse(cached);
            const now = Date.now();

            // If valid and not expired, return cached
            if (now - timestamp < CACHE_TTL) {
                console.log(`[CryptoParams] Returning Cached Data (${Math.floor((CACHE_TTL - (now - timestamp)) / 1000)}s remaining)`);
                return data;
            }
        }

        // 2. Fetch Fresh Data
        console.log("[CryptoParams] Fetching fresh data from CoinGecko...");
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false');

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const rawData = await response.json();

        // 3. Process Data (Keep only what we need)
        const cleanData = rawData.map(coin => ({
            name: coin.name,
            symbol: coin.symbol,
            current_price: coin.current_price,
            image: coin.image
        }));

        // 4. Save to Cache
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            data: cleanData
        }));

        return cleanData;

    } catch (error) {
        console.warn("[CryptoParams] Fetch failed, using Mock Data:", error);
        return MOCK_DATA;
    }
}
