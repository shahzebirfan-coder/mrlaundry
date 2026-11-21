'use strict';

const crypto = require('node:crypto');
const admin = require('firebase-admin');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { setGlobalOptions } = require('firebase-functions/v2');
const {
  generateSecret,
  verifyTotp,
  makeOtpAuthUrl,
  createRecoveryCodes,
  hashRecoveryCode,
  safeEqualHex
} = require('./lib/totp');

if (!admin.apps.length) admin.initializeApp();
setGlobalOptions({ region: 'asia-south1', maxInstances: 5 });

const db = admin.firestore();
const auth = admin.auth();
const AUTH_RECOVERY_KEY = defineSecret('AUTH_RECOVERY_KEY');
const ACCOUNTS = db.collection('authAccounts');
const USERNAME_INDEX = db.collection('authUsernameIndex');
const RATE_LIMITS = db.collection('authRecoveryRateLimits');
const AUDIT = db.collection('authRecoveryAudit');
const TOTP_WINDOW = 1; // allow current 30-second period plus +/- one period
const TEMP_PASSWORD_TTL_MS = 15 * 60 * 1000;
const RECOVERY_WINDOW_MS = 15 * 60 * 1000;
const RECOVERY_MAX_ATTEMPTS = 8;

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

function validUsername(value) {
  return /^[a-z0-9][a-z0-9._-]{1,31}$/.test(value);
}

function requireSignedIn(request) {
  if (!request.auth || !request.auth.uid) throw new HttpsError('unauthenticated', 'Please sign in.');
  return request.auth;
}

function requireManagedAdmin(request) {
  const caller = requireSignedIn(request);
  const claims = caller.token || {};
  if (claims.role !== 'admin' || !validUsername(normalizeUsername(claims.username))) {
    throw new HttpsError('permission-denied', 'This account is not enabled for administrator recovery.');
  }
  return { caller, claims, username: normalizeUsername(claims.username) };
}

function isItDesk(claims) {
  return claims && claims.itDesk === true && claims.role === 'admin';
}

function requireRecentAuthentication(caller, operation) {
  const authTime = Number(caller && caller.token && caller.token.auth_time || 0);
  const ageMs = Date.now() - authTime * 1000;
  if (!authTime || ageMs < -60_000 || ageMs > 10 * 60 * 1000) {
    throw new HttpsError('failed-precondition', `${operation} requires a recent sign-in. Sign out and sign in again.`);
  }
}

async function getManagedAdminProfile(uid, expectedUsername) {
  const ref = ACCOUNTS.doc(uid);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('failed-precondition', 'This administrator account has not been provisioned.');
  const account = snap.data();
  if (account.role !== 'admin' || account.active === false || normalizeUsername(account.username) !== normalizeUsername(expectedUsername)) {
    throw new HttpsError('permission-denied', 'Administrator profile is inactive or does not match the signed-in identity.');
  }
  return { ref, account };
}

async function requireItDeskAdmin(caller) {
  const username = normalizeUsername(caller && caller.token && caller.token.username);
  if (!isItDesk(caller && caller.token) || username !== 'itdesk') {
    throw new HttpsError('permission-denied', 'Only the verified IT Desk account can reset an administrator password.');
  }
  const profile = await getManagedAdminProfile(caller.uid, 'itdesk');
  if (profile.account.itDesk !== true) {
    throw new HttpsError('permission-denied', 'The signed-in account is not the provisioned IT Desk administrator.');
  }
  return profile;
}

async function writeAudit(entry) {
  try {
    await AUDIT.add({ ...entry, at: admin.firestore.FieldValue.serverTimestamp() });
  } catch (error) {
    // An audit-sink outage must never turn a successful password change into a
    // failed response after credentials have already changed.
    console.error('[auth] Audit write failed:', error && error.code ? error.code : 'unknown');
  }
}

function authKey() {
  const raw = String(AUTH_RECOVERY_KEY.value() || '').trim();
  let key;
  if (/^[a-f0-9]{64}$/i.test(raw)) key = Buffer.from(raw, 'hex');
  else key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('AUTH_RECOVERY_KEY must be a 32-byte value encoded as 64 hex characters or Base64.');
  return key;
}

