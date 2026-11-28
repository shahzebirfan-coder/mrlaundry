'use strict';

/*
 * Persistent Google Drive backup API for Mr Laundry POS.
 *
 * Browser code only receives Firebase Auth ID tokens and never sees the Google
 * OAuth client secret or Drive refresh token. Drive refresh tokens are encrypted
 * before being written to the server-only gdriveConnections collection.
 */
const crypto = require('node:crypto');
const admin = require('firebase-admin');
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret, defineString } = require('firebase-functions/params');

if (!admin.apps.length) admin.initializeApp();
const firestore = admin.firestore();

const GOOGLE_CLIENT_ID = defineString('GDRIVE_GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = defineSecret('GDRIVE_GOOGLE_CLIENT_SECRET');
const TOKEN_ENCRYPTION_KEY = defineSecret('GDRIVE_TOKEN_ENCRYPTION_KEY');
const ALLOWED_ORIGINS = defineString('GDRIVE_ALLOWED_ORIGINS');

const CONNECTIONS = 'gdriveConnections';
const BACKUP_FOLDER_NAME = 'Laundry POS POS Backups';
const MAX_BACKUP_BYTES = 8 * 1024 * 1024;

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function allowedOrigins() {
  return String(ALLOWED_ORIGINS.value() || '')
    .split(',')
    .map(value => value.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

function applyCors(req, res) {
  const origin = String(req.get('origin') || '').replace(/\/$/, '');
  const allowed = allowedOrigins();
  if (origin && allowed.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Requested-With');
    res.set('Access-Control-Max-Age', '3600');
  }
  return { origin, allowed: allowed.includes(origin) };
}

function getEncryptionKey() {
  const key = Buffer.from(String(TOKEN_ENCRYPTION_KEY.value() || '').trim(), 'base64');
  if (key.length !== 32) {
    throw new ApiError(500, 'BACKEND_CONFIG_ERROR', 'Drive token encryption key must be a 32-byte base64 secret.');
  }
  return key;
}

function encryptRefreshToken(token) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return {
    version: 1,
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: encrypted.toString('base64')
  };
}

function decryptRefreshToken(record) {
  if (!record || record.version !== 1 || !record.iv || !record.tag || !record.data) {
    throw new ApiError(500, 'TOKEN_STORE_ERROR', 'Saved Drive authorization is unreadable. Reconnect Google Drive once.');
  }
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(record.iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(record.tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(record.data, 'base64')),
    decipher.final()
  ]).toString('utf8');
}

async function requireFirebaseUser(req) {
  const header = String(req.get('authorization') || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new ApiError(401, 'AUTH_REQUIRED', 'Sign in with Google in the backup setup first.');
  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(match[1]);
  } catch (error) {
    throw new ApiError(401, 'AUTH_EXPIRED', 'Firebase sign-in expired. Reopen Google Drive settings and sign in again.');
  }
  if (decoded.firebase?.sign_in_provider !== 'google.com' || !decoded.email || decoded.email_verified !== true) {
    throw new ApiError(403, 'GOOGLE_SIGN_IN_REQUIRED', 'Use a verified Google account for the Firebase backup account.');
  }
  return decoded;
}

function connectionRef(uid) {
  return firestore.collection(CONNECTIONS).doc(uid);
}

async function postForm(url, fields) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields).toString()
  });
  let data = {};
  try { data = await response.json(); } catch (error) {}
  return { response, data };
}

