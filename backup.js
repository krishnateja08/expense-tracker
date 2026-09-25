/* Pulls the Ledger data out of Firestore and writes ONE combined JSON
   snapshot to backups/backup.json. Matches the per-transaction schema:
     users/{uid}                     -> categories, accounts, currency, rates
     users/{uid}/transactions/{txId} -> one doc per transaction
   Run via `node backup.js` with FIREBASE_SERVICE_ACCOUNT_KEY set in the env
   (see the accompanying GitHub Actions workflow). */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

(async () => {
  const usersSnap = await db.collection('users').get();

  if (usersSnap.empty) {
    console.log('No users found in Firestore yet. Nothing to back up.');
    process.exit(0);
  }

  const outDir = 'backups';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  const backup = { generatedAt: new Date().toISOString(), users: {} };

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const meta = userDoc.data() || {};

    const txSnap = await db.collection('users').doc(uid).collection('transactions').get();
    const transactions = [];
    txSnap.forEach((d) => {
      const t = d.data();
      t.id = isNaN(Number(d.id)) ? d.id : Number(d.id); // keep numeric ids numeric, matches the app
      transactions.push(t);
    });

    backup.users[uid] = {
      categories: meta.categories || [],
      accounts: meta.accounts || ['Cash'],
      currency: meta.currency || 'USD',
      rates: meta.rates || {},
      transactions
    };
  }

  fs.writeFileSync(path.join(outDir, 'backup.json'), JSON.stringify(backup, null, 2));
  console.log('Backed up ' + Object.keys(backup.users).length + ' user(s) into backups/backup.json.');
})().catch((e) => {
  console.error('Backup failed:', e);
  process.exit(1);
});
