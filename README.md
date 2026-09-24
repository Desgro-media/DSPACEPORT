# DSPACEPORT

DSPACE global real estate site, served by a small Node/Express app that also
powers an admin panel for managing properties, pricing, addresses and photos.

## Run it

```
npm install
npm start
```

Then open:

- Site: http://localhost:3000
- Admin: http://localhost:3000/admin

**Admin login**
- Username: `dspaceadmin`
- Password: `desgromedia`

Change the port with `PORT=8080 npm start`. To rotate the admin credentials,
set `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH` (a bcrypt hash) as environment
variables instead of editing `server/auth.js` directly.

## How content editing works

All site content — properties, pricing, addresses, contact details, office
info and most photos — lives in `data/db.json`. The admin panel at `/admin`
edits that file through a small API (`server/index.js`); nothing needs to be
redeployed for changes to appear.

Two scripts are generated from `data/db.json` on every request and loaded by
the public pages instead of static files:

- `assets/js/properties-data.js` — the `PROPERTIES` array used by
  `properties.js` / `property-detail.js`.
- `assets/js/site-settings.js` — `SITE_SETTINGS` and `TEAM`, applied to the
  page by `assets/js/site-content.js` via `data-cms-*` attributes in the HTML.

Uploaded photos are saved under `assets/images/<category>/`.

Because pricing, addresses and photos now come from the server, the site can
no longer be deployed as plain static files (e.g. GitHub Pages) — it needs a
Node host (Railway, Render, a VPS, etc.) running `npm start`.
