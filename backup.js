const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

(async () => {
  const uid = process.env.FIREBASE_UID;
  if (!uid) {
    console.error('FIREBASE_UID secret is not set.');
    process.exit(1);
  }

  const snap = await db.collection('users').doc(uid).get();
  if (!snap.exists) {
    console.log('No cloud data found yet for this user. Nothing to back up.');
    process.exit(0);
  }

  const doc = snap.data();
  const state = JSON.parse(doc.data);

  fs.writeFileSync('data-backup.json', JSON.stringify(state, null, 2));
  console.log('Backup written: data-backup.json (' + (state.transactions || []).length + ' transactions)');
})().catch((e) => {
  console.error('Backup failed:', e);
  process.exit(1);
});
