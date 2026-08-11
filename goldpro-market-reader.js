// Market Reader Only
class GoldProMarketReader {
  onMarketEvent(a,t,m,s){this.sendPush(m);this.sendToast(m);this.sendEmail(s,m)}
  sendPush(m){fetch('/api/fcm/send-pattern',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})}).catch(()=>{});}
  sendToast(m){if(window.showToast)showToast(m)}
  sendEmail(s,b){fetch('/api/send-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subject:s,body:b})}).catch(()=>{});}
}