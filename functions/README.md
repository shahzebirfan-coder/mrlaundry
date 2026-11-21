# Admin / IT Desk authenticator recovery — staged setup

This package implements a **server-verified password-recovery flow** for Firebase-managed admin accounts only. Google Authenticator is used only during password recovery (not on every normal login). A verified 6-digit TOTP or an unused one-time recovery code lets the user set a new password. The OTP secret is encrypted with a Firebase Functions secret; it is not written into a backup JSON or browser storage.

`index.html` and the app JavaScript have local integration changes, but **nothing has been deployed**. This package is not authorization to provision or modify accounts; do not run the bootstrap without explicit owner approval. Do not publish the frontend before provisioning the Firebase Auth accounts and deploying the Functions.

## Important project state

- The POS currently has an older local login path and a Firestore sync. The new secure admin login uses Firebase Auth, with an internal email alias derived from the username.
- Only users whose Firebase custom claim is `role: "admin"` are eligible for this recovery flow. The `itdesk` account also has `itDesk: true` and can issue 15-minute temporary passwords and explicitly reset lost authenticator factors for managed admin accounts.
- Cashier accounts remain on the existing local login/recovery flow for this limited rollout.
- The configured project ID is `mr-laundry-pos-a6740`; project ownership and access were not verified. The `AUTH_RECOVERY_KEY` secret is also not verified/set by this workspace.
- The `shahzeb` login issue remains unresolved. No login fix or Firebase account provisioning is being claimed; confirm the account mapping before any approved provisioning.
- This repository has no existing Firestore rules file, so the current production rules were not inspected or replaced. Before production use, ensure clients cannot read or write `authAccounts`, `authUsernameIndex`, `authRecoveryRateLimits`, or `authRecoveryAudit`. A broad existing Firestore allow-rule can override a more specific deny rule, so merge/test rules carefully.
- Enable Firestore TTL on `authRecoveryRateLimits.expiresAt` to clean up rate-limit documents; set an explicit retention policy for `authRecoveryAudit`.
- The current frontend exposes a public Firebase web configuration by design. It is not an admin credential. Never put a service-account key, TOTP secret, recovery code, or user password in the frontend or a backup.

## Prerequisites

1. Make a fresh private backup from the current primary POS browser and compare its counts. Do not restore the backup as part of this setup.
2. Confirm the backup contains the current administrator usernames and account mappings. The bootstrap script can add `shahzeb` and `itdesk` only if absent; it aborts if either name exists with a non-admin role or if usernames are duplicated. Because the `shahzeb` login issue is unresolved, do not assume its identity mapping.
3. In Firebase Console for the project already configured in the app, enable **Authentication → Email/Password**. The internal aliases are not mailboxes and will not receive password-reset emails.
4. Install a current Firebase CLI on a trusted computer. Authenticate locally with an account that has the required project privileges. Do not send credentials to chat.
5. Confirm Functions deployment/billing requirements in the Firebase Console before deploying.

## Safe deployment order

Do not upload the new frontend first; the new admin-login path expects Firebase Auth accounts to exist.

1. In a trusted local terminal, install the Functions dependencies:
   ```sh
   cd functions
   npm install
   npm test
   ```
2. Create a random 32-byte encryption key **locally** and set it as the Functions secret. Keep the key in a password manager; do not commit it or send it here:
   ```sh
   openssl rand -hex 32
   firebase functions:secrets:set AUTH_RECOVERY_KEY --project mr-laundry-pos-a6740
   ```
   Paste the locally generated value only into the Firebase CLI secret prompt. The source code does not contain the key. Losing or rotating this key without migrating stored records makes enrolled TOTP secrets and recovery-code hashes unusable.
3. Deploy only the Functions first:
   ```sh
   firebase deploy --only functions --project mr-laundry-pos-a6740
   ```
4. Create a Firebase Admin service-account key in the Firebase/Google Cloud Console, save it **outside this repository**, and set `GOOGLE_APPLICATION_CREDENTIALS` to that local path. Never upload the key.
5. Only with explicit owner approval, run the provisioning script against the fresh private JSON backup:
   ```sh
   node functions/scripts/provision-admin-accounts.js /private/path/to/fresh-backup.json
   ```
   It uses usernames/roles/IDs for provisioning, ignores password fields, prompts for fresh passwords without echoing them, and does not modify the backup. It aborts on duplicate usernames or a non-admin `shahzeb`/`itdesk` row; resolve any conflict manually before proceeding. Keep all new passwords in a password manager.
6. Only after Functions deploy and the provisioned accounts have been verified, publish the frontend changes. The admin login now requires Firebase Auth; there is no local-password fallback for admin accounts.
7. Each admin and IT Desk user signs in, then promptly opens **Settings → Google Authenticator Recovery** (setup requires a recent sign-in within 10 minutes), scans the QR with Google Authenticator, verifies the current six-digit code, and stores the ten one-time recovery codes offline. Do not screenshot or upload the QR/codes.
8. Test recovery with a test admin account first. Verify that a valid TOTP or unused recovery code permits setting a new password; invalid/replayed codes fail; a recovery code cannot be reused; and normal username/password login still works afterwards.

## Recovery behavior

Callable endpoints: `beginAuthenticatorEnrollment`, `confirmAuthenticatorEnrollment`, `getAuthenticatorRecoveryStatus`, `recoverAdminPassword`, `resetAdminPasswordByITDesk`, `resetAdminAuthenticatorByITDesk`, and `completeTemporaryPasswordChange`.

- TOTP uses six digits and a 30-second period, with one adjacent time-step tolerance. A TOTP time-step cannot be reused.
- Ten random one-time recovery codes are shown only after enrollment and stored as keyed hashes. The server consumes a code after use.
- A user enters username + current TOTP/recovery code + a new password of at least 12 characters. The backend changes the Firebase Auth password and attempts to revoke existing refresh tokens.
- If an IT Desk admin issues a temporary password to a managed admin, it is displayed once, expires after 15 minutes, and the app requires the user to set a new password after sign-in. IT Desk password/factor resets and authenticator enrollment require a fresh sign-in within the last 10 minutes.
- If an administrator loses both the authenticator and every unused recovery code, IT Desk can explicitly reset the factor (all unused codes are invalidated) so the admin can enroll again. If the password is also forgotten, issue a temporary password separately. Both actions are audited; do not try to recover by editing a backup.

## Not done by this package

- No Functions have been deployed, no Firebase Auth users have been provisioned, and no live site or Firestore rules have been changed.
- The attached JSON backup has not been read or modified.
- Firebase Security Rules must be reviewed/merged with the existing live rules before claiming the whole POS data model is protected. This package secures the admin recovery operations; it does not automatically convert every legacy cashier permission or every Firestore table to server-enforced authorization.
