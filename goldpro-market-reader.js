// Gold Pro Analyzer - Market Reader Only (No Advice, No Buy/Sell)
// Pure market structure reading

class GoldProMarketReader {
  constructor(userEmail) {
    this.userEmail = userEmail;
  }

  // Unified - Market Reading Only
  onMarketEvent(asset, timeframe, message, subject) {
    this.sendPush(message);
    this.sendToast(message);
    this.sendEmail(this.userEmail, subject, message);
    console.log(`MARKET READING: ${subject} | ${message}`);
  }

  // Strategy 1: MA50 Market Structure Reading
  checkMA50Structure(candles, asset, tf) {
    const ma50 = this.calcSMA(candles.map(c=>c.close), 50);
    if(!ma50) return;
    const [c1, c2, c3] = candles.slice(-3);

    if(c1.close < ma50 && c2.close > ma50 && c2.isGreen && c3.close > ma50 && c3.isGreen) {
      const msg = `${asset} ${tf} price action above 50 MA with second candle close above`;
      this.onMarketEvent(asset, tf, msg, `${asset} ${tf} - Market Structure: Above MA50`);
    }
    if(c1.close > ma50 && c2.close < ma50 && !c2.isGreen && c3.close < ma50 && !c3.isGreen) {
      const msg = `${asset} ${tf} price action below 50 MA with second candle close below`;
      this.onMarketEvent(asset, tf, msg, `${asset} ${tf} - Market Structure: Below MA50`);
    }
  }

  // Strategy 2: Engulfing Pattern Reading
  checkEngulfingReading(candles, asset, tf, ma50) {
    const curr = candles[candles.length-1];
    const prev = candles[candles.length-2];
    const last5 = candles.slice(-6, -1);
    const maxLen = Math.max(...last5.map(c=>c.length));
    if(curr.length < prev.length * 4) return;
    if(curr.length <= maxLen) return;

    const isAbove = curr.close > ma50;

    if(isAbove && curr.isBearishEngulfing && curr.isBearishEngulfing(prev)) {
      const msg = `${asset} ${tf} bearish engulfing formation noted while above MA50`;
      this.onMarketEvent(asset, tf, msg, `${asset} ${tf} - Candle Pattern: Bearish Engulfing`);
    }
    if(!isAbove && curr.isBullishEngulfing && curr.isBullishEngulfing(prev)) {
      const msg = `${asset} ${tf} bullish engulfing formation noted while below MA50`;
      this.onMarketEvent(asset, tf, msg, `${asset} ${tf} - Candle Pattern: Bullish Engulfing`);
    }
  }

  // Strategy 3: Historical Concentration Zone Reading
  checkConcentrationZone(candles, asset, tf) {
    const closes = candles.slice(-100).map(c=>c.close);
    const clusters = this.clusterPrices(closes, 0.02);
    if(clusters.length === 0) return;
    const best = clusters.sort((a,b)=>b.count-a.count)[0];
    if(best.count < 3) return;

    const price = closes[closes.length-1];
    const isNear = Math.abs(price - best.level) / best.level <= 0.02;
    if(!isNear) return;

    const msg = `${asset} ${tf} price near frequently observed level from last 100 candles (count: ${best.count})`;
    const subject = `${asset} ${tf} - Level: Historical Concentration Zone (${best.level.toFixed(2)})`;
    this.onMarketEvent(asset, tf, msg, subject);
  }

  // Helpers
  sendPush(msg) {
    if(window.Notification && Notification.permission==="granted") {
      new Notification("Gold Pro - Market Reading", {body: msg, icon: "AppIcon-1024.png"});
    }
    fetch('/api/fcm/send-pattern', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({message: msg})}).catch(()=>{});
  }
  sendToast(msg) { if(window.showToast) window.showToast(msg); }
  sendEmail(to, subject, body) {
    fetch('/api/send-email', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({to, subject, body})}).catch(()=>{});
  }
  calcSMA(arr, p) { if(arr.length<p) return null; return arr.slice(-p).reduce((a,b)=>a+b,0)/p; }
  clusterPrices(prices, tol) {
    let clusters = [];
    prices.forEach(price => {
      let found = clusters.find(c => Math.abs(c.level - price)/c.level <= tol);
      if(found) { found.count++; found.level = (found.level*(found.count-1)+price)/found.count; }
      else { clusters.push({level: price, count: 1}); }
    });
    return clusters;
  }
}