function purposeKey(purpose) {
  return crypto.createHmac('sha256', authKey()).update(`mr-laundry:${purpose}`).digest();
}

function encryptSecret(secret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', purposeKey('totp-encryption'), iv);
  const ciphertext = Buffer.concat([cipher.update(String(secret), 'utf8'), cipher.final()]);
  return {
    v: 1,
    iv: iv.toString('base64'),
    data: ciphertext.toString('base64'),
    tag: cipher.getAuthTag().toString('base64')
  };
}

function decryptSecret(record) {
  if (!record || record.v !== 1 || !record.iv || !record.data || !record.tag) throw new Error('Encrypted authenticator secret is missing.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', purposeKey('totp-encryption'), Buffer.from(record.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(record.tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(record.data, 'base64')),
    decipher.final()
  ]).toString('utf8');
}

function encryptedSecretMatches(left, right) {
  return !!left && !!right && left.v === right.v && left.iv === right.iv && left.data === right.data && left.tag === right.tag;
}

function requestIp(request) {
  const raw = request.rawRequest || {};
  const forwarded = raw.headers && raw.headers['x-forwarded-for'];
  const ip = (Array.isArray(forwarded) ? forwarded[0] : String(forwarded || '').split(',')[0]).trim();
  return ip || String(raw.ip || 'unknown');
}

async function enforceRecoveryRateLimit(username, request) {
  const limiterKey = crypto.createHmac('sha256', purposeKey('rate-limit'))
    .update(`${username}|${requestIp(request)}`)
    .digest('hex');
  const ref = RATE_LIMITS.doc(limiterKey);
  const now = Date.now();
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : {};
    const startedAt = Number(data.startedAt || 0);
    const attempts = now - startedAt < RECOVERY_WINDOW_MS ? Number(data.attempts || 0) : 0;
    if (attempts >= RECOVERY_MAX_ATTEMPTS) {
      throw new HttpsError('resource-exhausted', 'Too many recovery attempts. Wait before trying again.');
    }
    tx.set(ref, {
      startedAt: attempts ? startedAt : now,
      attempts: attempts + 1,
      expiresAt: admin.firestore.Timestamp.fromMillis(now + RECOVERY_WINDOW_MS)
    });
  });
}

async function findAccount(username) {
  const indexSnap = await USERNAME_INDEX.doc(username).get();
  if (!indexSnap.exists) return null;
  const uid = indexSnap.get('uid');
  if (!uid) return null;
  const accountSnap = await ACCOUNTS.doc(uid).get();
  if (!accountSnap.exists) return null;
  const account = accountSnap.data();
  if (account.active === false || account.role !== 'admin' || normalizeUsername(account.username) !== username) return null;
  return { uid, ref: accountSnap.ref, account };
}

function recoveryFailure() {
  // Keep the response the same whether the username is unknown, the account is
  // not eligible, the code is wrong, or the user has not enrolled yet.
  return new HttpsError('permission-denied', 'Recovery could not be verified. Check the code or contact IT Desk.');
}

function validStrongPassword(value) {
  const password = String(value || '');
  return password.length >= 12 && password.length <= 128 && !/[\u0000-\u001f\u007f]/.test(password);
}

