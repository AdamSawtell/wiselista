# AI partner research — best fit for Wiselista property photo enhancement

Research on API-based AI image enhancement for real estate / property listings, and recommended solution.

---

## What we need

- **Input:** Property photo (URL or upload) — we have signed Supabase URLs per photo.
- **Output:** Enhanced image (lighting, color, clarity) suitable for listings; no generative staging or heavy edits.
- **Flow:** Send job → get enhanced image(s) back → save to storage, set `edited_key`, mark job ready.
- **Optional:** Room-specific presets or prompts (we have `prompts.ts`; some APIs use operations instead of text prompts).

---

## Top options compared

| Partner | Real estate fit | Input | Output | Pricing | Best for |
|--------|------------------|--------|--------|---------|----------|
| **Claid.ai** | ✅ Documented real estate guide, “enhance without over-editing” | **URL** (public or signed) | Response `tmp_url` → download | Credits (1–6/image), 50 free trial | **Easiest integration** — single POST with our signed URL |
| **Autoenhance.ai** | ✅ Used by ListingPix, OnTheMarket, Madesnappy; HDR/perspective/color | Upload file → order → webhook | Download enhanced from API | Tiered (50–250+/month), free API key | **Strongest RE track record**; async webhook flow |
| **fal.ai** | General image models | URL + optional prompt | Pay-per-use | Per image / MP | Prompt-driven edits; less “listing enhancement” focused |
| **Deep-Image.ai** | Real estate use case | — | — | — | More virtual staging; not primary for enhancement |

---

## Recommended solution: **Claid.ai**

### Why Claid first

1. **URL in, URL out** — We already have signed Supabase URLs from `buildAIRequests(jobId)`. Claid accepts `input: "https://..."` and returns `output.tmp_url`. No upload step; minimal code.
2. **Real estate documented** — [Real estate guide](https://docs.claid.ai/guides/real-estate): HDR, upscale, resize, “enhance without over-editing,” consistent style. Matches Wiselista’s use case.
3. **Single synchronous call** — `POST /v1/image/edit` with `input` + `operations`; response includes `tmp_url`. We download that, upload to our bucket, set `edited_key`. No webhook required for MVP.
4. **Free trial** — 50 credits to test; then credit-based plans.
5. **Operations, not prompts** — Claid uses operations (restorations, resizing, adjustments.hdr). We can use one “property enhancement” preset for all photos, or map room type to different operation presets later. Our `prompts.ts` can stay for future prompt-based APIs or for “preset name” mapping.

### Claid API (summary)

- **Endpoint:** `POST https://api.claid.ai/v1/image/edit`
- **Auth:** `Authorization: Bearer YOUR_API_KEY`
- **Body:** `{ "input": "<signed_url>", "operations": { "restorations": { "upscale": "photo" }, "resizing": { "fit": "bounds", "width": "150%", "height": "150%" }, "adjustments": { "hdr": { "intensity": 100, "stitching": false } } }, "output": { "format": { "type": "jpeg", "quality": 85 } } }`
- **Response:** `data.output.tmp_url` — temporary URL of enhanced image (download and re-upload to our storage).
- **Rate limits:** 1 RPS, 30 RPM on trial; higher on paid plans.

### Integration outline

1. **Env:** `CLAID_API_KEY` (from [Claid](https://claid.ai/login) → Create API key).
2. **In `processJobWithRealAI`:** Call `buildAIRequests(jobId)`. For each request, `POST` to Claid with `input: r.originalUrl` and real-estate operations (e.g. from their guide). Read `tmp_url`, download image, upload to Supabase storage as `edited_key`, update `photos.edited_key`. When all done, set job `status: "ready"`.
3. **Optional:** Map `roomType` to different Claid operation presets (e.g. exterior: more HDR, interior: more brightness) in a small config; or use one preset for all.

---

## Alternative: **Autoenhance.ai**

- **Best when:** You want the same pipeline as ListingPix / major real estate brands (HDR merging, perspective correction, color correction) and are OK with an async flow.
- **Flow:** Register image → upload file to `upload_url` → add to order → process → **webhook** when done → download enhanced image. More steps and webhook handling; better for high volume and their specific quality pipeline.
- **Pricing:** Tiered (e.g. 50–250 images/month Essential); free API key to start.
- **Docs:** [Autoenhance API](https://docs.autoenhance.ai), [Webhooks](https://docs.autoenhance.ai/webhooks).

---

## Summary

| Priority | Partner | Reason |
|----------|---------|--------|
| **1. Implement first** | **Claid.ai** | URL in/out, single sync call, real estate guide, 50 free credits. Fits `buildAIRequests` + `processJobWithRealAI` with minimal code. |
| **2. Consider later** | **Autoenhance.ai** | Strongest real estate adoption; async upload + webhook flow; better for scaling and their HDR/perspective pipeline. |

**Next step:** Add Claid integration to `web/src/lib/ai-adapter.ts` (e.g. `processJobWithClaid`), call it from `processJobWithRealAI` when `CLAID_API_KEY` is set, and keep mock as fallback. See `docs/AI-REVIEW.md` for where to plug in.
