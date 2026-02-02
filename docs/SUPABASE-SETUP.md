# Supabase setup — Wiselista

Do this once so you can sign in, create jobs, and upload photos. About 10 minutes.

---

## 1. Create a Supabase project

1. Go to **[supabase.com](https://supabase.com)** and sign in (or create an account).
2. Click **New project**.
3. Choose an **organization** (or create one).
4. Set:
   - **Name:** e.g. `wiselista` or `wiselista-dev`
   - **Database password:** choose a strong password and **save it** (you need it for DB access later).
   - **Region:** pick one close to you (e.g. Sydney for NZ/AU).
5. Click **Create new project** and wait for it to finish (1–2 min).

---

## 2. Run the schema (SQL)

1. In the Supabase dashboard, open **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Copy the **entire contents** of `supabase/migrations/20250202000001_schema.sql` from this repo and paste into the editor.
4. Click **Run** (or Ctrl+Enter).
5. You should see “Success. No rows returned.” That creates the `jobs`, `photos`, and `payments` tables and RLS policies.

---

## 3. Create the storage bucket and policies

1. In the left sidebar, open **Storage**.
2. Click **New bucket**.
3. Set:
   - **Name:** `wiselista-photos`
   - **Public bucket:** **Off** (private).
4. Click **Create bucket**.
5. Add storage policies so logged-in users can upload and read photos. In **SQL Editor** → **New query**, paste and run the contents of **`supabase/migrations/20250202000002_storage.sql`** from this repo. That file adds:
   - **INSERT** — authenticated users can upload to `wiselista-photos`.
   - **SELECT** — authenticated users can read from `wiselista-photos`.
   - **UPDATE** — authenticated users can update objects (e.g. for edited photos).

---

## 4. Get your API keys and URL

1. In the left sidebar, open **Project Settings** (gear icon).
2. Click **API** in the left submenu.
3. You’ll see:
   - **Project URL** — e.g. `https://xxxxx.supabase.co`
   - **anon public** key — safe to use in the browser.
   - **service_role** key — **secret**; only use on the server (API routes, webhooks). Click “Reveal” and copy.

---

## 5. Create a test user (Auth)

1. In the left sidebar, open **Authentication** → **Users**.
2. Click **Add user** → **Create new user**.
3. Enter an **email** and **password** (e.g. `test@example.com` / `testpassword123`). Save them.
4. Click **Create user**. You’ll use this to sign in on the Wiselista login page.

(Optional: enable **Email** under Authentication → Providers so users can sign up themselves later.)

---

## 6. Add env vars to the web app

1. In the repo, go to the **web** folder.
2. Copy `.env.example` to `.env.local`:
   - Windows (PowerShell): `Copy-Item .env.example .env.local`
   - Or create `web/.env.local` manually.
3. Open `web/.env.local` and set:

```env
# Supabase — use your real values from step 4
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Stripe — leave as placeholders for now if you haven’t set up Stripe yet
STRIPE_SECRET_KEY=sk_test_
STRIPE_WEBHOOK_SECRET=whsec_
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Replace `YOUR_PROJECT_REF`, `your-anon-public-key-here`, and `your-service-role-key-here` with the values from **Project Settings → API**.

4. Save the file.

---

## 7. Restart the dev server

1. Stop the Next.js dev server (Ctrl+C in the terminal where it’s running).
2. From the **web** folder run: `npm run dev`
3. Open **http://localhost:3000/login** and sign in with the test user email and password from step 5.

You should see the dashboard. You can create jobs via the API (or we can add a “Create job” button next).

---

## Checklist

- [ ] Supabase project created
- [ ] SQL migration run (jobs, photos, payments, RLS)
- [ ] Storage bucket `wiselista-photos` created and policies added
- [ ] Test user created in Authentication
- [ ] `web/.env.local` has URL, anon key, service role key
- [ ] Dev server restarted; login works

---

## Troubleshooting

- **“Supabase not configured”** → Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are in `web/.env.local` and that you restarted the dev server.
- **“Invalid login”** → Confirm the user exists under Authentication → Users and the password is correct.
- **Upload fails** → Check Storage bucket name is exactly `wiselista-photos` and the storage policies were created.
- **RLS errors** → Ensure you ran the full migration; `auth.uid()` must match `user_id` on jobs.
