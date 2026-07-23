# Future Showcase — Event Recommendation & Ticket Qualification

> **Status: NOT Version 1.** This is a future *showcase* that proves the engine's
> flexibility. It changes nothing about V1, which remains a discovery & estimation
> platform for service businesses. Do not let it distract from acquiring service
> customers first. See [PRODUCT_VISION.md](../../PRODUCT_VISION.md).

## The bigger idea

This platform is not a pricing calculator. It is a **configurable decision engine**:

- Businesses author rules. Customers answer questions. The engine evaluates the
  answers against the rules and returns the appropriate **outcome**.
- The outcome is sometimes an estimate — but it can equally be a package
  recommendation, a membership level, a ticket tier, a qualification decision, a
  course placement, or a lead-routing decision.
- **The engine does not care what industry it serves.** Only the *template*
  (questions, packages, rules, pricing) and the *presentation* change.

Permanent constraints (unchanged): **no AI**, no custom code per use case, one
deterministic engine, explainable/auditable outcomes.

## The demo — "Future Makers Summit"

Ships as a **Business Template** (data only). An attendee answers questions like:

- What are you most interested in? (Networking / Education / Entertainment / Biz Dev)
- Why are you attending?
- How many days are you attending?
- Do you want workshops? · VIP networking? · Reserved seating?
- Attending as an individual or a company?
- What budget are you comfortable with?

The engine applies the organizer's rules and recommends one **experience** (ticket
tier): General Admission · Weekend Pass · Workshop Pass · VIP Experience ·
Executive Package · Corporate Package.

The attendee sees, for example:

> **Recommended Experience — VIP Experience**
> Based on your interests, networking goals, and desired access, the VIP Experience
> offers the greatest value.
> **Estimated Investment: $750–$950**

The organizer automatically receives a qualified lead: contact info, recommended
tier, budget, company, networking interest, group size, and **the rule path that
determined the recommendation** — so they know who the attendee is before the first
conversation.

## How this runs on the CURRENT engine — validated (no engine change)

Every event concept maps onto an existing engine primitive. This is the proof that
the thesis holds with zero new business logic:

| Event concept | Existing engine primitive |
|---|---|
| Ticket tiers (GA, Weekend, VIP, Executive…) | `packages[]` — `name`, `deliverables` (what's included), `baseRange` (price), `complexityMin` (which "access band" it targets), `nextSteps` |
| Attendee questions | `questions[]` (all existing types + `showIf` branching) |
| "Access intensity" that picks a tier | `complexity` points on chosen options → complexity band selects the highest qualifying tier |
| Budget positioning | `profile` indicators/tiers (infers positioning without asking bluntly) |
| Organizer's tier/pricing rules | `rules[]` — `forcePackage`/`excludePackage` (qualification), `multiply`/`add`/`floor`/`ceiling` (pricing), `addDeliverable`/`addNextStep` |
| "Why" / the rule path | `DiscoveryResult.appliedRules` — the existing audit trail of every rule that fired |
| Estimated Investment | `DiscoveryResult.estimate` |
| Vocabulary ("Investment" vs "Ticket price", "Recommended Experience") | `presentation.copy` (already built) — no code |

**Conclusion: the current engine already supports this.** Building the demo is a
config file (the template) + a presentation choice + copy — exactly like every
other template. The 42 engine guardian tests would not change.

### One small future *presentation* consideration (not engine)

Some outcomes in the broader list are **non-priced** — e.g. a pure qualification
(qualified / not) or a course placement. The engine always computes an estimate, so
a template can model these as packages with a `$0` range, but the **presentation**
would want an optional flag to *hide the monetary estimate* and lead with the
outcome + "why". That is a presentation/copy enhancement, **not** an engine change.
Worth noting when we eventually build non-estimate showcases.

## The same engine, many applications

Service Estimates · Ticket Recommendations · Membership Qualification · Sponsorship
Packages · Course Placement · Training Recommendations · Customer Qualification ·
Lead Routing — **only the template changes.**

## Future public "Examples" page

Eventually a public gallery demonstrating real-world uses of the *same* deterministic
engine, each a different template + branding + presentation:

- 🎬 Creative Agency Estimate · 🔨 Plumbing Estimate · 🏗️ General Contractor Estimate
- 🎟️ Event Ticket Recommendation · 💼 Membership Qualification · 🏆 Sponsorship Recommendation

Positions the platform as a **guided decision engine**, not a quote calculator:
one engine asks the right questions, applies the owner's rules, and delivers the
appropriate outcome. One engine. Endless business applications.
