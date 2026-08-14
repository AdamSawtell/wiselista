# PRD — Shot recipes, brief resume, capture quality gate

**Purpose:** Make on-site capture follow a professional shot recipe, keep the brief when the user leaves or retakes, and stop dark/bright photos advancing without a confirm.

**Last updated:** 15 Aug 2026

---

## Problem

Guided shoot and the customer capture link treat each room as one photo plus generic tips. Agents cannot resume a brief from job detail. Retake drops `brief_slot_id`. Brightness warnings do not block upload. Listing photos stay amateur even when Claid runs.

---

## Scope

- Shared `ShotRecipe` model in web and mobile (duplicated, same logic): stance, lens (`1×` / `0.5×` / `2×`), height, include, hide, orientation.
- House vs apartment vs townhouse exterior copy. Relabel apartment exterior slots (building / balcony) — no new room types.
- Show the four-field recipe on mobile guided shoot and the customer capture link.
- Keep `briefSlotId` on retake. “Add another” stays an extra untagged photo.
- Draft job detail: slot checklist + resume guided shoot at the first incomplete room.
- Brightness confirm before upload (customer link and mobile guided preview). Landscape copy for exterior recipes.
- Tests for recipe rules and resume step index.

---

## Acceptance Criteria

- [x] House `exterior_front` recipe is `1×` landscape, 3/4 facade stance.
- [x] Apartment `exterior_front` recipe is building/street, not “front of house” copy.
- [x] Bedroom recipes never recommend `0.5×`.
- [x] Guided shoot and customer capture show Stance, Lens, Include, Hide for the current slot.
- [x] Retake of a slot photo keeps `brief_slot_id` (replaces that slot).
- [x] Add-another photo does not send `brief_slot_id`.
- [x] Draft job detail lists brief slots as filled or missing and can open guided shoot on the first incomplete slot.
- [x] Dark or bright captures do not upload or advance until the user confirms or retakes.
- [x] Exterior slots show a landscape reminder.
- [x] Existing draft/submit/pay paths still work. No new dependencies.

---

## Out of Scope

- Native App Store / Play build or forcing the hardware lens
- Claid operation / `prompts.ts` rewrite
- New database room types or extra required slots
- Offline queue, push notifications
- UI restyle, tab-bar hiding, plan-chip colour
- Skip-reason form

---

## Test Intent

**Must test:**

- Recipe lookup: house vs apartment exteriors; bedrooms never `0.5×`
- `firstIncompleteStepIndex` with mixed filled slots
- Brightness hold when status is dark or bright
- Tip/recipe helpers still return content for every brief slot id

**Nice to have:**

- Manual walkthrough on mobile.wiselista.com after deploy

---

## Notes / References

- docs/CURSOR-WORKFLOW.md, AI_DEV_CONTRACT.md
- Review: shot recipes over generic tips; 1× default, 0.5× only when you cannot step back