async function exchangeCode(uid, email, origin, body) {
  if (String(body.clientId || '') !== String(GOOGLE_CLIENT_ID.value() || '')) {
    throw new ApiError(400, 'CLIENT_ID_MISMATCH', 'The Google Client ID in the app does not match the Firebase Functions secret/config.');
  }
  if (String(body.redirectUri || '').replace(/\/$/, '') !== origin) {
    throw new ApiError(400, 'REDIRECT_ORIGIN_MISMATCH', 'The OAuth return origin did not match this app origin.');
  }
  if (!body.code || typeof body.code !== 'string') {
    throw new ApiError(400, 'OAUTH_CODE_MISSING', 'Google did not return an authorization code. Try Connect again.');
  }

  const { response, data } = await postForm('https://oauth2.googleapis.com/token', {
    code: body.code,
    client_id: GOOGLE_CLIENT_ID.value(),
    client_secret: GOOGLE_CLIENT_SECRET.value(),
    redirect_uri: origin,
    grant_type: 'authorization_code'
  });
  if (!response.ok || !data.access_token) {
    console.error('[GDrive] OAuth code exchange failed:', data.error || response.status);
    throw new ApiError(400, 'OAUTH_EXCHANGE_FAILED', data.error_description || 'Google authorization could not be completed. Check the OAuth client and authorized origins.');
  }

  const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${data.access_token}` }
  });
  const profile = profileResponse.ok ? await profileResponse.json() : null;
  if (!profile || !profile.email || profile.email_verified !== true || String(profile.email).toLowerCase() !== String(email).toLowerCase()) {
    throw new ApiError(403, 'GOOGLE_ACCOUNT_MISMATCH', 'The verified Drive account must match the Google account used for Firebase sign-in.');
  }
  const grantedScopes = String(data.scope || '').split(/\s+/).filter(Boolean);
  if (!grantedScopes.includes('https://www.googleapis.com/auth/drive.file')) {
    throw new ApiError(403, 'DRIVE_SCOPE_MISSING', 'Approve the requested Drive file access to continue.');
  }

  const ref = connectionRef(uid);
  const existing = await ref.get();
  const old = existing.exists ? existing.data() : {};
  const sameGoogleAccount = !!(old.oauthClientId === GOOGLE_CLIENT_ID.value() && old.googleSub && profile.sub && old.googleSub === profile.sub &&
    String(old.googleEmail || '').toLowerCase() === String(profile.email).toLowerCase());
  let refreshToken = data.refresh_token || '';
  if (!refreshToken && sameGoogleAccount) {
    refreshToken = decryptRefreshToken(old.refreshTokenEnc);
  }
  if (!refreshToken) {
    throw new ApiError(400, 'REFRESH_TOKEN_MISSING', 'Google did not issue offline access. Revoke this app under Google Account permissions, then connect again and approve Drive access.');
  }

  await ref.set({
    refreshTokenEnc: encryptRefreshToken(refreshToken),
    firebaseEmail: email,
    oauthClientId: GOOGLE_CLIENT_ID.value(),
    googleEmail: profile.email,
    googleSub: profile.sub || '',
    folderId: sameGoogleAccount ? (old.folderId || '') : '',
    createdAt: old.createdAt || admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  return { connected: true, email: profile.email };
}

async function getDriveContext(uid) {
  const ref = connectionRef(uid);
  const snap = await ref.get();
  if (!snap.exists) throw new ApiError(404, 'DRIVE_NOT_CONNECTED', 'Google Drive has not been connected on this account.');
  const connection = snap.data();
  if (connection.oauthClientId !== GOOGLE_CLIENT_ID.value()) {
    throw new ApiError(401, 'DRIVE_REAUTH_REQUIRED', 'The Google OAuth client changed. Reconnect Google Drive once.');
  }
  let refreshToken;
  try {
    refreshToken = decryptRefreshToken(connection.refreshTokenEnc);
  } catch (error) {
    if (error instanceof ApiError && error.code === 'BACKEND_CONFIG_ERROR') throw error;
    console.error('[GDrive] Saved token could not be decrypted:', error.message);
    throw new ApiError(401, 'DRIVE_REAUTH_REQUIRED', 'The saved Drive grant cannot be opened. Reconnect Google Drive once.');
  }
  const { response, data } = await postForm('https://oauth2.googleapis.com/token', {
    client_id: GOOGLE_CLIENT_ID.value(),
    client_secret: GOOGLE_CLIENT_SECRET.value(),
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });
  if (!response.ok || !data.access_token) {
    if (data.error === 'invalid_grant' || data.error === 'unauthorized_client') {
      throw new ApiError(401, 'DRIVE_REAUTH_REQUIRED', 'Google revoked or expired the Drive permission. Reconnect Google Drive once.');
    }
    console.error('[GDrive] Refresh-token request failed:', data.error || response.status);
    throw new ApiError(502, 'DRIVE_TOKEN_REFRESH_FAILED', 'Google Drive access could not be renewed right now. Try again shortly.');
  }
  if (data.refresh_token) {
    await ref.set({ refreshTokenEnc: encryptRefreshToken(data.refresh_token), updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  }
  return { ref, connection, accessToken: data.access_token };
}

async function driveFetch(context, url, options = {}) {
  const headers = Object.assign({}, options.headers || {}, {
    Authorization: `Bearer ${context.accessToken}`
  });
  const response = await fetch(url, Object.assign({}, options, { headers }));
  if (response.status === 401) {
    throw new ApiError(401, 'DRIVE_REAUTH_REQUIRED', 'Google rejected Drive access. Reconnect Google Drive once.');
  }
  if (!response.ok) {
    const details = await response.text().catch(() => '');
    console.error('[GDrive] Drive API error:', response.status, details.slice(0, 500));
    throw new ApiError(502, 'DRIVE_API_ERROR', `Google Drive request failed (${response.status}).`);
  }
  return response;
}

async function ensureBackupFolder(context) {
  let folderId = context.connection.folderId || '';
  if (folderId) {
    const checkUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}?fields=id,mimeType,trashed`;
    const check = await fetch(checkUrl, { headers: { Authorization: `Bearer ${context.accessToken}` } });
    if (check.ok) {
      const file = await check.json();
      if (file.mimeType === 'application/vnd.google-apps.folder' && !file.trashed) return folderId;
    }
    folderId = '';
  }

  const query = encodeURIComponent(`name='${BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive&fields=files(id,name)&pageSize=100`;
  const search = await driveFetch(context, searchUrl);
  const searchData = await search.json();
  if (Array.isArray(searchData.files) && searchData.files.length) {
    folderId = searchData.files[0].id;
  } else {
    const create = await driveFetch(context, 'https://www.googleapis.com/drive/v3/files?fields=id,name', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: BACKUP_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' })
    });
    const folder = await create.json();
    folderId = folder.id;
  }
  await context.ref.set({ folderId, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  context.connection.folderId = folderId;
  return folderId;
}

async function uploadBackup(uid, body) {
  const content = typeof body.content === 'string' ? body.content : JSON.stringify(body.content);
  if (!content) throw new ApiError(400, 'BACKUP_EMPTY', 'Backup content is empty.');
  if (Buffer.byteLength(content, 'utf8') > MAX_BACKUP_BYTES) {
    throw new ApiError(413, 'BACKUP_TOO_LARGE', 'This backup is over 8 MB. Use the app’s local export or reduce included data.');
  }
  try { JSON.parse(content); } catch (error) { throw new ApiError(400, 'BACKUP_INVALID', 'Backup content is not valid JSON.'); }

  const context = await getDriveContext(uid);
  const folderId = await ensureBackupFolder(context);
  const filename = `mr-laundry-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const boundary = `----MrLaundryBackup${crypto.randomBytes(12).toString('hex')}`;
  const metadata = { name: filename, parents: [folderId], mimeType: 'application/json' };
  const multipart = [
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${content}\r\n`,
    `--${boundary}--`
  ].join('');
  const response = await driveFetch(context, 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,createdTime', {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body: multipart
  });
  return await response.json();
}

