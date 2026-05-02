# Backup And Restore Guide

## Scope

This system protects production-critical data for Tailor Management System by backing up PostgreSQL, encrypting the backup, delivering it by email, and running repeatable restore tests against a staging database.

## Production Storage Mode

Primary mode is Email Delivery (SMTP).

Why email mode is used:

- Backup copy is pushed automatically to your operations inbox.
- No dependency on external object storage providers.
- Works with standard SMTP providers.

## What Is Backed Up

- PostgreSQL database content (users, customers, orders, measurements, finance, daily expenses, notifications, Rakht data, drafts, and related relational data).
- Optional local encrypted archive files (for restore testing and download API) in:
  - `storage/backup/email-archive/`
- Backup metadata in state file:
  - `storage/backup/backup-state.json`
- Local archive prefixes:
  - `email/daily/`
  - `email/weekly/`
  - `email/monthly/`
  - `email/manual/`

## What Is Not Backed Up

- Frontend and backend source code (already protected by Git).
- Runtime-generated PDF files (generated dynamically).
- Uploaded secrets (`.env`, credentials) and local temporary backup files.
- Production filesystem state outside database content.

## Email Mode One-Time Setup (SMTP)

1. Create a mailbox for backups (example: `ops-backups@your-domain.com`).
2. Enable SMTP access for that mailbox.
3. If provider requires app password (Gmail/Outlook), create app password.
4. Collect SMTP details:
   - host
   - port
   - secure (TLS/SSL)
   - username
   - password
5. Choose recipients for backup emails (`TO`, optional `CC/BCC`).
6. Put these values in `backend/.env`.

Team template:

- `backend/.env.backup.email.example`

## Required Environment Variables

Set these in `backend/.env`:

