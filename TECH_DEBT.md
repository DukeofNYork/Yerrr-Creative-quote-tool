# Known Technical Debt — pre-V1

Tracked deliberately. None of this blocks the current milestone (workspace tenancy,
draft/published, publishing, lead capture + isolation — all verified against real
Supabase). Prioritized by when it will actually hurt. See [PRODUCT_VISION.md](./PRODUCT_VISION.md).

## Security (address before real customers / scale)

1. **No Row-Level Security — isolation is app-code only.** Everything uses the Supabase
   service key; tenant isolation is enforced in application code (`readLeadsByWorkspace`,
   per-workspace config keys), not Postgres RLS. One bad filter = cross-tenant leak.
   *This is the #1 item to fix before real scale or Organizations.*
2. **Client-trusted lead estimate.** `POST /api/leads` accepts the client-computed
   `result`/`estimate`. Recompute server-side from the submitted answers before storing.
3. **No rate limiting** on public `POST /api/leads`, `POST /api/admin/login`, or
   `POST /api/admin/signup` — spam / brute-force exposure.
4. **Single shared signup code.** Anyone with `ADMIN_SIGNUP_CODE` can create unlimited
   workspaces. Fine for founder-assisted onboarding; revisit for open self-serve.
5. **`/api/public-config` exposes full config by slug.** Intended (the public flow needs
   it client-side), but note it returns pricing rules/packages to anyone with the slug.

## Data model (address before meaningful signup volume)

6. **`workspaces` and `users` are single JSON-array blobs** (read-modify-write). Concurrent
   signups can lose-update. Move to real rows / atomic upserts.
7. **Owner sees ALL leads across every tenant.** Correct for a platform super-admin today,
   but once YC is truly "just workspace #1," owner-as-YC should see only YC leads, with a
   separate platform-admin view.

## Product-adjacent (fold into V1 feature work)

8. **New tenants seed from the YC/creative default config.** `provisionWorkspace` clones
   `data/config.json` (creative/video). Once templates exist, new workspaces should seed
   from a chosen industry template. *(Ties directly into the V1 Templates step.)*
9. **No slug UX.** Slugs are auto-derived from business name with numeric de-duping; owners
   can't choose, edit, or reserve their public slug yet.

## Housekeeping

10. **`middleware.ts` → `proxy.ts`.** Next 16 deprecation warning; rename before removal.
11. **Env var documentation.** Required vars: `NEXT_PUBLIC_SUPABASE_URL`,
    `SUPABASE_SECRET_KEY`, `ADMIN_SESSION_SECRET` (≥16 chars), `ADMIN_USERNAME`,
    `ADMIN_PASSWORD`, `ADMIN_SIGNUP_CODE`. The four admin vars were missing from Vercel and
    were added during verification (Preview + Production). Document in README.
12. **Preview is behind Vercel Deployment Protection.** Anonymous customers can't reach a
    protected preview — only relevant for preview testing; production is public.
