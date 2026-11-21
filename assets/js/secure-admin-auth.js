/*
 * Firebase Auth bridge for managed administrator accounts only.
 * Normal cashier login remains on the existing local account flow.
 * Authenticator TOTP secrets and recovery-code hashes are handled by Cloud Functions.
 */
const SecureAdminAuth = (() => {
  let auth = null;
  let functions = null;
  let initPromise = null;
  const REGION = 'asia-south1';

  function normalizeUsername(value) {
    return String(value || '').trim().toLowerCase();
  }

  function emailForUsername(username) {
    const cfg = (typeof CLOUD !== 'undefined' && CLOUD.getConfig) ? CLOUD.getConfig() : null;
    if (!cfg || !cfg.projectId) throw new Error('Firebase project configuration is not available.');
    return `${normalizeUsername(username)}@${cfg.projectId}.firebaseapp.com`;
  }

  async function init() {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      if (typeof CLOUD === 'undefined' || typeof CLOUD.loadSDK !== 'function') {
        throw new Error('Firebase loader is unavailable.');
      }
      await CLOUD.loadSDK();
      await CLOUD.init();
      const app = CLOUD._app || firebase.app();
      auth = app.auth();
      functions = app.functions(REGION);
      try { await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION); } catch (_) {}
      return { auth, functions };
    })().catch(error => {
      initPromise = null;
      throw error;
    });
    return initPromise;
  }

  function functionCall(name, data) {
    return init().then(() => functions.httpsCallable(name)(data || {})).then(result => result.data);
  }

  function saveSession(claims, uid) {
    const username = normalizeUsername(claims.username);
    const session = {
      id: String(claims.localId || `auth_${username}`),
      authUid: uid,
      name: String(claims.name || username || 'Administrator'),
      username,
      role: 'admin',
      itDesk: claims.itDesk === true,
      authMode: 'firebase'
    };
    sessionStorage.setItem('mrLaundrySession', JSON.stringify(session));
    return session;
  }

  async function validateCurrentUser(expectedUsername = '') {
    await init();
    const user = auth.currentUser || await new Promise(resolve => {
      let unsubscribe = null;
      unsubscribe = auth.onAuthStateChanged(value => {
        if (unsubscribe) unsubscribe();
        resolve(value || null);
      }, () => resolve(null));
    });
    if (!user) return null;
    const token = await user.getIdTokenResult(true);
    const claims = token.claims || {};
    const username = normalizeUsername(claims.username);
    if (claims.role !== 'admin' || !username || (expectedUsername && username !== normalizeUsername(expectedUsername))) {
      await auth.signOut();
      sessionStorage.removeItem('mrLaundrySession');
      return null;
    }
    return saveSession(claims, user.uid);
  }

  return {
    isManagedUser(username, localUser) {
      const normalized = normalizeUsername(username);
      return normalized === 'itdesk' || normalized === 'shahzeb' || normalized === 'adminshahzeb' ||
        !!(localUser && (localUser.role === 'admin' || localUser.authManaged === true));
    },

    async login(username, password) {
      const normalized = normalizeUsername(username);
      if (!normalized || !password) throw new Error('Enter username and password.');
      await init();
      const credential = await auth.signInWithEmailAndPassword(emailForUsername(normalized), password);
      const token = await credential.user.getIdTokenResult(true);
      const claims = token.claims || {};
      if (claims.role !== 'admin' || normalizeUsername(claims.username) !== normalized) {
        await auth.signOut();
        throw new Error('This account is not enabled for secure administrator login.');
      }
      const session = saveSession(claims, credential.user.uid);
      let status;
      try {
        status = await functionCall('getAuthenticatorRecoveryStatus', {});
        if (!status || normalizeUsername(status.username) !== normalized || typeof status.mustChangePassword !== 'boolean' || typeof status.tempPasswordExpired !== 'boolean') {
          throw new Error('Secure admin recovery status could not be verified.');
        }
      } catch (error) {
        await auth.signOut().catch(() => {});
        sessionStorage.removeItem('mrLaundrySession');
        console.warn('[SecureAdminAuth] Could not verify recovery status:', error && error.code ? error.code : 'unknown');
        throw error;
      }
      return {
        ...session,
        mustChangePassword: status.mustChangePassword,
        tempPasswordExpired: status.tempPasswordExpired,
        totpEnabled: status.totpEnabled === true,
        unusedRecoveryCodes: Number(status.unusedRecoveryCodes || 0)
      };
    },

    async restoreSession() {
      try {
        const session = await validateCurrentUser();
        if (!session) return null;
        const status = await functionCall('getAuthenticatorRecoveryStatus', {});
        if (!status || normalizeUsername(status.username) !== normalizeUsername(session.username) || typeof status.mustChangePassword !== 'boolean' || typeof status.tempPasswordExpired !== 'boolean') {
          throw new Error('Secure admin recovery status could not be verified.');
        }
        const restored = {
          ...session,
          mustChangePassword: status.mustChangePassword,
          tempPasswordExpired: status.tempPasswordExpired,
          totpEnabled: status.totpEnabled === true,
          unusedRecoveryCodes: Number(status.unusedRecoveryCodes || 0)
        };
        sessionStorage.setItem('mrLaundrySession', JSON.stringify(restored));
        return restored;
      } catch (error) {
        if (auth && auth.currentUser) await auth.signOut().catch(() => {});
        sessionStorage.removeItem('mrLaundrySession');
        console.warn('[SecureAdminAuth] Session validation failed:', error && error.code ? error.code : 'unknown');
        return null;
      }
    },

    async getRecoveryStatus() {
      return functionCall('getAuthenticatorRecoveryStatus', {});
    },

    async beginAuthenticatorEnrollment() {
      return functionCall('beginAuthenticatorEnrollment', {});
    },

    async confirmAuthenticatorEnrollment(code) {
      return functionCall('confirmAuthenticatorEnrollment', { code: String(code || '').trim() });
    },

    async recoverPassword(username, code, newPassword) {
      return functionCall('recoverAdminPassword', {
        username: normalizeUsername(username),
        code: String(code || '').trim(),
        newPassword: String(newPassword || '')
      });
    },

    async resetAdminPasswordByITDesk(username) {
      return functionCall('resetAdminPasswordByITDesk', { username: normalizeUsername(username) });
    },

    async resetAdminAuthenticatorByITDesk(username) {
      return functionCall('resetAdminAuthenticatorByITDesk', { username: normalizeUsername(username) });
    },

    async completeTemporaryPasswordChange(newPassword) {
      return functionCall('completeTemporaryPasswordChange', { newPassword: String(newPassword || '') });
    },

    async changeOwnPassword(newPassword, currentPassword) {
      await init();
      const current = auth.currentUser;
      if (!current || !current.email) throw new Error('Sign in again before changing the password.');
      const credential = firebase.auth.EmailAuthProvider.credential(current.email, String(currentPassword || ''));
      await current.reauthenticateWithCredential(credential);
      await current.updatePassword(String(newPassword || ''));
      return true;
    },

    async signOut() {
      try {
        if (!auth) await init();
        if (auth && auth.currentUser) await auth.signOut();
      } catch (error) {
        console.warn('[SecureAdminAuth] Sign-out error:', error && error.code ? error.code : 'unknown');
      }
      sessionStorage.removeItem('mrLaundrySession');
    },

    getSignedInUser() {
      return auth && auth.currentUser ? auth.currentUser : null;
    }
  };
})();
window.SecureAdminAuth = SecureAdminAuth;
