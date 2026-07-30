# Wiselista — Unit Economics Summary

**Audience:** Internal / investor briefing  
**Date:** 31 July 2026  
**Scope:** What we charge per project vs what it costs (AI, payments, compute) during trial and early volume

---

## 1. Executive summary

Wiselista sells **per-project** photo enhancement — not a subscription. Customers pay **$29 AUD (Core)** or **$49 AUD (Pro)** when they submit a listing batch.

At trial and early volume, **variable cost per project is roughly $2.50–6**, driven almost entirely by **Claid AI credits** and **Stripe fees**. Platform compute and storage are near zero while free tiers hold. That implies **gross margins of about 85–90%+** on each paid project, before fixed monthly platform costs kick in at scale.

---

## 2. What we charge

| Plan | Price (AUD) | Max photos | Retention | Extras |
|------|-------------|------------|-----------|--------|
| **Wiselista Core** | $29 | 15 | 60 days | Standard download |
| **Wiselista Pro** | $49 | 25 | 90 days | Share + capture features |

Pricing is coded in `web/src/lib/plans.ts` and shown on the marketing site as fixed per-project AUD pricing. There is no monthly seat fee.

---

## 3. Cost stack (what we pay)

### 3.1 AI editing — Claid.ai (primary COGS)

Each photo is processed via Claid’s REST API with Wiselista’s real-estate preset:

- Upscale (`smart_enhance`)
- Decompress
- HDR + light/colour adjustments
- Resize to 150% (free when bundled with other ops)
- Polish **off** (saves 1 credit per image)

| Component | Credits per photo (typical) |
|-----------|-----------------------------|
| Upscale | 1–3 (higher if output is large) |
| Light / colour + HDR | 1 |
| Resize | 0 (bundled) |
| **Working estimate** | **~2–4 credits / photo** |

**Trial allowance:** Claid includes **50 free API credits**. At ~3 credits/photo that covers about **16 photos** — roughly one Core project — before paid API credits are required.

**Dollar cost of credits:** Claid separates web credits from API credits. Public API pack pricing is not a fixed published rate card; packs are purchased in-dashboard / via Claid. Using web top-up economics as a **proxy** (~$0.03–0.04 USD per credit):

| Project | Photos | AI cost (est.) |
|---------|--------|----------------|
| Core | 15 × ~3 credits | **~$1.40–1.80** |
| Pro | 25 × ~3 credits | **~$2.30–3.00** |
| Stress case (~5 credits/photo) | 15 / 25 | **~$2.50–3 / ~$4–5** |

Exact AUD AI cost should be confirmed after the first paid API pack purchase.

### 3.2 Payments — Stripe

Assumes standard Australian domestic card rates (~1.7% + A$0.30). International or premium cards may be higher.

| Plan | Stripe fee (est.) |
|------|-------------------|
| Core $29 | **~$0.80** |
| Pro $49 | **~$1.15** |

### 3.3 Compute, storage, hosting

Stack: Supabase (DB / auth / storage) + Vercel or Amplify (API / web) + Expo (mobile).

| Item | Trial / low volume | When it grows |
|------|--------------------|---------------|
| Supabase | Free tier | ~$25/mo Pro |
| Vercel / Amplify | Free / included | Usage-based |
| Expo EAS | Free tier | Paid builds if volume rises |
| Domain / SSL | ~$10–15/yr | Same |

**Marginal compute per project** at pilot volume is effectively **~$0**. Claid takes ~20 seconds per photo of serverless time; that only matters once usage leaves free tiers. Fixed platform cost is better thought of as a monthly overhead, not a per-job line item, until volume is material.

---

## 4. Per-project P&L (trial / early volume)

| | Core ($29) | Pro ($49) |
|--|------------|-----------|
| **Revenue** | $29.00 | $49.00 |
| AI (Claid) | $1.50–3.00 | $2.50–5.00 |
| Stripe | ~$0.80 | ~$1.15 |
| Compute / storage | ~$0 | ~$0 |
| **Estimated COGS** | **~$2.50–4** | **~$4–6** |
| **Contribution margin** | **~$25–26.50** | **~$43–45** |
| **Gross margin %** | **~85–90%+** | **~85–90%+** |

Figures are AUD-oriented for revenue and Stripe; AI credits are USD-priced and convert at the prevailing rate. Margins remain strong under that conversion.

---

## 5. Trial-period specifics

| Factor | Implication |
|--------|-------------|
| 50 free Claid API credits | ~1 Core project’s worth of AI at typical credit use |
| Free Supabase / hosting tiers | Near-zero platform burn until MAU / storage / function limits hit |
| Stripe | Still charged on live payments (test mode: $0) |
| Rate limits | Claid trial historically tighter (e.g. 1 RPS / 30 RPM); paid API higher |

During pure product trial with mock AI (`CLAID_API_KEY` unset), AI COGS is **$0**. With the key set, real Claid usage applies as above.

---

## 6. Sensitivity and open items

1. **Confirm Claid API $/credit** after purchasing a self-serve or volume pack — this is the largest uncertainty in the model.
2. **Measure actual credits per photo** from production logs (upscale size drives variance).
3. **Stripe mix** (domestic vs international) will nudge payment fees.
4. **Reprocess / retries** (user re-runs a photo) consume extra credits; not included in the base case.
5. At scale, add fixed monthly platform cost and allocate per job once free tiers are exceeded.

---

## 7. Bottom line

Wiselista’s price points (**$29 / $49 AUD per project**) sit well above current variable cost (**roughly a few dollars** for AI + Stripe). Unit economics at trial and early volume are healthy: high contribution per job, low fixed burn, and AI cost that scales linearly with photos — not with subscriptions or idle infrastructure.

The main action to harden this paper into a board-ready model is to **lock Claid API credit pricing and sample real credit burn per photo** from a handful of live Core and Pro jobs.
