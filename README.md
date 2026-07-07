# Discovery Platform — Version 1

The full platform: the Discovery Engine, the customer-facing discovery flow, and the admin dashboard — one Next.js app.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000

- **/** — landing with both doors
- **/discover** — the customer discovery flow (mobile-first, engine-driven)
- **/admin** — the admin dashboard: industries & services, questions, packages & estimate ranges, business intelligence rules, and captured leads

## How it fits together

- `lib/engine/` — the Discovery Engine (pure, industry-agnostic, unchanged from the standalone build)
- `data/config.json` — the single source of truth the admin edits and the customer flow executes
- `data/leads.json` — captured discovery sessions
- `app/api/config` — GET serves config; PUT validates with the engine's `validateConfig` before saving (broken references are rejected with exact error messages)
- `app/api/leads` — POST on flow completion; GET for the admin

The admin edits everything through forms; complex nested branching conditions have an "Advanced" JSON escape hatch (the future visual flow builder replaces exactly that escape hatch, nothing else).

## Deliberately not in V1

Authentication on /admin (add before deploying publicly), multi-tenant accounts, the drag-and-drop flow canvas, hosted embeds/QR publishing, and analytics charts (the raw lead data for them is already being captured).

## Storage note

Config and leads are JSON files on disk — perfect for local use and a single small deployment. When you deploy for real, swap `lib/store.ts` for a database (the interface is four functions).
