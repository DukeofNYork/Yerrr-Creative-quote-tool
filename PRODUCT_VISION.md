# Product Vision — Discovery & Estimation Platform

> **Read this file before making any architectural or product decision in this repo.**
> It is the source of truth for _what we are building and why_. The code is the source
> of truth for _what exists today_. When they disagree, this file states the intent.

---

## What this is

A generic, SaaS-ready **Discovery & Estimation Platform** for service-based businesses.

The platform helps a service business **capture how they think** — how they qualify leads,
estimate projects, recommend services, price work, and scope engagements — and turns that
into a **guided customer discovery experience** that produces a recommended scope, an
estimated investment range, and a qualified lead.

**YC Studios / Yerrr Creative is Workspace #1 — the first tenant, not the product.**

## What this is NOT

- **Not an AI product.** Estimation is deterministic, explainable, and auditable. Every
  result carries an audit trail of exactly which rules fired. This is a feature, not a
  limitation — businesses trust math they can inspect.
- **Not just a form builder.** The value is the decision/rules/pricing engine behind the form.
- **Not just a quote calculator.** It qualifies, profiles, recommends, and captures leads.

## The engine is the moat — protect it

The engine (`lib/engine/`) knows **nothing** about any industry. It is a stateless
interpreter over a single `BusinessConfig` object. Industries are **templates (data)**,
never code. This boundary is sacred:

- Business-specific logic lives in config, never in the engine.
- One condition primitive (`Condition` + `Operator`) drives all branching, rule triggers,
  and package matching. One evaluator, used everywhere.
- Pricing = a package base range transformed by config-defined rule effects (multiply → add
  → floor → ceiling), then rounded. No prices in code.

If a change would put industry knowledge into engine code, it is wrong. Extend the schema
instead.

## Who it serves

Creative agencies, photographers, video production, web/marketing, home services,
contractors, landscaping, roofing, architecture, interior design, consultants, attorneys,
financial advisors, event/wedding pros, medical practices — **any service business.**

## The two audiences

**Customers** who complete a discovery flow receive: a guided experience, a recommended
project scope, and an estimated investment range.

**Businesses** receive: qualified leads, customer context, consistent pricing, consistent
recommendations, and better first conversations.

## Long-term GTM

Businesses embed the discovery experience into their own website the way they embed
**Calendly, Typeform, or DocuSign.** Branded, self-serve, no code.

## Guiding principles

1. Preserve the Discovery Engine.
2. Build for configurability.
3. Keep the engine industry-agnostic.
4. Keep Yerrr Creative as Workspace #1, not the product.
5. Favor simplicity over unnecessary complexity.
6. Build the engine first, polish the experience second.
7. Recommend before coding.

## Current state (as of 2026-07-09)

- **Engine** (`lib/engine/`): excellent, fully data-driven, industry-agnostic. Keep as-is.
- **Persistence** (`lib/store.ts`): Supabase, JSON-blob-in-Postgres, no RLS, tenant
  isolation enforced in app code. Works now; will not scale to 10k tenants or organizations.
- **Multi-tenancy**: "one user = one workspace." No organization/team/roles model yet.
- **Branding**: hardcoded to a photographer's-desk theme. Only `business.name` is dynamic.
  Theme/brand is not yet in the schema.
- **Templates**: none. One creative-agency seed config that every workspace clones.
- **Publishing**: `/discover?u=<userId>` query param. No slug, no embed widget.
- **Auth**: homegrown HMAC-signed cookie sessions; PBKDF2 for users; env-var owner account.

See the full architecture review and roadmap in the project discussion / ADRs.

## Locked V1 decisions (2026-07-09)

1. **Self-serve is the goal; V1 is founder-assisted onboarding.** The admin must feel like
   answering questions about your business — never JSON, logic expressions, or code. Every
   onboarding improves the product.
2. **One business = one workspace.** No orgs/teams/roles in V1, but architect toward them:
   `workspaceId` and `slug` are decoupled from `userId` now so orgs are an additive V2 change.
3. **Beachhead = Creative Services** (showcase via Yerrr Creative), but the engine stays
   industry-agnostic. Creative is just the first template. **V1 ships five templates to prove
   genericity:** Creative Agency, Wedding/Photography, Web Design Studio, General Contractor,
   Plumbing. Same engine, no architecture changes between them — that is the V1 proof.
4. **Publishing is a core pillar, in V1.** Admin section: **Build → Preview → Publish → Share.**
   Channels = hosted link + copy + auto QR + embed snippet (`<script>` → responsive iframe).
   Email/SMS = the business shares the link themselves; we do **not** build sending infra.
5. **Public URL shape:** path-based `yourdomain.com/d/{slug}`. Subdomains/custom domains defer to V2/V3.
6. **Authoring:** guided question-shaped editors for the core moments (services, complexity,
   pricing rules, package recommendations); raw-JSON hatch hidden behind an owner flag used
   only during assisted onboarding.
7. **Storage stays on the Supabase JSON store for V1.** Relational schema + RLS is a later
   migration — kept cheap by decoupling `workspaceId`, moving lead filtering to the DB, and
   splitting draft/published config now.

## Roadmap headline

- **V1** — Any single service business looks native and publishes everywhere: `theme`/`brand`
  in schema, five industry templates, workspace/slug decoupling, draft→published, `/d/{slug}`
  routing, embed + QR, guided authoring for core moments, server-trusted estimates.
  **Goal: first 10–20 paying customers.**
- **V2** — Real SaaS spine: relational schema + RLS, Organizations → Workspaces → Members,
  version history, subdomains/white-label groundwork, deeper self-serve authoring.
- **V3** — Billing, analytics, custom domains, email/SMS sending, integrations.

**Explicitly NOT in V1:** orgs/teams/roles, RLS/relational rebuild, billing, custom domains,
email/SMS sending infrastructure, analytics dashboards, version history (beyond one
draft+published), file uploads, anything AI, and full self-serve natural-language authoring.
