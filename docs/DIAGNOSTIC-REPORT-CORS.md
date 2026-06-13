# Diagnostic report: Expo Web status 0 / "Failed to fetch" calling wiselista.com/api/health

**No speculative fixes have been implemented.** Only the step 1 diagnostic changes (matcher + `X-Cors-Version` header) were applied so deployment can be verified.

---

## 1️⃣ Middleware deployment check

**Current state after diagnostic change:**

- **Config matcher:** Updated from a broad regex to:
  ```ts
  export const config = { matcher: ["/api/:path*"] };
  ```
  So middleware now runs **only** for paths under `/api/`. All other routes (e.g. `/`, `/dashboard`) are **not** run through this middleware. **Note:** The previous matcher also ran `updateSession()` on every non-static request for the web app; with this diagnostic matcher, session refresh no longer runs for non-API pages. Revert the matcher after diagnostics if the web dashboard needs that behaviour.

- **Temporary header:** For every `/api/*` response (including OPTIONS), the middleware sets:
  ```ts
  X-Cors-Version: diagnostic-1
  ```

**What you must do:**

1. Deploy the Next.js app that serves **wiselista.com** (with this commit).
2. In a browser, open: **https://wiselista.com/api/health**
3. Check:
   - **Status:** 200
   - **Response headers:** `X-Cors-Version: diagnostic-1` must be present

**If `X-Cors-Version` is missing:** The deployed site is not running this middleware (e.g. wrong branch, cache, or different build). Stop and fix deployment before continuing.

---

## 2️⃣ OPTIONS preflight

**Current implementation:**

- **Detection:** `if (isApi && request.method === "OPTIONS")` → returns immediately with 204.
- **Status:** 204 No Content.
- **Headers returned (from `corsHeaders(origin)`):**
  - `Access-Control-Allow-Origin`: request `Origin` if allowed, else `"https://wiselista.com"`
  - `Access-Control-Allow-Methods`: `GET, POST, PUT, DELETE, OPTIONS`
  - `Access-Control-Allow-Headers`: `Authorization, Content-Type, X-Request-Id`
  - `Access-Control-Max-Age`: `86400`
  - `X-Cors-Version`: `diagnostic-1` (diagnostic)

**Missing vs prompt:**

- **Vary: Origin** is **not** set. The prompt requires it for correct caching of CORS responses. Not set = possible wrong cached CORS response for other origins.

**How to verify preflight:**

After deployment, from a page on your Expo origin (e.g. `https://main.xxx.amplifyapp.com`), open DevTools → Network, trigger a request to `https://wiselista.com/api/health`. You should see:

1. **OPTIONS** `https://wiselista.com/api/health` (preflight)
   - Response status: **204**
   - Response headers must include:
     - `Access-Control-Allow-Origin`: **exactly** your tab origin (e.g. `https://main.xxx.amplifyapp.com`)
     - `Access-Control-Allow-Methods`: including GET, POST, DELETE, OPTIONS
     - `Access-Control-Allow-Headers`: including Authorization, Content-Type, X-Request-Id
     - `X-Cors-Version`: diagnostic-1

2. **GET** `https://wiselista.com/api/health` (actual request)
   - Only sent if the browser accepted the preflight response.

Report exactly which headers the OPTIONS response returns (copy from DevTools).

---

## 3️⃣ Origin matching logic

**Exact logic in code:**

```ts
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (origin === "https://wiselista.com") return true;
  if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) return true;
  if (origin.includes("amplifyapp.com")) return true;
  return false;
}
```

**Coverage vs prompt:**

| Origin type              | Required? | Currently allowed? |
|--------------------------|-----------|--------------------|
| wiselista.com            | Yes       | Yes (exact `https://wiselista.com`) |
| any amplifyapp.com       | Yes       | Yes (`origin.includes("amplifyapp.com")`) |
| http://localhost:3000    | Yes       | Yes (any port via `http://localhost:`) |
| http://localhost:8081    | Yes       | Yes (same) |
| http://127.0.0.1        | Yes       | Yes (any port via `http://127.0.0.1:`) |
| LAN IPs (192.168.*)      | Yes       | **No** — not in code |

