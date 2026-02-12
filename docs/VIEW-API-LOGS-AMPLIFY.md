# How to view API logs (step 4 — [DeletePhoto] and [Submit])

When the mobile app calls your API (e.g. Remove photo, Submit for edit), the server writes logs like `[DeletePhoto]` and `[Submit]`. Here’s how to see them so you can see why a request failed.

---

## Option A: Amplify Console → Logs (if available)

1. Open **[AWS Amplify Console](https://console.aws.amazon.com/amplify/)** and select your **Wiselista** app.
2. In the left sidebar, look for **Monitoring** or **Hosting**.
3. Look for **Logs**, **Application logs**, or **Backend logs**.
4. Open the latest log stream and set the time range to when you tapped Remove (or Submit).
5. Search the page (Ctrl+F / Cmd+F) for **`[DeletePhoto]`** or **`[Submit]`**.

If you don’t see runtime/application logs here, use Option B.

---

## Option B: AWS CloudWatch (where API logs usually go)

Amplify runs your Next.js API routes on Lambda. Their `console.info` / `console.warn` / `console.error` go to **CloudWatch Logs**.

1. Open **[AWS CloudWatch](https://console.aws.amazon.com/cloudwatch/)** (same AWS account as Amplify).
2. In the left sidebar, go to **Logs** → **Log groups**.
3. Find a log group that belongs to your Amplify app. Names are often like:
   - `/aws/amplify/amplify-<app-id>`
   - or `/aws/lambda/amplify-...`
   - or contain **Next.js** / **SSR** / **Amplify**.
4. Click the log group → open the most recent **Log stream** (by “Last event time”).
5. Set the time range to when you tried Remove (or Submit).
6. Search in the log events for **`[DeletePhoto]`** or **`[Submit]`**.

**What you’ll see:**

- **`[DeletePhoto] { jobId, photoId, hasBearer }`** — request reached the API. If `hasBearer: false`, the app didn’t send the token.
- **`[DeletePhoto] Unauthorized: no user from getApiUser`** — token missing, wrong, or expired.
- **`[DeletePhoto] job fetch error`** — job not found or RLS/auth issue.
- **`[DeletePhoto] photo not found`** — photo id wrong or not in that job.
- **`[DeletePhoto] success`** — delete worked.

---

## Option C: Run the API locally and watch the terminal

1. In the repo: `cd web` then `npm run dev`.
2. On the phone/simulator, set **`EXPO_PUBLIC_APP_URL`** to your machine’s URL (e.g. `http://192.168.1.x:3000` or use ngrok).
3. In the app, tap **Remove** and confirm.
4. In the terminal where `npm run dev` is running, look for **`[DeletePhoto]`** lines. That’s the same log output you’d see in CloudWatch in production.

---

## If you can’t find any logs

- Confirm the **latest build** has been deployed (the one that includes the `[DeletePhoto]` logging).
- In Amplify, check **App settings** → **General** → **Service role**: the role may need **CloudWatch Logs** permissions so that Lambda can write logs. If there’s no log group for the app, the role might not have been set or might lack `logs:CreateLogGroup` / `PutLogEvents`.

Once you see the line that appears (or the last line before nothing), you’ll know exactly where the delete is failing (e.g. “Unauthorized” vs “job not found” vs “photo not found”).
