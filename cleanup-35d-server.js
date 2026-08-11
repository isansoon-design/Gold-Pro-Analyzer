
// server/cleanup-35d.js - Deploy on your server (Node.js) or as Firebase Cloud Function
// This deletes user data after 35 days of inactivity from server + Firestore
// Run daily via cron: 0 2 * * * node cleanup-35d.js

const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

async function cleanup35Days() {
  const THIRTY_FIVE_DAYS = 35 * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - THIRTY_FIVE_DAYS;
  console.log('Cleaning data older than', new Date(cutoff));

  // 1) Clean Firestore: userMeta where lastActive < cutoff
  try {
    const snap = await db.collection('userMeta').where('lastActive', '<', cutoff).get();
    for (const doc of snap.docs) {
      const uid = doc.id;
      console.log('Deleting user', uid);
      // delete chats
      await db.collection('supportChats').doc(uid).delete().catch(()=>{});
      const msgs = await db.collection('supportChats').doc(uid).collection('messages').get().catch(()=>null);
      if (msgs) { for (const m of msgs.docs) await m.ref.delete().catch(()=>{}); }
      await db.collection('fcmTokens').doc(uid).delete().catch(()=>{});
      await doc.ref.delete().catch(()=>{});
    }
  } catch(e){ console.error('Firestore cleanup error', e); }

  // 2) Clean your own server DB (example: MySQL / Mongo) - add your logic here
  // await yourDb.query('DELETE FROM users WHERE last_login < ?', [cutoff]);

  console.log('35d cleanup done');
}

cleanup35Days();