- `BACKUP_ENABLED=true`
- `BACKUP_CRON="0 2 * * *"`
- `BACKUP_TIMEZONE="Asia/Kabul"`
- `DATABASE_URL`
- `BACKUP_DATABASE_URL`
- `STAGING_DATABASE_URL`
- `BACKUP_STORAGE_PROVIDER=email`
- `BACKUP_EMAIL_TO=<recipient1@example.com[,recipient2@example.com]>`
- `BACKUP_EMAIL_CC` (optional)
- `BACKUP_EMAIL_BCC` (optional)
- `BACKUP_EMAIL_FROM` (optional; defaults to `SMTP_USER`)
- `BACKUP_EMAIL_SUBJECT_PREFIX=Tailor Backup`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE` (`true` for 465, usually `false` for 587)
- `SMTP_USER`
- `SMTP_PASS`
- `BACKUP_EMAIL_ARCHIVE_ENABLED=true`
- `BACKUP_ENCRYPTION_KEY=<strong-random-secret>`
- `BACKUP_RETENTION_DAILY_DAYS=35`
- `BACKUP_RETENTION_WEEKLY_DAYS=90`
- `BACKUP_RETENTION_MONTHLY_DAYS=365`
- `BACKUP_HEALTHCHECK_URL` (optional; default is local `/api/health`)

## Automatic Backup Workflow

Nightly scheduler runs at `BACKUP_CRON` in `BACKUP_TIMEZONE`.

Steps:

1. Run `pg_dump` using custom format (`.dump`).
2. Validate local file existence and non-zero size.
3. Encrypt dump file (AES-256-GCM).
4. Send encrypted file (`.dump.enc`) as email attachment via SMTP.
5. Store encrypted local archive copy (if `BACKUP_EMAIL_ARCHIVE_ENABLED=true`).
6. Apply retention cleanup policy for local archive categories.
7. Delete temporary local backup artifacts.
8. Log success or failure with safe, non-sensitive messages.

## Manual Backup

Options:

- API (ADMIN only): `POST /api/backups/run`
- Script: `npm --prefix backend run backup:run`
- Admin UI: `/backups` page, `Run Backup` action

Filename pattern:

- `tailor-backup-<environment>-YYYY-MM-DD-HH-mm.dump`

## Email Verification Checklist

Before first production run:

1. Confirm `BACKUP_STORAGE_PROVIDER=email`.
2. Confirm `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` are valid.
3. Confirm `BACKUP_EMAIL_TO` has correct recipient address(es).
4. Confirm mailbox allows SMTP from your app/server.
5. Run: `npm --prefix backend run backup:run`
6. Verify email arrives with `.enc` attachment.
7. If archive enabled, verify file exists in `storage/backup/email-archive/manual/...`.

## Restore From Backup (Manual Procedure)

1. Download encrypted backup attachment from email or from local archive (`.dump.enc`).
2. Decrypt backup with `BACKUP_ENCRYPTION_KEY`.
3. Restore into target database using `pg_restore` (never auto-restore production).
4. Run Prisma migrations (`prisma migrate deploy`) for schema consistency.
5. Run validation queries and health checks.

## Automated Restore Test

Options:

- API (ADMIN only): `POST /api/backups/test-restore`
- Script: `npm --prefix backend run backup:test-restore`
- Admin UI: `/backups` page, `Test Restore` action

Restore test flow:

1. Read latest encrypted backup from local archive.
2. Decrypt locally to temporary `.dump` file.
3. Restore into `STAGING_DATABASE_URL`.
4. Run `prisma migrate deploy` on staging/test database.
5. Run checks:
   - DB connection check
   - `User` table check
   - `Customer` table check
   - `Order` table check
   - API health endpoint check
6. Record pass/fail status in backup metadata state.

Safety controls:

- Restore test refuses to run if `STAGING_DATABASE_URL` equals production backup source URL.
- Automated restore jobs never target production.

## Retention Policy

- Daily backups: keep 35 days.
- Weekly backups: keep 90 days (3 months).
- Monthly backups: keep 365 days (1 year).

Cleanup runs after backup send and deletes expired local archived files.

## Security Notes

- Backup files are encrypted before upload.
- Backup APIs are protected by authentication and ADMIN-only authorization.
- Sensitive values are never printed in logs or API responses.
- Do not commit backup files, encrypted dumps, or `.env` files.
- Use SMTP credentials dedicated for backups.
- Rotate `SMTP_PASS` regularly.
- Restrict backup mailbox access to authorized operators.

## Disaster Recovery Steps

1. Confirm incident and isolate affected production services.
2. Identify latest valid backup from backup list.
3. Restore backup to staging first and run smoke checks.
4. If staging validation passes, execute controlled production restore manually by an authorized operator.
5. Run Prisma migrations if needed.
6. Validate critical business flows:
   - login/auth
   - customer lookup
   - order lifecycle
   - finance transactions
   - daily expense reporting
   - Rakht inventory/revenue views
7. Monitor logs and metrics, then reopen traffic.
8. Perform post-incident review and adjust retention/scheduling if required.

### BackupManagement Page Overview

#### Buttons

1. **Run Backup Now**
   - **Purpose:** Triggers the creation of a new backup for the system.
   - **Functionality:**
     - Initiates a backend process to save the current state of the database and critical files.
     - Stores the backup in the designated storage location (e.g., cloud or local storage).
     - Adds the new backup to the **All Backups** section for tracking.

2. **Test Restore**
   - **Purpose:** Tests the integrity of a specific backup by attempting to restore it in a controlled environment.
   - **Functionality:**
     - Selects a backup (either the most recent or a user-specified one) and performs a restore operation in a test environment.
     - Ensures the backup is valid and can be restored without errors.
     - Logs the results of the test in the **Recent Restore Tests** section.

#### Sections

1. **Recent Restore Tests**
   - **Purpose:** Displays the results of recent restore operations, including both successful and failed tests.
   - **Details:**
     - Each entry includes:
       - The date and time of the restore test.
       - The backup file that was tested.
       - The status of the test (e.g., "Success" or "Failure").
       - Any error messages or logs if the test failed.
     - Helps administrators verify the reliability of backups and identify issues with specific backups.

2. **All Backups (4)**
   - **Purpose:** Lists all the backups that have been created, with the number in parentheses indicating the total count of backups.
   - **Details:**
     - Each entry includes:
       - The date and time the backup was created.
       - The size of the backup file.
       - A unique identifier or name for the backup.
       - Options to download, delete, or restore the backup.
     - Provides a comprehensive view of all available backups, allowing administrators to manage them effectively.
