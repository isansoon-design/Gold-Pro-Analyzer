// goldpro-market-reader.js - FIXED - Second Candle After Cross ONLY
// Deploy on your server 162.55.218.11
// This is now the SINGLE source of truth for price + pattern check
// App and Server use EXACT same logic

const admin = require('firebase-admin');
const fetch = require('node-fetch');

// Initialize Firebase Admin (for FCM)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(), // or serviceAccount
    projectId: "xauusd-c41d0"
  });
}

function isBull(c) { return c && c.close > c.open; }
function isBear(c) { return c && c.close < c.open; }
function body(c) { return Math.abs(c.close - c.open); }

// --- MA50 calculation ---
function sma(closes, period) {
  let mas = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { mas.push(null); continue; }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += closes[j];
    mas.push(sum / period);
  }
  return mas;
}

// --- SECOND CANDLE LOGIC - EXACT SAME AS APP ---
function detectMA50SecondCandle(candles, ma50) {
  if (!candles || candles.length < 10 || !ma50) return null;
  const n = candles.length;
  const ma_n1 = ma50[n - 1];
  const ma_n2 = ma50[n - 2];
  const ma_n3 = ma50[n - 3];
  if (ma_n1 == null || ma_n2 == null || ma_n3 == null) return null;

  const c_n1 = candles[n - 1]; // second - signal here
  const c_n2 = candles[n - 2]; // first after cross
  const c_n3 = candles[n - 3]; // before cross

  // BULLISH: was below, now 2 greens above
  const wasBelow = c_n3.close < ma_n3;
  const firstGreenAbove = isBull(c_n2) && c_n2.close > ma_n2;
  const secondGreenAbove = isBull(c_n1) && c_n1.close > ma_n1;

  if (wasBelow && firstGreenAbove && secondGreenAbove) {
    return {
      bias: "bullish",
      title: "MA50 Structure",
      body: `Second green candle closed above 50 MA (1h & 4h). Price ${c_n1.close}. First green above, second green above = signal.`,
      price: c_n1.close,
      candles: [c_n2, c_n1]
    };
  }

  // BEARISH: was above, now 2 reds below
  const wasAbove = c_n3.close > ma_n3;
  const firstRedBelow = isBear(c_n2) && c_n2.close < ma_n2;
  const secondRedBelow = isBear(c_n1) && c_n1.close < ma_n1;

  if (wasAbove && firstRedBelow && secondRedBelow) {
    return {
      bias: "bearish",
      title: "MA50 Structure",
      body: `Second red candle closed below 50 MA (1h & 4h). Price ${c_n1.close}. First red below, second red below = signal.`,
      price: c_n1.close,
      candles: [c_n2, c_n1]
    };
  }
  return null;
}

// --- Fetch candles from Yahoo (single price source) ---
async function fetchCandles(symbol = "XAUUSD", tf = "1h") {
  // Map to Yahoo symbol
  const yMap = { "XAUUSD": "GC=F", "XAGUSD": "SI=F", "WTIUSD": "CL=F", "BTCUSD": "BTC-USD" };
  const ySym = yMap[symbol] || "GC=F";
  const interval = tf === "4h" ? "60m" : "60m";
  const range = tf === "4h" ? "20d" : "10d";
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ySym}?interval=${interval}&range=${range}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const json = await res.json();
    const result = json.chart.result[0];
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    let candles = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (quotes.close[i] == null) continue;
      candles.push({
        time: timestamps[i],
        open: quotes.open[i],
        high: quotes.high[i],
        low: quotes.low[i],
        close: quotes.close[i]
      });
    }
    return candles;
  } catch (e) {
    console.error("Fetch error", e.message);
    return [];
  }
}

// --- Main loop ---
async function checkAndNotify() {
  const symbols = ["XAUUSD", "XAGUSD", "WTIUSD", "BTCUSD"];
  const tfs = ["1h", "4h"];
  
  for (const sym of symbols) {
    for (const tf of tfs) {
      const candles = await fetchCandles(sym, tf);
      if (candles.length < 60) continue;
      const closes = candles.map(c => c.close);
      const ma50 = sma(closes, 50);
      const signal = detectMA50SecondCandle(candles, ma50);
      
      if (signal) {
        console.log(`[SIGNAL] ${sym} ${tf} ${signal.bias} at ${signal.price}`);
        // Send FCM to all tokens
        await sendFCMToAll(sym, tf, signal);
      }
    }
  }
}

async function sendFCMToAll(symbol, tf, signal) {
  try {
    // Get all FCM tokens from Firestore
    const db = admin.firestore();
    const tokensSnap = await db.collection("fcmTokens").get();
    const tokens = [];
    tokensSnap.forEach(doc => { if (doc.data().token) tokens.push(doc.data().token); });
    
    if (!tokens.length) {
      console.log("No FCM tokens");
      return;
    }

    const message = {
      notification: {
        title: `${signal.title} — ${symbol} ${tf.toUpperCase()}`,
        body: signal.body + "\n\nEducational only. Not financial advice."
      },
      data: {
        pattern: "1",
        type: "prime_pattern",
        symbol: symbol,
        tf: tf,
        bias: signal.bias,
        price: String(signal.price),
        title: `${signal.title} — ${symbol} ${tf.toUpperCase()}`,
        body: signal.body
      }
    };

    // Send to each token (batch)
    for (let i = 0; i < tokens.length; i += 500) {
      const batch = tokens.slice(i, i + 500);
      await admin.messaging().sendEachForMulticast({ tokens: batch, ...message }).catch(e => console.error(e));
    }
    console.log(`FCM sent to ${tokens.length} devices`);
  } catch (e) {
    console.error("FCM error", e.message);
  }
}

// Run every 2 minutes (check 1h and 4h closes)
setInterval(checkAndNotify, 2 * 60 * 1000);
checkAndNotify();

console.log("Gold Pro Market Reader FIXED - Second Candle Logic - Server + App unified");
