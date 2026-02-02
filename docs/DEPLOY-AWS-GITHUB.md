# Deploy Wiselista to AWS (build only from GitHub)

Deploy the **web** app to **AWS Amplify Hosting** so that builds run **only** when you push to GitHub. No manual deploys from your machine.

---

## Prerequisites

- **GitHub:** Wiselista repo pushed to GitHub (e.g. `your-org/wiselista` or `your-user/wiselista`).
- **AWS:** An AWS account and access to the Amplify console.
- **Env:** Supabase and (optional) Stripe values ready to paste into Amplify.

---

## 1. Push repo to GitHub

If the repo is not on GitHub yet:

1. Create a new repository on GitHub (e.g. `wiselista`).
2. In your local repo:
   ```bash
   git remote add origin https://github.com/YOUR_ORG/wiselista.git
   git push -u origin main
   ```
   (Use your branch name if not `main`.)

---

## 2. Create Amplify app and connect GitHub

1. Sign in to **AWS** and open **[Amplify console](https://console.aws.amazon.com/amplify/)**.
2. Click **Create new app** → **Host web app**.
3. Under **Get started**, choose **GitHub** (or **GitHub Enterprise**), then **Continue**.
4. Authorize Amplify to access GitHub if prompted.
5. On **Add repository branch**:
   - **Repository:** select your Wiselista repo.
   - **Branch:** select the branch to deploy (e.g. `main`).
   - **Monorepo:** turn **on** “Monorepo – connect a single app”.
   - **App root:** enter **`web`** (the folder that contains the Next.js app).
6. Click **Next**.
7. **Build settings:** Amplify will use the **`amplify.yml`** in your repo (already set for `appRoot: web`). Do **not** override with console settings unless you need to.
8. On **Advanced settings**, either let Amplify create a new service role or choose an existing one. Click **Next**.
9. Review and click **Save and deploy**.

Amplify will clone the repo, build from the `web` folder, and deploy. The first build may take a few minutes.

---

## 3. Add environment variables

Builds need Supabase (and optionally Stripe) at **build time** and **runtime**.

1. In Amplify, open your app → **Hosting** → **Environment variables** (or **App settings** → **Environment variables**).
2. Click **Manage variables** → **Add new** and add:

| Variable | Value | Notes |
|----------|--------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://YOUR_PROJECT.supabase.co` | From Supabase Project settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key | From Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service_role key | From Supabase (secret) |
| `NEXT_PUBLIC_APP_URL` | `https://main.XXXX.amplifyapp.com` | Use the Amplify app URL after first deploy (see step 4) |
| `STRIPE_SECRET_KEY` | `sk_live_...` or `sk_test_...` | When you use Stripe |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | When you use Stripe (webhook for **production** URL) |

3. **Redeploy** after changing env vars: **Hosting** → **Run build** (or push a small commit).

Use the **production** Supabase project (and Stripe live keys) when you go live. For testing, you can use the same Supabase/Stripe test keys as local.

---

## 4. Get the app URL and set NEXT_PUBLIC_APP_URL

1. After the first successful deploy, open **Hosting** → **Domain management**.
2. Copy the default URL (e.g. `https://main.xxxxx.amplifyapp.com`) or your **custom domain** (e.g. `https://wiselista.com`).
3. In **Environment variables**, set **`NEXT_PUBLIC_APP_URL`** to that URL (no trailing slash).
4. Redeploy so the app uses the correct URL (e.g. for redirects after Stripe Checkout).

---

## 4b. Custom domain (e.g. wiselista.com)

If you add a custom domain in Amplify (with SSL):

1. **Amplify env var:** Set **`NEXT_PUBLIC_APP_URL`** to your custom domain, e.g. `https://wiselista.com` (no trailing slash). Redeploy.
2. **Supabase Auth:** In Supabase Dashboard → **Authentication** → **URL Configuration**:
   - **Site URL:** set to `https://wiselista.com`.
   - **Redirect URLs:** add `https://wiselista.com/**` (and `https://wiselista.com/login` if you use OAuth or magic links) so Supabase allows redirects back to your domain.
3. **Stripe** (when you use it): Webhook URL can stay as `https://wiselista.com/api/webhooks/stripe`; success/cancel URLs for Checkout will use `NEXT_PUBLIC_APP_URL`.

---

## 5. Build only from GitHub (no manual deploy)

By default, Amplify **only** builds when:

- You **push** to the connected branch (e.g. `main`), or
- You **trigger a build** from the Amplify console (“Run build”).

So:

- **No deploy from your PC:** Do not use “Deploy without Git” or uploads; all deploys come from GitHub.
- **To deploy:** Push to the connected branch; Amplify runs the build and deploys.
- **Optional:** In **App settings** → **Build settings**, you can disable “Allow manual deploys” if your team should only deploy via Git (optional; depends on your workflow).

---

## 6. Stripe webhook (when you use payments)

For **Submit for edit** to complete payment and trigger the mock AI:

1. In **Stripe Dashboard** → **Developers** → **Webhooks**, add an endpoint:
   - **URL:** `https://YOUR_AMPLIFY_URL/api/webhooks/stripe`
   - **Events:** `checkout.session.completed`
2. Copy the **Signing secret** (`whsec_...`) and set **`STRIPE_WEBHOOK_SECRET`** in Amplify environment variables.
3. Redeploy.

---

## 7. Summary checklist

- [ ] Repo on GitHub; Amplify app created and connected to repo + branch.
- [ ] Monorepo: app root = **`web`**; `amplify.yml` in repo root (already present).
- [ ] Env vars in Amplify: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`.
- [ ] After first deploy: set `NEXT_PUBLIC_APP_URL` to Amplify app URL (or custom domain, e.g. `https://wiselista.com`) and redeploy.
- [ ] If using a custom domain: set Supabase Auth Site URL and Redirect URLs to the custom domain.
- [ ] (Optional) Stripe keys and webhook secret; webhook URL points to your app URL.
- [ ] Deploys only via push to GitHub (and optional “Run build” in console).

---

## Troubleshooting

- **Build fails: “appRoot” or “AMPLIFY_MONOREPO_APP_ROOT”**  
  Ensure in Amplify you selected “Monorepo” and app root **`web`**. Amplify sets `AMPLIFY_MONOREPO_APP_ROOT=web`; it must match `appRoot` in `amplify.yml`.

- **Build fails: npm / Node**  
  Amplify uses a default Node version. If you need a specific version, add in `amplify.yml` under `frontend.phases.preBuild.commands`:
  - `nvm use 20` (or set **Node version** in Amplify **Build settings** if available).

- **Runtime errors: “Supabase not configured”**  
  Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in Amplify and that you redeployed after adding them.

- **"Application error: a server-side exception" when logged in**  
  Usually means the server can't create a Supabase client (env vars not available at runtime, or cookies failing). Ensure env vars are set in Amplify under **Environment variables** and **Redeploy**. You should be redirected to login with a session message; if you still see "Something went wrong", check Amplify build logs for "Dashboard load failed". Also run Supabase migrations so the `jobs` and `photos` tables exist.

- **"Like I never sign out" / can't sign back in**  
  The app uses **Supabase session-refresh middleware** (`src/middleware.ts`) so the auth token is refreshed on every request. Without it, Server Components can get 400/invalid token and users get stuck. If you still hit this after deploy: on the login page with "Your session may have expired", use **"Clear session and try again"** to force sign-out and then sign in fresh.

- **Simulating a dropped DB connection (for testing)**  
  To test how the app behaves when Supabase is unreachable: (1) **Supabase:** Project Settings → General → **Pause project** (DB and API stop). (2) **Amplify:** Temporarily set `NEXT_PUBLIC_SUPABASE_URL` to an invalid URL (e.g. `https://invalid.supabase.co`) and redeploy. The app should redirect to login instead of crashing. Restore the real URL and redeploy when done.

- **Stripe redirect fails after payment**  
  Set `NEXT_PUBLIC_APP_URL` to the exact Amplify URL (e.g. `https://main.xxxxx.amplifyapp.com`) and redeploy. The submit API uses this for `success_url` and `cancel_url`.
