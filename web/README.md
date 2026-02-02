# Wiselista — Web (Next.js)

Dashboard and API for Wiselista. Phase 1: auth, jobs, photos, mock AI, Stripe webhook stub.

## Setup

1. **Supabase**
   - Create a project at [supabase.com](https://supabase.com).
   - Run the SQL in `../supabase/migrations/20250202000001_schema.sql` in the SQL editor.
   - Create a storage bucket `wiselista-photos` (private).
   - Copy URL and anon key; create a service role key for API/webhooks.

2. **Stripe**
   - Create a product/price or use Checkout with `price_data` (already in submit route).
   - Copy secret key and create a webhook endpoint: `https://your-domain.com/api/webhooks/stripe` with event `checkout.session.completed`. Copy webhook secret.

3. **Env**
   - Copy `.env.example` to `.env.local` and fill in Supabase + Stripe values.
   - `NEXT_PUBLIC_APP_URL` = your app URL (e.g. `http://localhost:3000` for dev).

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in (create a user in Supabase Auth first), then use the dashboard or API.

## API (Phase 1)

- `GET /api/jobs` — list jobs (auth)
- `POST /api/jobs` — create job (draft)
- `GET /api/jobs/[id]` — job detail + photos
- `POST /api/jobs/[id]/photos` — upload photo (form: file, room_type, sequence)
- `POST /api/jobs/[id]/submit` — create Stripe Checkout session; returns `{ url }`
- `POST /api/webhooks/stripe` — Stripe webhook; marks job paid, triggers mock AI

## Flow

1. User signs in (Supabase Auth).
2. Create job: `POST /api/jobs`.
3. Add photos: `POST /api/jobs/[id]/photos` with form data.
4. Submit for edit: `POST /api/jobs/[id]/submit` → redirect to Stripe Checkout.
5. After payment, webhook runs → job status `processing` → mock AI sets `edited_key` and status `ready` after ~2s.
