const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

(async () => {
  const snapshot = await db.collection('users').get();

  if (snapshot.empty) {
    console.log('No users found in Firestore yet. Nothing to back up.');
    process.exit(0);
  }

  const outDir = 'backups';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  let count = 0;
  snapshot.forEach((doc) => {
    const uid = doc.id;
    const raw = doc.data();
    if (!raw || !raw.data) return;

    let state;
    try {
      state = JSON.parse(raw.data);
    } catch (e) {
      console.error('Skipping ' + uid + ': stored data is not valid JSON.');
      return;
    }

    fs.writeFileSync(path.join(outDir, uid + '.json'), JSON.stringify(state, null, 2));
    count++;
  });

  console.log('Backed up ' + count + ' user(s) into the backups/ folder.');
})().catch((e) => {
  console.error('Backup failed:', e);
  process.exit(1);
});
