---
name: Feature Proposal
about: Propose a new capability, workflow, or architectural improvement
title: 'feat: [TSC-XXX] '
labels: enhancement
assignees: ''
---

## Problem Statement / Business Context

<!-- What business problem, buyer friction, or operational need does this address? Who is the primary persona (Wholesale Buyer, Admin Operator, Supplier)? -->

## Proposed Solution

<!-- Describe the requested feature, workflow, or technical improvement. Be specific about expected behavior. -->

## Impacted Surfaces

- [ ] Storefront (Public catalog, buyer inquiry, SEO)
- [ ] Admin Dashboard (Operations, catalog management, approvals)
- [ ] API & Cloudflare Workers (Backend endpoints, auth, webhooks)
- [ ] Database Schema (Drizzle schema, migrations)

## Alternatives Considered

<!-- What alternative solutions or trade-offs were evaluated? Why is the proposed solution preferred? -->

## Operational & Architectural Considerations

- **Internationalization:** Does this affect `en`, `tr`, or `ar` (RTL)?
- **Performance / Memory:** Does this impact Cloudflare Workers 128 MB limits or edge latency?
- **Security & Pricing:** Does this touch sensitive wholesale margins or pricing gates?

## Additional Context / Mockups

<!-- Attach Figma links, screenshots, wireframes, or API specifications if applicable -->
