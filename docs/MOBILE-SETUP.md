# Wiselista mobile app setup

Run the Expo app locally, set environment variables, and test auth, jobs, camera, and submit.

---

## Prerequisites

- **Node.js** 18+
- **Expo Go** on your device (optional; you can use Android emulator or iOS simulator)
- **Supabase** project with the Wiselista schema and storage bucket (see [SUPABASE-SETUP.md](./SUPABASE-SETUP.md))
- **Web app** deployed (e.g. `https://wiselista.com`) for the submit API

---

## 1. Install dependencies

From the repo root:

```bash
cd mobile
npm install
```

---

## 2. Environment variables

Copy the example env file and fill in your Supabase and app URL:

```bash
cp .env.example .env
```

Edit `.env`:

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL (e.g. `https://xxxx.supabase.co`) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `EXPO_PUBLIC_APP_URL` | Base URL of the web app (e.g. `https://wiselista.com`) — used when calling the submit API |

Expo only reads env vars prefixed with `EXPO_PUBLIC_` at build time. Restart the dev server after changing `.env`.

---

## 3. Run the app

```bash
npm start
```

Then:

- **Android:** Press `a` or run `npm run android` (with emulator or device).
- **iOS:** Press `i` in the terminal or run `npm run ios` (Mac with Xcode only).
- **Expo Go:** Scan the QR code with Expo Go on your device (same network as your machine).

---

## 4. Test flows

### Auth

1. Open the app → sign-up screen.
2. Create an account (email + password). Confirm email if required by Supabase.
3. Sign in. You should land on the Jobs list.
4. Sign out from the Jobs header; you should return to the login screen.

### Jobs and photos

1. Sign in. Tap **+ New job**.
2. Create a job. You should navigate to the job detail screen.
3. Tap **+ Add photo** → camera opens.
4. Select a room type (e.g. Living room). The framing overlay updates.
5. Grant camera permission if prompted. Tap **Capture**.
6. After upload, you return to the job detail; the new photo appears in the list.

### Submit for edit

1. On a job that has at least one photo, tap **Submit for edit**.
2. The app calls `POST {EXPO_PUBLIC_APP_URL}/api/jobs/:id/submit` with the session Bearer token.
3. On success, the job status changes (e.g. to Submitted/Processing). You’ll see a confirmation.
4. Check the web dashboard at `EXPO_PUBLIC_APP_URL` to see the job status and (after mock AI) edited photos.

---

## 5. API base URL

The mobile app uses `EXPO_PUBLIC_APP_URL` when calling the **submit** endpoint:

- **Local web:** Use `http://YOUR_LOCAL_IP:3000` (e.g. `http://192.168.1.10:3000`) so the device can reach your machine. Run the web app with `cd web && npm run dev`.
- **Production:** Use `https://wiselista.com` (or your deployed URL).

The submit route accepts:

- **Web:** Cookie session (no header).
- **Mobile:** `Authorization: Bearer <access_token>` (session access token from Supabase).

---

## 6. Troubleshooting

- **"Supabase not configured"**  
  Ensure `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set in `.env` and restart `npm start`.

- **Submit returns 401**  
  User may not be signed in or token expired. Sign out and sign in again.

- **Camera not working**  
  Grant camera permission in device/emulator settings. On iOS simulator, camera may be unavailable; use a real device or Android emulator with a virtual camera.

- **Upload fails**  
  Confirm the Supabase storage bucket `wiselista-photos` exists and RLS policies allow authenticated uploads (see storage migration).
