# Supabase fresh start (paused / lost project)

Use this when your old Supabase project is paused, deleted, or unrecoverable. About **10 minutes**.

I (Cursor) **cannot** log into your Supabase account. You do the dashboard clicks; paste keys here or into env vars and I can wire the rest.

---

## Step 1 — New Supabase project (you, ~2 min)

1. [supabase.com](https://supabase.com) → **New project**
2. Name: `wiselista` (or `wiselista-prod`)
3. **Region:** Sydney (closest for AU/NZ)
4. Save the **database password** somewhere safe
5. Wait until the project is **Active** (green)

---

## Step 2 — Run setup SQL (you, ~1 min)

1. **SQL Editor** → **New query**
2. Open **`supabase/setup-fresh-project.sql`** from this repo
3. Copy **the entire file** → paste → **Run**
4. Success = no errors (creates tables, RLS, storage bucket + policies)

---

## Step 3 — Create your login user (you, ~1 min)

1. **Authentication** → **Users** → **Add user** → **Create new user**
2. Email: e.g. your work email
3. Password: choose one you’ll remember
4. **Auto Confirm User:** ON (so you can sign in immediately)

This is your **wiselista.com login**. Passwords are only visible when you set them — not stored in GitHub.

---

## Step 4 — Copy API keys (you, ~1 min)

**Project Settings** → **API**:

| Key | Env var name |
|-----|----------------|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| anon public | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| service_role (Reveal) | `SUPABASE_SERVICE_ROLE_KEY` |

Paste all three into chat for Cursor to update local env, **or** edit `web/.env.local` yourself.

---

## Step 5 — Local env (Cursor or you)

In **`web/.env.local`** (copy from `.env.example` if missing):

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_NEW_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Keep existing Stripe keys if you still use the same Stripe account.

Verify:

```powershell
cd web
node scripts/verify-supabase.mjs
```

Then: `npm run dev` → http://localhost:3000/login

---

## Step 6 — Production (Amplify) — required for wiselista.com

1. AWS **Amplify** → your app → **Environment variables**
2. Update these three to the **new** project values:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. **Hosting** → **Run build** (or push any commit to `main`)

Until Amplify env vars are updated, production login still points at the **old** dead project.

---

## Step 7 — Mobile (if you use Expo)

Update the same Supabase URL + anon key in your mobile env (e.g. `mobile/.env` or EAS secrets) so the app hits the new project.

---

## What you lose vs keep

| Lost (old project) | Kept (this repo) |
|--------------------|------------------|
| User accounts | All app code |
| Jobs & photos | SQL setup script |
| Storage files | Stripe config (same keys) |

---

## After setup

Tell Cursor: *“Supabase keys are in .env.local — verify login”* and we’ll run the web happy-path test (create job → photos → submit).
