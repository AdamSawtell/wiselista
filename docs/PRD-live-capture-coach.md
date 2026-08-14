# PRD — Live capture coach (Expo Go / native)

**Purpose:** One live instruction in the viewfinder. Hold the shutter when the phone is tilted. No new libraries.

**Last updated:** 15 Aug 2026

---

## Problem

The recipe card is read before the camera. In the viewfinder the user still sees tip bullets and can fire while the horizon is tilted. Easy capture means one command, and silence when they are level.

---

## Scope

- Native `CameraView` only (Expo Go / iOS / Android). Website picker unchanged.
- One overlay line: tilt first, then “rotate sideways” for landscape recipes, else the recipe line.
- Soft-hold shutter when tilted on portrait rooms. “Capture anyway” remains.
- Landscape is a cue only (app stays portrait-locked; no new orientation library).
- Keep after-snap brightness “Use anyway” gate. No live brightness.

---

## Acceptance Criteria

- [x] Portrait rooms: tilted phone shows one tilt command and disables Capture.
- [x] Portrait rooms: level phone shows “Level” plus the recipe overlay line; Capture is enabled.
- [x] Landscape recipes: portrait hold shows “Rotate the phone sideways” and does not apply portrait tilt hold.
- [x] “Capture anyway” still takes the photo when held.
- [x] Web camera path is unchanged (picker + after-snap light gate).
- [x] Unit tests cover coach priority and device hold.
- [x] No new dependencies.

---

## Out of Scope

- Live brightness from preview frames
- Web live viewfinder / getUserMedia
- Lens lock, App Store / EAS
- Voice, ghost frames, AI in the viewfinder
- Unlocking app orientation

---

## Test Intent

**Must test:** `getDeviceHold`, `getLiveCoach` priority (tilt > rotate > ok), hold shutter only for portrait tilt.

**Nice to have:** Expo Go walkthrough on a physical phone.
