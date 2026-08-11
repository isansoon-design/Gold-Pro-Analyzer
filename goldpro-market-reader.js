// Gold Pro - Market Reader Only - No Advice
class GoldProMarketReader {
  constructor(email){this.email=email;}
  onMarketEvent(asset,tf,msg,subject){
    console.log("READING:",subject,msg);
    if(window.showToast) window.showToast(msg);
    try{
      if(window.Notification && Notification.permission==="granted"){
        new Notification(subject,{body:msg});
      }
    }catch(e){}
    fetch('/api/fcm/send-pattern',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,subject:subject})}).catch(()=>{});
    fetch('/api/send-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:this.email,subject:subject,body:msg})}).catch(()=>{});
  }
  checkMA50(c,asset,tf,ma50){
    if(!ma50||c.length<3) return;
    let c1=c[c.length-3], c2=c[c.length-2], c3=c[c.length-1];
    if(c1.close < ma50 && c2.close > ma50 && c3.close > ma50){
      this.onMarketEvent(asset,tf,`${asset} ${tf} price action above 50 MA with second candle close above`,`${asset} ${tf} - Market Structure: Above MA50`);
    }
    if(c1.close > ma50 && c2.close < ma50 && c3.close < ma50){
      this.onMarketEvent(asset,tf,`${asset} ${tf} price action below 50 MA with second candle close below`,`${asset} ${tf} - Market Structure: Below MA50`);
    }
  }
  checkEngulfing(curr,prev,asset,tf,ma50){
    if(!curr||!prev) return;
    let isAbove = curr.close > ma50;
    if(isAbove && curr.close < prev.open && curr.open > prev.close){
      this.onMarketEvent(asset,tf,`${asset} ${tf} bearish engulfing formation noted while above MA50`,`${asset} ${tf} - Pattern: Bearish Engulfing`);
    }
    if(!isAbove && curr.close > prev.open && curr.open < prev.close){
      this.onMarketEvent(asset,tf,`${asset} ${tf} bullish engulfing formation noted while below MA50`,`${asset} ${tf} - Pattern: Bullish Engulfing`);
    }
  }
  checkZone(price,level,count,asset,tf){
    if(Math.abs(price-level)/level <= 0.02 && count>=3){
      this.onMarketEvent(asset,tf,`${asset} ${tf} price near frequently observed level from last 100 candles (count: ${count})`,`${asset} ${tf} - Level: Historical Concentration Zone (${level.toFixed(2)})`);
    }
  }
}
window.marketReader = new GoldProMarketReader("user@example.com");