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

- **Not an AI product.** (See Principle 1 — this is permanent.)
- **Not just a form builder.** The value is the decision/rules/pricing engine behind the form.
- **Not just a quote calculator.** It qualifies, profiles, recommends, and captures leads.

## Permanent product principles

These are settled. Every architectural and product decision must reinforce them. Do not
reopen them without an explicit, deliberate decision recorded here.

### Principle 1 — This is NOT an AI product.

The platform is **deterministic and rules-based**. The business owner teaches it how they
qualify customers, scope projects, and estimate pricing through **guided configuration**.
There is **no AI** in any part of the product:

- onboarding · configuration · pricing · qualification · recommendations
- customer results · copy generation · business logic

Every result is **predictable, explainable, and auditable** — derived entirely from the
owner's own rules, with an audit trail of exactly which rules fired. **The value is not
intelligence; the value is that the platform consistently follows the owner's process.**
(Implication: guided authoring maps answers → config deterministically. Copy is written by
the owner or shipped in templates — never generated. No LLM anywhere in the runtime.)

### Principle 2 — The engine never changes.

Every service business runs on the **exact same engine**. The only thing that varies is how
the experience is **presented** to the customer. If a need seems to require changing the
engine, it belongs in config or the presentation layer instead. The engine is frozen and
protected by the guardian test net (`lib/engine/__tests__`).

### Principle 3 — Presentation Styles, not "themes"; independent from templates.

We build **Presentation Styles** (Experiences), not themes — first-class, opinionated,
mobile-first customer experiences, each native to the industries it serves. Presentation
determines **how it feels**; it **never** affects business logic.

**A Business Template and a Presentation are independent concepts:**

- **Template** = industries, questions, packages, rules, pricing, workflow (the *content*).
- **Presentation** = layout, visuals, typography, interaction, branding (the *experience*).

Any template can run under any presentation — a plumber could choose Premium, a photographer
could choose Basic Dark. **The engine never cares.** A template only *recommends* a presentation.

**The six V1 Presentation Styles** (few, polished, intentional — never dozens):

| Style | Default? | For | Feel |
|---|---|---|---|
| **Basic Light** | ✅ **Default** | Almost any service business — consultants, lawyers, accountants, advisors, IT, coaches | Clean, modern, fast, professional, mobile-first |
| **Basic Dark** | | Same as Basic Light, dark palette | Identical experience; visuals only — no new layout or interactions |
| **Creative Studio** | | Video, photography, agencies, designers, creatives | Immersive notebook — a **premium** style, no longer the default |
| **Trades** | | Plumbing, HVAC, electrical, roofing, landscaping, remodeling | Blueprint-inspired, organized, built around planning a job |
| **Premium** | | Jewelers, interior design, luxury travel/weddings, high-end services | Elegant, minimal, luxury consultation |
| **Healthcare** | | Medical, dental, veterinary, wellness, physical therapy | Calm, trustworthy, clean |

**Onboarding** asks the owner what *type of business* they run, applies that industry
**template**, and **auto-recommends** the fitting presentation (Plumbing→Trades,
Photography→Creative Studio, Consultant/Accountant/Law→Basic Light, Jeweler→Premium,
Dental→Healthcare). The owner can change it later, but never has to make a design decision
on day one.

**Basic Light is the Foundation Presentation** — the experience every business gets by
default. It must be clean, modern, professional, fast, extremely mobile-friendly, and
timeless: if an owner never changes anything, they should still be **proud to send clients
there.** **Basic Dark** is the same foundation in a dark palette — same layout, interactions,
and components, palette only. **Creative Studio** is the **flagship** immersive presentation —
handcrafted and memorable — and is no longer the platform default.

The value is **not unlimited customization** — it is an exceptional, ready-to-use discovery
experience that feels professional out of the box, powered by the same deterministic engine.

### Principle 4 — Focused on service businesses that fit the discovery workflow.

The platform is for service businesses that need to: **qualify a client → understand project
scope → learn about budget → recommend the right service/package → produce a rough estimate →
capture the lead → start the conversation.** If a business does not fit that workflow, it is
**not a V1 target.** The goal is not to support every industry — it is to be the **best**
discovery and estimation platform for service businesses. Stay focused and opinionated.

### Principle 5 — Every Presentation Style is a premium product, never a "skin."

Each style must feel like it could **stand on its own as a premium product** — thoughtfully
designed for the businesses it serves, not a recolor of the same page. We build a new style
only when it **meaningfully improves the customer experience for a real group of service
businesses**, never merely because it looks different. Prefer **six exceptional experiences
over twenty mediocre ones**: once the V1 six ship, we **stop** and let real customers use the
platform before adding more.

### Presentation build order (locked)

1. Presentation schema (additive to `BusinessConfig`; engine untouched).
2. Formalize **Creative Studio** as a Presentation Style (today's UI becomes `creative-studio`).
3. Preserve Yerrr Creative by explicitly assigning it Creative Studio (backfill `ws:main:*`).
4. Build the **Foundation Presentation (Basic Light)** — the new default.
5. Add **Basic Dark** as a palette variation of Basic Light.
6. Build **Trades**.
7. Build **Premium**.
8. Build **Healthcare**.

Then **stop** and let real customers use the platform before adding any new style.

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

Service businesses that fit the discovery workflow (Principle 4), grouped by the five
Presentation Styles: **Creative Studio, Professional, Trades, Premium Services, Healthcare.**
Not "any business" — specifically those that qualify a client, scope a project, gauge budget,
recommend a service, produce an estimate, and capture the lead.

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
- **Presentation**: hardcoded to the Creative Studio (notebook/desk) look. Only
  `business.name` is dynamic. Presentation Styles + brand not yet in the schema (proposal
  pending approval — see Principle 3).
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

- **V1** — Any service business looks native and publishes everywhere: **Presentation Styles**
  + brand in schema (5 styles), industry templates, workspace/slug decoupling, draft→published,
  `/d/{slug}` routing, embed + QR, guided authoring for core moments, server-trusted estimates.
  **Goal: first 10–20 paying customers.**
- **V2** — Real SaaS spine: relational schema + RLS, Organizations → Workspaces → Members,
  version history, subdomains/white-label groundwork, deeper self-serve authoring.
- **V3** — Billing, analytics, custom domains, email/SMS sending, integrations.

**Explicitly NOT in V1:** orgs/teams/roles, RLS/relational rebuild, billing, custom domains,
email/SMS sending infrastructure, analytics dashboards, version history (beyond one
draft+published), file uploads, anything AI, and full self-serve natural-language authoring.