**Gap:** LAN IPs (e.g. `http://192.168.1.10:8081`) are **not** allowed. If Expo web is opened via a LAN URL, the browser will send that as `Origin` and the server will not reflect it in `Access-Control-Allow-Origin`, so the browser will block the response.

---

## 4️⃣ /api/health route

**File:** `web/src/app/api/health/route.ts`

**Current response:**

```ts
return NextResponse.json({
  ok: true,
  service: "wiselista-api",
  timestamp: new Date().toISOString(),
});
```

So it returns **200** and a JSON body with `ok: true`. This satisfies “returns 200 and ok: true”.

**Direct browser check:**

- Open **https://wiselista.com/api/health** in a new tab (same origin as wiselista.com, so no CORS).
- Expected: Status **200**, body `{"ok":true,"service":"wiselista-api","timestamp":"..."}`.
- If this fails (e.g. 404, 500, or no response), the API or deployment is broken before CORS.

---

## 5️⃣ Browser behaviour (Expo Web)

When the Expo web app (e.g. on `https://main.xxx.amplifyapp.com`) calls `fetch("https://wiselista.com/api/health")`:

1. **CORS:** The request is cross-origin, so the browser may send an **OPTIONS** preflight (for GET with default headers often no preflight; for DELETE or custom headers it will).
2. **Preflight (OPTIONS):** Browser sends OPTIONS to `https://wiselista.com/api/health` with headers such as `Origin: https://main.xxx.amplifyapp.com`, `Access-Control-Request-Method: GET`. Server must respond 2xx with `Access-Control-Allow-Origin: https://main.xxx.amplifyapp.com` (and other CORS headers). If the server doesn’t, or the origin doesn’t match, the browser **cancels** the actual request and the app sees **status 0** and **"Failed to fetch"**.
3. **Actual request (GET):** If preflight passes, browser sends GET. Response must also include `Access-Control-Allow-Origin` (and no `Access-Control-Allow-Credentials: true` unless credentials are used and the origin is allowed).

**What to check in DevTools → Network:**

- **OPTIONS** to `https://wiselista.com/api/health`: status 204, headers as above; `Access-Control-Allow-Origin` must equal the Expo tab origin exactly.
- **GET** to `https://wiselista.com/api/health`: status 200, body with `ok: true`.

**If nothing appears in Network (or only a red/canceled request):**

- Request may be blocked before send (e.g. mixed content, extension, or CORS preflight failed so the GET was never sent).
- **Status 0** and **"Failed to fetch"** with no response usually mean: preflight failed, network error, or request blocked by the browser (e.g. CORS or security policy).

---

## Summary: what is confirmed / what is not

| Step | Status | Action |
|------|--------|--------|
| 1. Middleware deployed | **Not confirmed** | Deploy, then verify 200 and `X-Cors-Version: diagnostic-1` on `GET https://wiselista.com/api/health`. |
| 2. OPTIONS preflight | **Not verified** | Simulate or inspect OPTIONS response; **Vary: Origin** is currently missing. |
| 3. Origin logic | **Documented** | LAN IPs (192.168.*) are not allowed; all other requested origins are allowed. |
| 4. /api/health | **Code OK** | Returns 200 and `ok: true`. Confirm in browser after deploy. |
| 5. Browser behaviour | **Explained** | Use DevTools to confirm OPTIONS then GET and CORS headers. |

**No further code changes have been made.** Corrective changes (e.g. add `Vary: Origin`, allow 192.168.*) should be proposed only after:

- Middleware deployment is confirmed (X-Cors-Version present).
- Preflight response headers are verified.
- /api/health returns 200 when opened directly.
- Network tab shows whether OPTIONS/GET are sent and what headers they return.
