// Firebase Cloud Messaging Service Worker - V32.1 VAPID Enabled
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

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

// Background message handler - Works when phone is closed!
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Received background message ', payload);
  const notificationTitle = payload.notification?.title || '📊 Market Quick Report';
  const notificationOptions = {
    body: payload.notification?.body || 'New market movement detected - Educational analysis',
    icon: 'https://cdn-icons-png.flaticon.com/512/138/138292.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/138/138292.png',
    data: payload.data || {},
    vibrate: [200, 100, 200],
    requireInteraction: false
  };
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
