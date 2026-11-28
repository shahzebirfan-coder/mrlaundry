# Persistent Google Drive backup — Firebase Functions setup

This project now has a server-side Google Drive backup endpoint. The browser sends a Firebase Authentication ID token and a one-time Google authorization code. The Function validates the signed-in Firebase Google account, exchanges the code, encrypts the Drive refresh token with AES-256-GCM, and saves the encrypted token in the server-only Firestore collection `gdriveConnections/{firebaseUid}`. Access tokens are obtained from Google when needed and are not stored in browser local storage. Firestore client rules must continue to deny access to `gdriveConnections`.

**This is implemented in source but is not deployed or live-tested yet.** The Firebase project, Google OAuth client, secrets, Auth provider, and allowed website origins must be configured by an owner of the Firebase/Google Cloud projects.

## Prerequisites

- Access to the Firebase project used by this POS's Cloud Sync configuration.
- Firebase Authentication enabled, with the **Google** sign-in provider enabled.
- A Firestore database in that project.
- Firebase project on the **Blaze** plan for Cloud Functions / Secret Manager use.
- Firebase CLI installed and authenticated (`firebase login`).
- Google Drive API enabled in the Google Cloud project for the OAuth client.
- A deployed HTTPS POS origin (for example `https://pos.example.com`). Do not include a path or trailing slash in origin values.

## 1. Configure Firebase Authentication

In Firebase Console, open **Authentication → Sign-in method → Google** and enable it. Add the POS host under **Authentication → Settings → Authorized domains**. The POS browser must use the same Firebase project as the Functions deployment.

The Function intentionally requires a verified Firebase Google account. At the first Drive setup, sign in with the Google account that owns the Drive you want to back up; the backend checks that the Drive-grant account email matches the Firebase Google account email.

## 2. Configure the Google OAuth consent screen and client

In Google Cloud Console, select the Google Cloud project used for the OAuth client, enable **Google Drive API**, and configure the OAuth consent screen. Use an OAuth **Web application** client. Add each production POS origin to **Authorized JavaScript origins** (for example `https://pos.example.com`). The popup flow uses the calling page's origin as its OAuth `redirect_uri`; do not add a path to the origin.

The app requests the narrow `drive.file` scope, so it only manages its own backup files. If the consent screen is External, do not leave it in **Testing** for ongoing use: Google documents that refresh tokens issued to external apps in Testing expire after 7 days when the app requests scopes beyond basic sign-in. Publish the consent screen and complete any verification Google requires before relying on long-lived backups. Add test users while testing.

Keep the OAuth **Client ID** for the browser and Functions configuration. The **Client Secret is server-only**; never paste it into app settings, source files, or browser storage.

## 3. Select the Firebase project and set the secrets

From the repository root:

```sh
firebase login
firebase use --add
```

Select the same project as the POS's Firebase Cloud Sync configuration. The Functions are deployed in `us-central1`.

Set both Secret Manager values. The commands prompt for the values; do not put them in source code or pass them in shell command arguments. `GDRIVE_TOKEN_ENCRYPTION_KEY` must be a base64-encoded 32-byte key; generate one with `openssl rand -base64 32`, then paste it at the prompt. Store a secure recovery copy of this encryption key in your password manager. If the key is lost or replaced, already saved Drive refresh tokens cannot be decrypted and each user must reconnect.

```sh
firebase functions:secrets:set GDRIVE_GOOGLE_CLIENT_SECRET
firebase functions:secrets:set GDRIVE_TOKEN_ENCRYPTION_KEY
```

The non-secret OAuth Client ID and CORS origin list are Firebase Functions string parameters. On the first deployment, Firebase CLI prompts for them. Alternatively, create `functions/.env.<project-id>` (replace the suffix with the selected Firebase project ID):

```dotenv
GDRIVE_GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
GDRIVE_ALLOWED_ORIGINS=https://pos.example.com,https://www.pos.example.com
```

Use exact origins with no trailing slash. The environment file contains public configuration only, not the Client Secret or encryption key; keep project-specific env files out of version control.

## 4. Deploy

From the repository root:

```sh
firebase deploy --only functions
```

The project includes `functions/package.json` and `functions/index.js`; deployment installs the Node 20 dependencies. The HTTP endpoint URL is:

```text
https://us-central1-PROJECT_ID.cloudfunctions.net/gdriveApi
```

The app derives this URL from the Firebase `projectId` stored by **Cloud Sync**. If the project uses another Functions region, update `FUNCTION_REGION` in `assets/js/gdrive.js` and deploy there consistently.

Do not add a Firestore client rule for `gdriveConnections`; Admin SDK writes bypass rules, and the current default-deny catch-all keeps this collection server-only.

## 5. Connect the POS and verify

1. In the POS, open **Settings → Cloud Sync** and confirm its Firebase config belongs to the project just deployed.
2. Open **Settings → Google Drive Backup**. Enter the same Web OAuth Client ID as `GDRIVE_GOOGLE_CLIENT_ID`, save it, and ensure the origin shown by the browser is in both the OAuth JavaScript origins and `GDRIVE_ALLOWED_ORIGINS`.
3. Click **Connect to Google Drive**. If not signed in, complete Google sign-in for Firebase, click again, then approve the Drive file permission. The account must match the Firebase Google sign-in account.
4. Verify the modal reports the Google account, press **Backup Now**, and confirm a `mr-laundry-backup-*.json` file appears in the `Laundry POS POS Backups` folder in that account's Drive.
5. Confirm the browser's local storage contains no Google access or refresh token. The refresh token is encrypted in Firestore; only `gdriveApi` (Admin SDK) can access the collection.
6. After a successful upload, confirm old app backups are pruned to the configured limit. The existing default remains **Daily** and **Keep Last 30 Backups**.

The client scheduler runs while the POS is open and checks again at the next open. Because the POS database is currently browser-local, a browser that is fully closed or a device that is powered off cannot initiate a new daily export; the Functions change removes repeated Google reconnection, but does not itself move local POS data to a background server job.

## Troubleshooting

- **`ORIGIN_NOT_ALLOWED`**: add the exact browser origin to `GDRIVE_ALLOWED_ORIGINS`, then redeploy.
- **`CLIENT_ID_MISMATCH`**: make the OAuth Client ID in the POS equal the Functions string parameter.
- **Firebase Google sign-in fails**: enable the Google Auth provider and add the app host under Firebase Auth authorized domains.
- **`GOOGLE_ACCOUNT_MISMATCH`**: Firebase sign-in and Drive authorization must use the same Google account.
- **`REFRESH_TOKEN_MISSING`**: revoke this app from [Google Account permissions](https://myaccount.google.com/permissions), then reconnect and approve Drive. Ensure the OAuth consent screen is not left in Testing for ongoing use.
- **`DRIVE_REAUTH_REQUIRED`**: Google revoked the grant or the OAuth client changed; reconnect once.
- **Secret/key errors**: set the named secrets, redeploy, and do not rotate the encryption key unless you are prepared for users to reconnect.
- **Logs**: inspect Firebase Functions logs for `gdriveApi`; responses do not include token values.

## Official references

- [Google Identity Services authorization code flow](https://developers.google.com/identity/oauth2/web/guides/use-code-model)
- [Google OAuth 2.0 refresh token behavior](https://developers.google.com/identity/protocols/oauth2#refresh-token-expiration)
- [Google Drive API scopes](https://developers.google.com/drive/api/guides/api-specific-auth)
- [Firebase Functions secrets and environment configuration](https://firebase.google.com/docs/functions/config-env)
