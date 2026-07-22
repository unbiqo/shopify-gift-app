# Seedform — Influencer Gifting OS for Shopify

An embedded **Shopify app** that automates influencer gifting end to end. Brands create branded
**gift campaigns**, share a claim link, and let influencers self-claim products — while the app runs
inventory checks, generates Shopify **Draft Orders** instantly, and syncs shipment status back to a
live dashboard. It turns hours of manual DM-and-spreadsheet gifting into a repeatable flow.

> **Stack:** React Router 7 · Shopify App Bridge · Shopify App (React Router) · Prisma + PostgreSQL · Node · Vercel

---

## What it does

**For the brand (embedded Shopify admin):**
- Create gift **campaigns** with their own branding (brand color, welcome message, CTA, optional
  video and custom question).
- Attach products to a campaign; the app keeps product title/image/inventory/variant in sync.
- Get a unique, shareable **claim link** (`/claim/:slug`) per campaign.
- Set guardrails per link: item limit, order limit per link, email opt-in and consent text.
- Watch claims and shipment status update live on a **dashboard**.

**For the influencer (public claim page):**
- Open the claim link, pick the gifted product, confirm shipping details, and claim in one flow.
- Inventory-aware checks prevent claiming out-of-stock items.
- A Shopify **Draft Order** is generated instantly for the brand to fulfill.

**Operational plumbing:**
- Shopify **webhooks** for order created/cancelled, fulfillment created, draft-order deleted, app
  lifecycle, scope updates, and **GDPR compliance** requests.
- **Billing** via the Shopify billing API.
- Session + campaign persistence on **Prisma / PostgreSQL** (`@shopify/shopify-app-session-storage-prisma`).
- GA4 + Vercel Analytics instrumentation.

---

## Architecture

```
Shopify Admin (embedded, App Bridge)
        │  create & manage campaigns
        ▼
React Router 7 app  ──►  Prisma / PostgreSQL  (sessions, campaigns, products, claims)
        │                        ▲
        │  /claim/:slug          │ webhooks: orders, fulfillment, compliance, lifecycle
        ▼                        │
Public claim page  ──►  Shopify Draft Order  ──►  live dashboard shipment sync
```

Key routes (`app/routes/`):

| Route | Purpose |
|---|---|
| `app._index.jsx`, `dashboard.jsx` | Embedded admin: campaigns + live claim/shipment dashboard |
| `app.campaigns.new.jsx` | Create a gifting campaign |
| `claim.$slug.jsx` | Public influencer claim landing page |
| `api.create-gift.jsx`, `api.claims.jsx` | Claim + draft-order generation API |
| `api.products.jsx`, `api.orders.jsx`, `api.sync-order.jsx` | Product/order sync |
| `webhooks.*.jsx` | Order, fulfillment, lifecycle, and GDPR compliance webhooks |
| `billing.jsx` | Shopify billing |

---

## Getting started

```bash
npm install
npm run setup      # prisma generate && prisma migrate deploy
npm run dev        # shopify app dev
```

You'll need a [Shopify Partner account](https://partners.shopify.com/signup), a development store,
and the [Shopify CLI](https://shopify.dev/docs/apps/tools/cli/getting-started). Configure the
Postgres connection and Shopify API credentials via environment variables (see `.env.example`).

---

## Notes

Bootstrapped from Shopify's official React Router app template, then built out into a full gifting
product: campaign model, public claim flow, draft-order automation, webhook pipeline, billing, and
dashboard. Deployed on Vercel with Prisma-backed Postgres.
