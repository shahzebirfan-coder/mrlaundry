'use strict';

// One-time local bootstrap for Firebase Auth-managed administrator accounts.
// This script reads usernames/roles from a private JSON backup but never reads,
// prints, or copies its password fields. It prompts for fresh passwords without
// echoing them. Do not commit the backup, service-account key, or terminal logs.

const fs = require('node:fs');
const path = require('node:path');
const admin = require('firebase-admin');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'mr-laundry-pos-a6740';
const AUTH_DOMAIN = `${PROJECT_ID}.firebaseapp.com`;
const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{1,31}$/;

function emailFor(username) {
  return `${username}@${AUTH_DOMAIN}`;
}

function askHidden(label) {
  return new Promise((resolve, reject) => {
    const input = process.stdin;
    if (!input.isTTY || typeof input.setRawMode !== 'function') {
      reject(new Error('Run this script from a private interactive terminal so passwords are not echoed.'));
      return;
    }
    process.stdout.write(label);
    input.setRawMode(true);
    input.resume();
    let value = '';
    const onData = chunk => {
      const text = chunk.toString('utf8');
      for (const ch of text) {
        if (ch === '\u0003') {
          input.setRawMode(false);
          input.removeListener('data', onData);
          process.stdout.write('\n');
          reject(new Error('Cancelled.'));
          return;
        }
        if (ch === '\r' || ch === '\n') {
          input.setRawMode(false);
          input.removeListener('data', onData);
          process.stdout.write('\n');
          resolve(value);
          return;
        }
        if (ch === '\u0008' || ch === '\u007f') value = value.slice(0, -1);
        else if (ch >= ' ' && ch <= '~') value += ch;
      }
    };
    input.on('data', onData);
  });
}

async function passwordFor(username) {
  for (;;) {
    const first = await askHidden(`Set a NEW password for ${username} (min 12 chars; input hidden): `);
    const second = await askHidden('Confirm the new password (input hidden): ');
    if (first.length < 12 || first.length > 128) {
      console.log('Use 12–128 characters.');
      continue;
    }
    if (first !== second) {
      console.log('The passwords did not match. Try again.');
      continue;
    }
    return first;
  }
}

function collectAccounts(data) {
  const users = Array.isArray(data && data.users) ? data.users : [];
  const byUsername = new Map();
  for (const user of users) {
    const username = String(user && user.username || '').trim().toLowerCase();
    if (!USERNAME_RE.test(username)) continue;
    if (byUsername.has(username)) {
      throw new Error(`The backup contains duplicate username "${username}". Resolve it manually before provisioning.`);
    }
    if (user.role !== 'admin' && username !== 'itdesk' && username !== 'shahzeb') continue;
    if ((username === 'itdesk' || username === 'shahzeb') && user.role !== 'admin') {
      throw new Error(`The backup has a non-admin row for "${username}". Resolve this account conflict manually; provisioning was stopped.`);
    }
    byUsername.set(username, {
      username,
      name: String(user.name || username).trim().slice(0, 80) || username,
      localId: String(user.id || '').trim(),
      itDesk: username === 'itdesk'
    });
  }
  // Ensure the requested identities can be provisioned if they are genuinely
  // absent. Conflicting or duplicate backup rows must be resolved by an owner.
  if (!byUsername.has('shahzeb')) byUsername.set('shahzeb', { username: 'shahzeb', name: 'Shahzeb (Owner)', localId: 'auth_owner_shahzeb', itDesk: false });
  if (!byUsername.has('itdesk')) byUsername.set('itdesk', { username: 'itdesk', name: 'IT Desk', localId: 'auth_itdesk', itDesk: true });
  return [...byUsername.values()].sort((a, b) => a.username.localeCompare(b.username));
}

async function provisionAccount(account, password) {
  const email = emailFor(account.username);
  let userRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(email);
    if (userRecord.disabled) throw new Error(`Firebase account ${account.username} is disabled. Resolve that status manually; provisioning will not re-enable it.`);
    userRecord = await admin.auth().updateUser(userRecord.uid, {
      password,
      displayName: account.name
    });
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: account.name,
      disabled: false
    });
  }

  const previousClaims = userRecord.customClaims || {};
  await admin.auth().setCustomUserClaims(userRecord.uid, {
    ...previousClaims,
    role: 'admin',
    username: account.username,
    name: account.name,
    localId: account.localId || `auth_${account.username}`,
    itDesk: account.itDesk
  });
  await admin.auth().revokeRefreshTokens(userRecord.uid);

  const profileRef = admin.firestore().collection('authAccounts').doc(userRecord.uid);
  const profileSnapshot = await profileRef.get();
  const defaults = profileSnapshot.exists ? {} : { totpEnabled: false, recoveryCodeHashes: [], mustChangePassword: false };
  await profileRef.set({
    ...defaults,
    username: account.username,
    name: account.name,
    localId: account.localId || `auth_${account.username}`,
    role: 'admin',
    active: true,
    itDesk: account.itDesk,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  await admin.firestore().collection('authUsernameIndex').doc(account.username).set({
    uid: userRecord.uid,
    role: 'admin',
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  console.log(`Provisioned ${account.username} (${account.itDesk ? 'IT Desk administrator' : 'administrator'}). Password was not printed.`);
}

async function main() {
  const backupPath = process.argv[2];
  if (!backupPath) {
    console.error('Usage: node scripts/provision-admin-accounts.js /private/path/to/fresh-backup.json');
    process.exitCode = 2;
    return;
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error('Set GOOGLE_APPLICATION_CREDENTIALS to a Firebase Admin service-account key kept outside this repository. Never upload the key.');
  }
  const absolutePath = path.resolve(backupPath);
  const data = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  const accounts = collectAccounts(data);
  if (!accounts.length) throw new Error('No eligible admin accounts were found.');

  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Eligible administrator accounts: ${accounts.map(x => x.username).join(', ')}`);
  console.log('Passwords from the backup will be ignored. Enter fresh passwords locally; they will not be displayed or written to a file.');
  const confirmation = await askHidden('Type YES (not echoed) to continue provisioning these accounts: ');
  if (confirmation !== 'YES') throw new Error('Cancelled; no accounts were provisioned.');

  if (!admin.apps.length) {
    admin.initializeApp({ projectId: PROJECT_ID, credential: admin.credential.applicationDefault() });
  }
  for (const account of accounts) {
    const password = await passwordFor(account.username);
    await provisionAccount(account, password);
  }
  console.log('Done. The JSON backup was only read; it was not changed. Next deploy the frontend only after verifying Functions are deployed and the provisioned accounts work.');
}

main().catch(error => {
  console.error(`Provisioning stopped: ${error && error.message ? error.message : 'unknown error'}`);
  process.exitCode = 1;
});
