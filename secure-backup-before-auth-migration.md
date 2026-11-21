# Mr Laundry — Safe backup & verification before account migration

**Status:** Plan/checklist only. No account, backup, Firebase project, or live-site changes have been made.

## Why this backup needs extra care

The app's **Settings → Backup & Restore → Download Backup** exports the full POS database as JSON. That can include customer/order details and user records with password fields. Treat the file as highly sensitive. Do not send it in chat, commit it to GitHub, or upload an unencrypted copy to Drive.

The two `mr-laundry-backup-accounts-recovered*.json` files already in the workspace are earlier full-data snapshots—not verified snapshots of the current browser or current Firebase data. **Do not restore either one for this migration.** Restoring a backup replaces the current dataset.

## 1. Choose and check the source device

- Use the main device/browser that has the most complete, current Mr Laundry records. Do not clear browser/site data.
- Connect to the internet and sign in. In Settings, check the Cloud Sync status and note its **Last Sync** time. If it is paused, showing an error, or clearly behind recent work, stop here; do not force-push a potentially stale device.
- Avoid creating or editing records while taking the snapshot. Record the counts shown in Settings: **orders, customers, products, and invoice counter**. Note any other important totals you can see (for example expenses, vendors, purchase orders, and factory records).

## 2. Download a fresh snapshot — do not restore

1. Open **Settings → Backup & Restore**.
2. Verify the displayed counts match the device you chose.
3. Click **Download Backup** only. Do **not** click **Restore from Backup**, **Reset All Data**, **Force Push**, or **Force Pull** during this preflight.
4. Save the downloaded JSON under a dated name, for example `mr-laundry-pre-auth-migration-YYYY-MM-DD.json`.
5. Keep the browser open until the file has finished downloading. Do not edit the JSON by hand.

## 3. Verify the downloaded file offline

Use the companion `backup-audit.html` checker:

1. Download/open that checker locally in Chrome or Edge (it works offline).
2. Select the newly downloaded JSON file.
3. Compare the table counts it shows with the totals recorded from the app. The checker reports counts and duplicate/missing-ID totals only; it does **not** display names, phone numbers, order amounts, or password values, and it does not upload or save the backup.
4. It will warn if user password fields are present. That is expected for the current export format and is another reason the backup must stay private.
5. If JSON parsing fails, a core table is missing, or counts do not match, stop. Do not import the file or proceed with the migration until the mismatch is understood.

Counts are a sanity check, not proof that every record is correct. Keep the app's counts and the checker report together as a private migration note.

## 4. Store two protected copies

- Keep one copy in encrypted storage on the business device and a second copy on a separate encrypted/offline device or encrypted archive.
- Do not upload the raw JSON to public GitHub, chat, or an unencrypted cloud folder. The app's Google Drive backup should not be used for this sensitive snapshot unless the file is encrypted before upload and the Drive folder is private.
- Store any encryption passphrase in a password manager; never send it or a recovery code in chat.
- Keep the snapshot until the migrated login and the record counts have been verified on the live app. Do not use it to overwrite live data as a test.

## 5. Before enabling the secure login migration

- Confirm the fresh snapshot parses and its important counts match the source device.
- Confirm Firebase Cloud Sync is current; if it is not, pause and reconcile the cloud/local difference first. Do not guess which copy is authoritative.
- Schedule a short maintenance window so orders are not being changed during account migration.
- After migration, verify login for the owner, the `itdesk` account, and staff; verify Firestore sync and the same business-record counts before resuming normal use.
- The backup protects business records; it does not make passwords safe. The exposed account password should be changed separately. Never share passwords, OTPs, recovery codes, or private Firebase keys.

## What I can and cannot verify here

I cannot see the active browser's local database or read the current Firebase project from this workspace, so I cannot certify that an existing file is today's backup. This checklist and checker only help you create and inspect a fresh export locally. No backup has been restored and no live data has been changed.