async function listBackups(uid) {
  const context = await getDriveContext(uid);
  const folderId = await ensureBackupFolder(context);
  const files = [];
  let pageToken = '';
  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed=false`,
      orderBy: 'createdTime desc',
      fields: 'nextPageToken,files(id,name,createdTime,size,mimeType)',
      pageSize: '1000'
    });
    if (pageToken) params.set('pageToken', pageToken);
    const response = await driveFetch(context, `https://www.googleapis.com/drive/v3/files?${params.toString()}`);
    const data = await response.json();
    if (Array.isArray(data.files)) files.push(...data.files);
    pageToken = data.nextPageToken || '';
    // Guard against unexpectedly huge/malicious folders and runaway requests.
    if (files.length >= 20000 && pageToken) {
      throw new ApiError(413, 'TOO_MANY_BACKUPS', 'This folder contains more than 20,000 files; clean up old items before continuing.');
    }
  } while (pageToken);
  // Retention is intentionally scoped to this application's JSON backup names;
  // do not delete arbitrary files a user might place in the folder.
  return files.filter(file => file && file.mimeType === 'application/json' &&
    typeof file.name === 'string' && file.name.startsWith('mr-laundry-backup-'));
}

async function downloadBackup(uid, fileId) {
  if (!fileId || typeof fileId !== 'string') throw new ApiError(400, 'FILE_ID_MISSING', 'Select a backup first.');
  const context = await getDriveContext(uid);
  const folderId = await ensureBackupFolder(context);
  const metadataUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,parents,mimeType,trashed`;
  const metadataResponse = await driveFetch(context, metadataUrl);
  const metadata = await metadataResponse.json();
  if (metadata.trashed || metadata.mimeType !== 'application/json' ||
      typeof metadata.name !== 'string' || !metadata.name.startsWith('mr-laundry-backup-') ||
      !Array.isArray(metadata.parents) || !metadata.parents.includes(folderId)) {
    throw new ApiError(404, 'BACKUP_NOT_FOUND', 'That backup is not in the Mr Laundry backups folder.');
  }
  const contentResponse = await driveFetch(context, `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`);
  const content = await contentResponse.text();
  if (Buffer.byteLength(content, 'utf8') > MAX_BACKUP_BYTES) throw new ApiError(413, 'BACKUP_TOO_LARGE', 'This backup is too large to restore through the web app.');
  return { content };
}

async function pruneOldBackups(uid, keepValue) {
  const keep = Math.max(5, Math.min(365, Math.floor(Number(keepValue) || 30)));
  const files = await listBackups(uid);
  const old = files.slice(keep);
  if (!old.length) return { removed: 0 };
  const context = await getDriveContext(uid);
  for (const file of old) {
    try {
      await driveFetch(context, `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}`, { method: 'DELETE' });
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) continue;
      throw error;
    }
  }
  return { removed: old.length };
}

async function handleAction(req, decoded) {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  switch (body.action) {
    case 'connect':
      if (String(req.get('x-requested-with') || '').toLowerCase() !== 'xmlhttprequest') {
        throw new ApiError(403, 'CSRF_CHECK_FAILED', 'Google authorization request was not verified. Please reconnect from the app.');
      }
      return await exchangeCode(decoded.uid, decoded.email, req.get('origin') || '', body);
    case 'status': {
      const snap = await connectionRef(decoded.uid).get();
      const data = snap.exists ? snap.data() : {};
      const connected = !!(snap.exists && data.oauthClientId === GOOGLE_CLIENT_ID.value());
      return { connected, email: connected ? (data.googleEmail || '') : '' };
    }
    case 'disconnect': {
      const ref = connectionRef(decoded.uid);
      const snap = await ref.get();
      if (snap.exists) {
        try {
          const refreshToken = decryptRefreshToken(snap.data().refreshTokenEnc);
          const revoke = await fetch('https://oauth2.googleapis.com/revoke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ token: refreshToken }).toString()
          });
          if (!revoke.ok) console.warn('[GDrive] Google token revocation returned:', revoke.status);
        } catch (error) {
          // Explicit disconnect must still delete the server copy if a token was
          // already invalid or the encryption key was rotated/lost.
          console.warn('[GDrive] Could not revoke Google token during disconnect:', error.message);
        }
      }
      await ref.delete();
      return { connected: false };
    }
    case 'upload':
      return await uploadBackup(decoded.uid, body);
    case 'list':
      return { files: await listBackups(decoded.uid) };
    case 'download':
      return await downloadBackup(decoded.uid, body.fileId);
    case 'prune':
      return await pruneOldBackups(decoded.uid, body.keep);
    default:
      throw new ApiError(400, 'UNKNOWN_ACTION', 'Unsupported Google Drive operation.');
  }
}

exports.gdriveApi = onRequest(
  { region: 'us-central1', secrets: [GOOGLE_CLIENT_SECRET, TOKEN_ENCRYPTION_KEY] },
  async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const cors = applyCors(req, res);
    if (req.method === 'OPTIONS') return cors.allowed ? res.status(204).send('') : res.status(403).send('Origin not allowed');
    if (!cors.allowed) return res.status(403).json({ code: 'ORIGIN_NOT_ALLOWED', error: 'This app origin is not allowed for Google Drive backup.' });
    if (req.method !== 'POST') return res.status(405).json({ code: 'METHOD_NOT_ALLOWED', error: 'Use POST.' });

    try {
      const decoded = await requireFirebaseUser(req);
      const result = await handleAction(req, decoded);
      return res.status(200).json(result);
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 500;
      const code = error instanceof ApiError ? error.code : 'INTERNAL_ERROR';
      if (status >= 500) console.error('[GDrive] Request failed:', error);
      return res.status(status).json({ code, error: error.message || 'Google Drive request failed.' });
    }
  }
);
