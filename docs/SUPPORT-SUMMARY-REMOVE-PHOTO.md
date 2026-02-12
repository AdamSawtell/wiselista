# Support summary: Remove photo still not working (mobile)

**Issue:** On the mobile app (Expo, user is on **Apple/iOS**), tapping **Remove** on a photo in a draft job does not remove the photo. The feature still does not work after multiple attempted fixes.

**Date:** February 2025

---

## 1. Expected behaviour

- User opens a **draft** job, sees a list of photos.
- User taps **Remove** on a photo → confirms in the alert → the photo is deleted (DB row + storage file) and the list refreshes.
- **Web (desktop)** delete works when using the same API with cookie auth.

---

## 2. Architecture (relevant to Remove)

- **Mobile app:** Expo (React Native), can run as native (Expo Go / dev client) or web (browser).
- **API:** Next.js app hosted at **https://wiselista.com** (separate from the Expo hosting URL, e.g. `main.xxx.amplifyapp.com`).
- **Remove request:**  
  `DELETE https://wiselista.com/api/jobs/{jobId}/photos/{photoId}`  
  with header: `Authorization: Bearer <Supabase access_token>`.
- **Auth:** Mobile uses Supabase Auth; the access token is sent as Bearer. The API uses `getApiUser(request)`, which supports both Bearer (mobile) and cookie (web).

---

## 3. What has been tried

| Change | Purpose |
|--------|--------|
| **Delete API uses Bearer auth** | `DELETE /api/jobs/[id]/photos/[photoId]` was updated to use `getApiUser(request)` and a token-based Supabase client so mobile (Bearer) is accepted, not only web (cookies). |
| **CORS for /api** | Middleware added so `OPTIONS` and actual responses for `/api/*` include CORS headers (e.g. `Access-Control-Allow-Origin` for the Expo web origin). This was for the case where the app runs in the browser and calls wiselista.com. |
| **Mobile: correct API URL** | Mobile uses `APP_URL` from `EXPO_PUBLIC_APP_URL` (fallback `https://wiselista.com`). Code builds the delete URL as `APP_URL + /api/jobs/.../photos/...` and strips trailing slashes. |
| **Mobile: 20s timeout** | AbortController timeout increased to 20s so slow networks don’t abort too early. |
| **Mobile: error handling** | Alerts show specific messages: 401 → “Sign out and sign in again”; timeout → “Request timed out… Check EXPO_PUBLIC_APP_URL”; server error → body `error` or status. |
| **API: 401 message** | API returns a clear JSON body on 401 so the app can show “Sign out and sign in again”. |
| **API: logging** | Server logs `[DeletePhoto]` with `jobId`, `photoId`, `hasBearer` at start; then “Unauthorized”, “job not found”, “photo not found”, or “success”. |

Despite these changes, **Remove still does not work** for the user on mobile (Apple).

---

## 4. What the user sees

- User has not specified the exact behaviour: e.g. no visible reaction, or an alert (and if so, which message), or a spinner that never finishes.
- Knowing the **exact** message (e.g. “Remove failed”, “Could not remove photo”, “Request timed out”, “Session expired…”) would narrow down whether the failure is: request not sent, wrong host, 401, timeout, or 4xx/5xx from the server.

---

## 5. How to verify (for support)

**A. Confirm the API is reachable**

- From a machine with `curl`:  
  `curl -i -X DELETE "https://wiselista.com/api/jobs/<JOB_ID>/photos/<PHOTO_ID>" -H "Authorization: Bearer <VALID_SUPABASE_ACCESS_TOKEN>"`  
  Replace `<JOB_ID>`, `<PHOTO_ID>`, and `<VALID_SUPABASE_ACCESS_TOKEN>` (e.g. from Supabase Auth or a test session).
- Expected: **200** with `{"ok":true}` if the job is draft and the photo exists and belongs to that job; **401** if token is missing/invalid; **404** if job/photo not found.

**B. Confirm mobile is calling the right host**

- The app must be built with **`EXPO_PUBLIC_APP_URL=https://wiselista.com`** (or whatever host serves the Next.js API). If this env var is wrong or missing at build time, the app may be calling a different URL (e.g. the Expo host) where no DELETE handler exists → 404 or “Load failed”/timeout.
- Rebuild and reinstall the app after changing `EXPO_PUBLIC_APP_URL`.

**C. Check server-side logs**

- In **AWS CloudWatch** (or the log destination for the app that serves **wiselista.com**), search for **`[DeletePhoto]`** around the time the user taps Remove.
- If **no** `[DeletePhoto]` line appears → the request is not reaching this API (wrong URL, network, or CORS blocking the preflight/request in the browser case).
- If **`[DeletePhoto] Unauthorized`** appears → token is missing or invalid (e.g. expired session; suggest sign out and sign in again, or inspect token on the client).
- If **`[DeletePhoto] success`** appears but the mobile list doesn’t update → issue is on the client (e.g. not refetching or not updating UI).

**D. CORS (only if app runs in browser)**

- If the app is opened in **Safari/Chrome** (Expo web) and the API is on **wiselista.com**, the browser sends a preflight `OPTIONS` request. The API middleware must respond with appropriate CORS headers. If not, the browser may block the DELETE and the user may see a network/CORS error or “Load failed”.

---

## 6. Key file references

| What | Where |
|------|--------|
| Delete API (Bearer + cookie) | `web/src/app/api/jobs/[id]/photos/[photoId]/route.ts` |
| API auth (Bearer vs cookie) | `web/src/lib/api-auth.ts` |
| Mobile Remove handler + URL | `mobile/src/screens/JobDetailScreen.tsx` (`handleDeletePhoto`, `APP_URL`) |
| Mobile API base URL | `mobile/src/lib/supabase.ts` (`APP_URL` from `EXPO_PUBLIC_APP_URL`) |
| CORS middleware | `web/src/middleware.ts` |
| Viewing API logs | `docs/VIEW-API-LOGS-AMPLIFY.md` |

---

## 7. Suggested next steps for support

1. **Get exact behaviour** from the user when they tap Remove: no response, spinner only, or alert text (and copy it).
2. **Confirm API URL** used by the built app (e.g. log or debug screen showing `APP_URL` or the full delete URL).
3. **Reproduce** with a test token: call `DELETE https://wiselista.com/api/jobs/{id}/photos/{id}` with a valid Bearer token and confirm 200 + `{"ok":true}`.
4. **Check CloudWatch** for `[DeletePhoto]` when the user tries Remove; use that to decide if the failure is before the API (no log), at auth (Unauthorized), or after (success but client not updating).
5. If the request never reaches the API, verify **EXPO_PUBLIC_APP_URL** in the build and that the device can reach **wiselista.com** (no firewall/VPN blocking).

---

## 8. Other issues encountered (same project)

- **Photos not showing in Supabase after adding on mobile** – Addressed by using Bearer auth on the upload API and (for “Choose from library”) ensuring the same API is used; “Take photo” was reverted to direct Supabase upload on iOS.
- **“Load failed”** – User is on Apple; handling was added for failed job load (try/catch, “Try again”) and for failed thumbnails (placeholder instead of broken image). Exact source of “Load failed” text was not confirmed.
- **Jobs/photos not syncing across devices** – Refetch on screen focus was added so the jobs list and job detail refresh when the user returns to the screen.

This document focuses on **Remove photo not working** for support; the other items are listed only for context.