async function verifyAndConsumeRecoveryCode(accountRef, account, submittedCode, expectedUsername) {
  const code = String(submittedCode || '').trim();
  const isTotp = /^\d{6}$/.test(code);
  let acceptedStep = null;
  let matchedHash = null;

  if (isTotp) {
    if (!account.totpEnabled || !account.totpSecret) throw recoveryFailure();
    const secret = decryptSecret(account.totpSecret);
    acceptedStep = verifyTotp(secret, code, Date.now(), TOTP_WINDOW, Number(account.lastTotpStep ?? -1));
    if (acceptedStep === null) throw recoveryFailure();
  } else {
    const candidate = hashRecoveryCode(code, purposeKey('recovery-code-hash'));
    const hashes = Array.isArray(account.recoveryCodeHashes) ? account.recoveryCodeHashes : [];
    matchedHash = hashes.find(hash => safeEqualHex(hash, candidate)) || null;
    if (!matchedHash) throw recoveryFailure();
  }

  await db.runTransaction(async tx => {
    const snap = await tx.get(accountRef);
    if (!snap.exists) throw recoveryFailure();
    const current = snap.data();
    if (current.active === false || current.role !== 'admin' || normalizeUsername(current.username) !== expectedUsername || !current.totpEnabled) throw recoveryFailure();
    if (acceptedStep !== null) {
      if (acceptedStep <= Number(current.lastTotpStep ?? -1)) throw recoveryFailure();
      tx.update(accountRef, { lastTotpStep: acceptedStep, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    } else {
      const currentHashes = Array.isArray(current.recoveryCodeHashes) ? current.recoveryCodeHashes : [];
      if (!currentHashes.some(hash => safeEqualHex(hash, matchedHash))) throw recoveryFailure();
      tx.update(accountRef, {
        recoveryCodeHashes: currentHashes.filter(hash => !safeEqualHex(hash, matchedHash)),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  });
}

exports.beginAuthenticatorEnrollment = onCall(
  { secrets: [AUTH_RECOVERY_KEY], enforceAppCheck: false },
  async request => {
    const { caller, username } = requireManagedAdmin(request);
    requireRecentAuthentication(caller, 'Authenticator setup');
    const { ref: accountRef, account } = await getManagedAdminProfile(caller.uid, username);
    if (account.totpEnabled) throw new HttpsError('already-exists', 'Authenticator recovery is already enabled. Contact IT Desk to replace it.');

    const secret = generateSecret();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    await accountRef.set({
      pendingTotpSecret: encryptSecret(secret),
      pendingTotpExpiresAt: admin.firestore.Timestamp.fromMillis(expiresAt),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return {
      secret,
      otpauthUrl: makeOtpAuthUrl(secret, username),
      expiresAt
    };
  }
);

exports.confirmAuthenticatorEnrollment = onCall(
  { secrets: [AUTH_RECOVERY_KEY], enforceAppCheck: false },
  async request => {
    const { caller, username } = requireManagedAdmin(request);
    requireRecentAuthentication(caller, 'Authenticator setup');
    const code = String(request.data && request.data.code || '').trim();
    if (!/^\d{6}$/.test(code)) throw new HttpsError('invalid-argument', 'Enter the current six-digit authenticator code.');

    const { ref: accountRef, account } = await getManagedAdminProfile(caller.uid, username);
    if (account.totpEnabled || !account.pendingTotpSecret || !account.pendingTotpExpiresAt) {
      throw new HttpsError('failed-precondition', 'Start authenticator setup again.');
    }
    if (account.pendingTotpExpiresAt.toMillis() < Date.now()) throw new HttpsError('deadline-exceeded', 'Setup code expired. Start setup again.');

    const secret = decryptSecret(account.pendingTotpSecret);
    const step = verifyTotp(secret, code, Date.now(), TOTP_WINDOW, -1);
    if (step === null) throw new HttpsError('permission-denied', 'That code did not verify. Check the phone time and try again.');

    const recoveryCodes = createRecoveryCodes(10);
    const hashes = recoveryCodes.map(codeValue => hashRecoveryCode(codeValue, purposeKey('recovery-code-hash')));
    const enrollmentAuditRef = AUDIT.doc();
    await db.runTransaction(async tx => {
      const fresh = await tx.get(accountRef);
      if (!fresh.exists) throw new HttpsError('not-found', 'Account profile was not found.');
      const current = fresh.data();
      if (current.role !== 'admin' || current.active === false || normalizeUsername(current.username) !== username || current.totpEnabled || !encryptedSecretMatches(current.pendingTotpSecret, account.pendingTotpSecret) || !current.pendingTotpExpiresAt || current.pendingTotpExpiresAt.toMillis() < Date.now()) {
        throw new HttpsError('failed-precondition', 'Setup expired, account is inactive, or setup was already completed.');
      }
      tx.update(accountRef, {
        totpEnabled: true,
        totpSecret: current.pendingTotpSecret,
        pendingTotpSecret: admin.firestore.FieldValue.delete(),
        pendingTotpExpiresAt: admin.firestore.FieldValue.delete(),
        recoveryCodeHashes: hashes,
        lastTotpStep: step,
        totpEnrolledAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      tx.set(enrollmentAuditRef, {
        uid: caller.uid,
        username,
        action: 'authenticator.enrolled',
        at: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    return { recoveryCodes };
  }
);

exports.getAuthenticatorRecoveryStatus = onCall(
  { enforceAppCheck: false },
  async request => {
    const { caller, username } = requireManagedAdmin(request);
    const { account } = await getManagedAdminProfile(caller.uid, username);
    return {
      username,
      totpEnabled: account.totpEnabled === true,
      unusedRecoveryCodes: Array.isArray(account.recoveryCodeHashes) ? account.recoveryCodeHashes.length : 0,
      mustChangePassword: account.mustChangePassword === true,
      tempPasswordExpired: account.mustChangePassword === true && account.tempPasswordExpiresAt ? account.tempPasswordExpiresAt.toMillis() < Date.now() : false
    };
  }
);

exports.recoverAdminPassword = onCall(
  { secrets: [AUTH_RECOVERY_KEY], enforceAppCheck: false },
  async request => {
    const username = normalizeUsername(request.data && request.data.username);
    const code = String(request.data && request.data.code || '').trim();
    const newPassword = String(request.data && request.data.newPassword || '');
    if (!validUsername(username) || !validStrongPassword(newPassword) || code.length < 6 || code.length > 64) {
      throw recoveryFailure();
    }

    await enforceRecoveryRateLimit(username, request);
    const found = await findAccount(username);
    if (!found || found.account.totpEnabled !== true) throw recoveryFailure();

    const identity = await auth.getUser(found.uid).catch(() => { throw recoveryFailure(); });
    if (identity.disabled) throw recoveryFailure();
    await verifyAndConsumeRecoveryCode(found.ref, found.account, code, username);
    try {
      await auth.updateUser(found.uid, { password: newPassword });
    } catch (error) {
      console.error('[auth] Password recovery update failed:', error && error.code ? error.code : 'unknown');
      throw new HttpsError('internal', 'Recovery verification passed but the password update failed. Wait for a new code or contact IT Desk.');
    }
    await auth.revokeRefreshTokens(found.uid).catch(error => {
      console.error('[auth] Refresh-token revocation failed after recovery:', error && error.code ? error.code : 'unknown');
    });
    await writeAudit({ uid: found.uid, username, action: 'password.recovered.authenticator' });
    return { ok: true };
  }
);

exports.resetAdminPasswordByITDesk = onCall(
  { secrets: [AUTH_RECOVERY_KEY], enforceAppCheck: false },
  async request => {
    const caller = requireSignedIn(request);
    await requireItDeskAdmin(caller);
    requireRecentAuthentication(caller, 'IT Desk password reset');
    const targetUsername = normalizeUsername(request.data && request.data.username);
    if (!validUsername(targetUsername)) throw new HttpsError('invalid-argument', 'Enter a valid username.');
    const target = await findAccount(targetUsername);
    if (!target) throw new HttpsError('not-found', 'Managed administrator account was not found.');
    const targetIdentity = await auth.getUser(target.uid);
    if (targetIdentity.disabled) throw new HttpsError('failed-precondition', 'This Firebase account is disabled. Resolve the disabled status separately before resetting its password.');

    const temporaryPassword = crypto.randomBytes(24).toString('base64url');
    const expiresAt = Date.now() + TEMP_PASSWORD_TTL_MS;
    await target.ref.set({
      mustChangePassword: true,
      tempPasswordIssuedAt: admin.firestore.FieldValue.serverTimestamp(),
      tempPasswordExpiresAt: admin.firestore.Timestamp.fromMillis(expiresAt),
      tempPasswordIssuedBy: caller.uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    try {
      await auth.updateUser(target.uid, { password: temporaryPassword });
    } catch (error) {
      await target.ref.set({
        mustChangePassword: false,
        tempPasswordIssuedAt: admin.firestore.FieldValue.delete(),
        tempPasswordExpiresAt: admin.firestore.FieldValue.delete(),
        tempPasswordIssuedBy: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true }).catch(() => {});
      console.error('[auth] IT Desk password reset failed:', error && error.code ? error.code : 'unknown');
      throw new HttpsError('internal', 'Temporary password could not be issued. No password was provided.');
    }
    await auth.revokeRefreshTokens(target.uid).catch(error => {
      console.error('[auth] Refresh-token revocation failed after IT Desk reset:', error && error.code ? error.code : 'unknown');
    });
    await writeAudit({
      uid: target.uid,
      username: targetUsername,
      action: 'password.reset.by-itdesk',
      actorUid: caller.uid,
      actorUsername: normalizeUsername(caller.token.username)
    });
    return { temporaryPassword, expiresAt };
  }
);

exports.resetAdminAuthenticatorByITDesk = onCall(
  { enforceAppCheck: false },
  async request => {
    const caller = requireSignedIn(request);
    await requireItDeskAdmin(caller);
    requireRecentAuthentication(caller, 'IT Desk authenticator reset');
    const targetUsername = normalizeUsername(request.data && request.data.username);
    if (!validUsername(targetUsername)) throw new HttpsError('invalid-argument', 'Enter a valid username.');
    const target = await findAccount(targetUsername);
    if (!target) throw new HttpsError('not-found', 'Managed administrator account was not found.');
    const auditRef = AUDIT.doc();
    await db.runTransaction(async tx => {
      const snap = await tx.get(target.ref);
      if (!snap.exists) throw new HttpsError('not-found', 'Managed administrator account was not found.');
      const current = snap.data();
      if (current.active === false || current.role !== 'admin' || normalizeUsername(current.username) !== targetUsername) {
        throw new HttpsError('failed-precondition', 'Administrator profile changed; try again or contact support.');
      }
      tx.update(target.ref, {
        totpEnabled: false,
        totpSecret: admin.firestore.FieldValue.delete(),
        lastTotpStep: admin.firestore.FieldValue.delete(),
        recoveryCodeHashes: [],
        totpEnrolledAt: admin.firestore.FieldValue.delete(),
        pendingTotpSecret: admin.firestore.FieldValue.delete(),
        pendingTotpExpiresAt: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      tx.set(auditRef, {
        uid: target.uid,
        username: targetUsername,
        action: 'authenticator.reset.by-itdesk',
        actorUid: caller.uid,
        actorUsername: normalizeUsername(caller.token.username),
        at: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    return { ok: true };
  }
);

exports.completeTemporaryPasswordChange = onCall(
  { secrets: [AUTH_RECOVERY_KEY], enforceAppCheck: false },
  async request => {
    const { caller, username } = requireManagedAdmin(request);
    requireRecentAuthentication(caller, 'Temporary password change');
    const newPassword = String(request.data && request.data.newPassword || '');
    if (!validStrongPassword(newPassword)) throw new HttpsError('invalid-argument', 'Use a password with at least 12 characters.');
    const { ref, account } = await getManagedAdminProfile(caller.uid, username);
    if (account.mustChangePassword !== true) throw new HttpsError('failed-precondition', 'No temporary password change is pending.');
    const expiry = account.tempPasswordExpiresAt;
    if (!expiry || expiry.toMillis() < Date.now()) throw new HttpsError('deadline-exceeded', 'Temporary password expired. Use authenticator recovery or contact IT Desk.');
    await auth.updateUser(caller.uid, { password: newPassword });
    await ref.set({
      mustChangePassword: false,
      tempPasswordExpiresAt: admin.firestore.FieldValue.delete(),
      tempPasswordIssuedAt: admin.firestore.FieldValue.delete(),
      tempPasswordIssuedBy: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    await auth.revokeRefreshTokens(caller.uid).catch(error => {
      console.error('[auth] Refresh-token revocation failed after temporary password change:', error && error.code ? error.code : 'unknown');
    });
    await writeAudit({ uid: caller.uid, username, action: 'password.changed.after-itdesk-reset' });
    return { ok: true };
  }
);
