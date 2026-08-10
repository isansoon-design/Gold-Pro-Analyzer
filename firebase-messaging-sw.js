
// firebase-messaging-sw.js - MUST be in root of site (same folder as index.html)
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyCDk-mTPha6BwSxscy6blssD7DaMyJAoSY",
  authDomain: "xauusd-c41d0.firebaseapp.com",
  projectId: "xauusd-c41d0",
  storageBucket: "xauusd-c41d0.firebasestorage.app",
  messagingSenderId: "390056297494",
  appId: "1:390056297494:web:8e1494afa2c4be4cf86137",
  measurementId: "G-5LNE1P01E1"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload){
  console.log('[SW] Background message', payload);
  var data = payload.data || {};
  var notification = payload.notification || {};
  var title = notification.title || data.title || 'Gold Pro - Prime Pattern';
  var body = notification.body || data.body || 'Prime pattern detected · Educational only';
  var tag = data.tag || 'gp-fcm-pattern';
  self.registration.showNotification(title, {
    body: body,
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: tag,
    renotify: true,
    data: data
  });
});

self.addEventListener('notificationclick', function(event){
  event.notification.close();
  event.waitUntil(
    clients.matchAll({type:'window', includeUncontrolled:true}).then(function(clientList){
      for(var i=0;i<clientList.length;i++){
        var client = clientList[i];
        if(client.url && 'focus' in client) return client.focus();
      }
      if(clients.openWindow) return clients.openWindow('./');
    })
  );
});
