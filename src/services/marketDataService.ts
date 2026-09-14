import { eq } from 'drizzle-orm';
import { assets } from '../db/schema';

// ==========================================
// 1. MOTOR CRIPTO (CoinGecko)
// ==========================================
const cryptoDictionary: Record<string, string> = {
  'BTC': 'bitcoin',
  'BITCOIN': 'bitcoin',
  'ETH': 'ethereum',
  'ETHEREUM': 'ethereum',
  'UNI': 'uniswap',
  'UNISWAP': 'uniswap',
  'USDT': 'tether',
  'USDC': 'usd-coin',
  'SOL': 'solana',
  'LTC': 'litecoin',
  'LITCOIN': 'litecoin',
  'DOGE': 'dogecoin',
  'XRP': 'ripple',
  'ADA': 'cardano'
};

export const fetchCryptoPriceMXN = async (ticker: string): Promise<number | null> => {
  if (!ticker) return null;
  const cleanTicker = ticker.trim().toUpperCase();
  const coinId = cryptoDictionary[cleanTicker] || cleanTicker.toLowerCase();

  try {
    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=mxn`);
    if (!response.ok) throw new Error("Error API Cripto");
    
    const data = await response.json();
    if (data[coinId] && data[coinId].mxn) return data[coinId].mxn;
    return null;
  } catch (error) {
    console.error("Error obteniendo precio Cripto:", error);
    return null;
  }
};

// ==========================================
// 2. MOTOR BURSÁTIL (Yahoo Finance via Proxy)
// ==========================================
// Diccionario para traducir de la nomenclatura de GBM a Tickers de Yahoo Finance
const gbmDictionary: Record<string, string> = {
  'WALMEX *': 'WALMEX.MX',
  'KOF UBL': 'KOFUBL.MX',
  'FIBRAMQ 12': 'FIBRAMQ12.MX',
  'IVVPESO ISHRS': 'IVVPESO.MX',
  'GFNORTE O': 'GFNORTEO.MX',
  'BBAJIO O': 'BBAJIOO.MX',
  'AGUA *': 'AGUA.MX',
  'ALFA A': 'ALFAA.MX',
  'ASUR B': 'ASURB.MX',
  'BIMBO A': 'BIMBOA.MX',
  'CEMEX CPO': 'CEMEXCPO.MX',
  'FUNO 11': 'FUNO11.MX',
  'GMEXICO B': 'GMEXICOB.MX'
};

export const fetchStockPriceMXN = async (ticker: string): Promise<number | null> => {
  if (!ticker) return null;
  const cleanTicker = ticker.trim().toUpperCase();
  const yahooSymbol = gbmDictionary[cleanTicker] || `${cleanTicker.replace(/\s+/g, '')}.MX`;
  const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d`;

  // Pool de Proxies de Alta Disponibilidad
  const proxies = [
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
  ];

  for (const proxyUrl of proxies) {
    try {
      const response = await fetch(proxyUrl, {
        // Le decimos al navegador que no use caché guardado para evitar errores fantasmas
        cache: 'no-store' 
      });
      
      if (!response.ok) continue; 
      
      const data = await response.json();
      
      // Yahoo Finance anida el precio actual en esta ruta
      if (data.chart && data.chart.result && data.chart.result.length > 0) {
        return data.chart.result[0].meta.regularMarketPrice;
      }
    } catch (error) {
      console.warn(`[Oráculo] Proxy falló, saltando al siguiente...`);
    }
  }
  
  console.error(`[Oráculo] La BMV está inaccesible en este momento para ${yahooSymbol}.`);
  return null; 
};

// ==========================================
// 3. ACTUALIZADOR MASIVO DEL PORTAFOLIO
// ==========================================
export const syncPortfolioPrices = async (db: any) => {
  const allAssets = await db.select().from(assets);

  for (const asset of allAssets) {
    let newPrice = null;
    const category = (asset.category || 'GBM').toUpperCase();

    // Enrutamos al oráculo correspondiente
    if (category === 'CRIPTO') {
      newPrice = await fetchCryptoPriceMXN(asset.id);
    } else if (category === 'GBM') {
      newPrice = await fetchStockPriceMXN(asset.id);
    }

    // ACTUALIZACIÓN SEGURA: Solo guardamos si el oráculo regresó un precio real.
    // Si regresa null (por bloqueo de proxy), conservamos el precio anterior intacto.
    if (newPrice !== null && newPrice > 0) {
      await db.update(assets)
        .set({ currentPrice: newPrice })
        .where(eq(assets.id, asset.id));
    }
  }
};