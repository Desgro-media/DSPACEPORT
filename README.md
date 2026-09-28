# DSPACEPORT

DSPACE global real estate site, served by a small Node/Express app that also
powers an admin panel for managing properties, pricing, addresses and photos.
Site content lives in Postgres and uploaded photos live in S3, so the app runs
equally well on Vercel or on a traditional Node host (Railway, Render, a VPS).

## Set up

1. Copy `.env.example` to `.env` and fill it in:
   - `DATABASE_URL` — a Postgres connection string. On Vercel: Storage tab ->
     Marketplace -> Neon -> create -> connect to this project, which injects
     it automatically (copy the same value into your local `.env`, or create
     a separate Neon branch for local dev).
   - `SESSION_SECRET` — generate with
     `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
     Required in any Vercel environment; optional locally (falls back to a
     file on disk, `server/.session-secret`).
   - `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION` /
     `AWS_S3_BUCKET` — an S3 bucket for admin-uploaded photos, and an IAM
     user scoped to just that bucket. The bucket needs:
     - A bucket policy allowing public `s3:GetObject` (uploaded photos are
       public site content):
       ```json
       { "Version": "2012-10-17", "Statement": [
         { "Effect": "Allow", "Principal": "*", "Action": "s3:GetObject",
           "Resource": "arn:aws:s3:::YOUR_BUCKET/*" }
       ]}
       ```
       (also uncheck "Block public access via bucket policies" in the
       bucket's Block Public Access settings)
     - A CORS policy allowing browser PUT uploads:
       ```json
       [{ "AllowedOrigins": ["https://your-domain.example", "http://localhost:3000"],
          "AllowedMethods": ["PUT"], "AllowedHeaders": ["Content-Type"], "MaxAgeSeconds": 3000 }]
       ```
     - The IAM user only needs `s3:PutObject` on `arn:aws:s3:::YOUR_BUCKET/*`
       (reads are public via the bucket policy above, not via the app).
2. Install dependencies and create/seed the database tables (safe to re-run —
   it only inserts when a table is empty):
   ```
   npm install
   npm run seed
   ```
3. Start the app:
   ```
   npm start
   ```

Then open:

- Site: http://localhost:3000
- Admin: http://localhost:3000/admin

**Admin login** — the seed script creates one admin account. Unless you set
`ADMIN_USERNAME` / `ADMIN_PASSWORD_HASH` (a bcrypt hash) before running
`npm run seed`, it defaults to:
- Username: `dspaceadmin`
- Password: `desgromedia`

To rotate credentials afterwards, update the `admin_credentials` table
directly (one row: `username`, `password_hash`), rather than re-running the
seed script (it won't overwrite an existing row).

Change the port with `PORT=8080 npm start`.

## Deploying

**Vercel** — set every variable from `.env.example` (except `PORT`) as
project environment variables, plus `TRUST_PROXY=1` so Express reads the real
client IP from `X-Forwarded-For` behind Vercel's proxy (needed for the login
rate limiter to work correctly). Then run `npm run seed` once from your
machine against the same `DATABASE_URL` Vercel uses, and deploy. `vercel.json`
routes `/api/*` and the two generated data scripts through `api/index.js`
(a thin wrapper around the same Express app); everything else is served as
static files.

**A traditional Node host** (Railway, Render, a VPS) — set the same
environment variables and run `npm start`. Also set `NODE_ENV=production` so
the session cookie is marked `Secure` (HTTPS-only).

## How content editing works

All site content — properties, pricing, addresses, contact details, office
info and most photos — lives in a single `site_data` row in Postgres
(`server/store.js`). The admin panel at `/admin` edits it through a small API
(`server/index.js`); nothing needs to be redeployed for changes to appear.

Two scripts are generated from that data on every request and loaded by the
public pages instead of static files:

- `assets/js/properties-data.js` — the `PROPERTIES` array used by
  `properties.js` / `property-detail.js`.
- `assets/js/site-settings.js` — `SITE_SETTINGS` and `TEAM`, applied to the
  page by `assets/js/site-content.js` via `data-cms-*` attributes in the HTML.

Uploaded photos go straight from the browser to S3 via a short-lived
presigned URL (`server/upload.js`) and are referenced by their public S3 URL.
