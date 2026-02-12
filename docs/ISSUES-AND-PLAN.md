# Current issues and how we plan to fix them

**Last updated:** February 2025

---

## Issue 1: Remove photo not working (Expo Web in browser)

**What happens:** In the Expo Web app (opened in a browser), tapping **Remove** on a photo gives status **0** and **"Failed to fetch"**. Test API shows the same.

**Root cause:** The browser blocks the request because of **CORS**. The request is cross-origin (e.g. from `https://main.xxx.amplifyapp.com` to `https://wiselista.com`). If the server doesn’t return the right CORS headers (especially `Access-Control-Allow-Origin` matching the request `Origin`), the browser never sends the real GET/DELETE and the app sees status 0.

**What we’ve done:** Middleware was updated to reflect the request `Origin` for allowed origins, set `Vary: Origin`, `Access-Control-Allow-Credentials: true`, and the right methods/headers. OPTIONS returns 204 with the same CORS headers.

**Plan to fix:**
1. **Deploy the Next.js app** that serves **wiselista.com** with the current `middleware.ts` (CORS + matcher fix below).
2. **Verify in DevTools:** Open Expo Web → Network → click Test API. You must see:
   - **OPTIONS** to `https://wiselista.com/api/health` → 204 with `Access-Control-Allow-Origin: <your Expo origin>`.
   - **GET** to `https://wiselista.com/api/health` → 200 with the same CORS header.
3. If Test API then shows **ok: true, status: 200**, try **Remove** again; it should work. If not, use the debug panel (rid, status, body) and CloudWatch log with that `rid` to see the server-side error.

---

## Issue 2: Web dashboard session broken (regression)

**What happens:** The **web app at wiselista.com** (dashboard, login, job pages) may log users out or fail to see a valid session.

**Root cause:** The middleware **matcher** was changed to **only** `["/api/:path*"]` for CORS diagnostics. So middleware (and thus `updateSession()`) **no longer runs** for `/`, `/dashboard`, `/login`, etc. Session refresh only runs for `/api/*`, so the rest of the site doesn’t get refreshed cookies and auth can break.

**Plan to fix:**
1. **Revert the matcher** so middleware runs on all routes that need session refresh (same as before: everything except `_next/static`, `_next/image`, favicon, static assets). **Done:** matcher restored in `web/src/middleware.ts`. CORS is still applied only when `path.startsWith("/api/")`.
2. Deploy the web app. Then the web dashboard and login work again, and the API still gets CORS for Expo Web.

---

## Issue 3: Remove photo on native app (Expo Go / device)

**What happens:** If the user uses the **native** app (Expo Go or built app on a device), Remove might still not work.

**Root cause:** Not CORS (native has no browser CORS). Possible causes:
- Request never reaches the server (wrong `EXPO_PUBLIC_APP_URL`, network, or firewall).
- 401 (token missing or expired).
- Timeout or other server error.

**Plan to fix:**
1. Ensure the **native** build has `EXPO_PUBLIC_APP_URL=https://wiselista.com`.
2. In the app, use the **debug panel**: after tapping Remove, check **Last delete** (rid, status, body, error). If status is 0 → request didn’t reach the API (URL/network). If status 401 → re-login. If status 4xx/5xx → use the body and CloudWatch log for that `rid` to fix the API or auth.
3. No code change until we have one of those outcomes from the debug panel.

---

## Issue 4: Photos not showing / wrong count in Supabase

**What happens:** User adds photos (from app or camera) but the count in Supabase (Storage or `photos` table) doesn’t match.

**Root cause (addressed in code):** Upload API used to use cookie-only auth, so mobile (Bearer) got 401 and uploads didn’t create rows. We switched upload to `getApiUser(request)` (Bearer + cookie). Camera on iOS was reverted to direct Supabase upload so it doesn’t depend on the API.

**Plan to fix:**
1. Ensure the **web** app (wiselista.com) is deployed with the **upload** route that uses Bearer (current code).
2. After adding photos from **Choose from library**, the app shows “Photos added” and refetches; if that works, Storage and DB should stay in sync.
3. If the count is still wrong, check CloudWatch for `[UploadPhoto]` (hasFile, fileSize) to see if the server is receiving the file. If `hasFile: false`, we need to fix how the client sends the file (e.g. FormData from Expo Web).

---

## Issue 5: “Load failed” on Apple

**What happens:** User (on Apple) sometimes sees “Load failed” (e.g. on job detail or thumbnails).

**Root cause:** Can be (1) job/photos fetch throwing and showing a generic error, or (2) image thumbnails failing to load (e.g. signed URL) and the native/Web Image component showing “Load failed”.

**What we’ve done:** We added try/catch around `fetchJob`/`fetchJobs`, a “Try again” flow, `failedThumbnails` so we don’t render the Image for failed thumbnails (avoid the system “Load failed” view), and an ErrorBoundary.

**Plan to fix:**
1. If it still appears, note **where** (job list, job detail, or a specific thumbnail). If it’s thumbnails, signed URLs from Supabase may be failing (expiry, CORS on Storage, or wrong key). Next step would be to add `expo-image` or a fallback for failed image loads.
2. No further code change until we have the exact screen and context.

---

## Issue 6: Mobile build failures

**What happened:** Builds failed with “Duplicate declaration: theme” and with a syntax error (nullish coalescing + logical operator).

**What we did:** Removed the duplicate `theme` import in `App.tsx` and moved all imports to the top; fixed the debug panel expression with parentheses for `??` and `||`.

**Status:** Fixed. New builds should pass. If a build still fails, the log will point to the exact file/line.

---

## Summary: what to do next (in order)

| # | Action | Why |
|---|--------|-----|
| 1 | **Fix middleware matcher** so it runs on all non-static routes again (not only `/api/*`). Keep CORS only for `/api/*`. | Restores web dashboard session; keeps CORS for Expo Web. |
| 2 | **Deploy the Next.js app** that serves **wiselista.com** (with the matcher fix and current CORS). | So both the dashboard and the API (with CORS) are live. |
| 3 | **Verify in browser:** Open Expo Web → Test API. Expect ok: true, status: 200. Then try Remove. | Confirms CORS is fixed for Expo Web. |
| 4 | If Remove still fails (native or web), use **debug panel** (rid, status, body) and **CloudWatch** (search for that `rid`) to see the real error. | No more guessing; fix the specific failure. |

No speculative fixes beyond the matcher fix. Everything else is verify-first, then fix based on what you see.
