# Test Delete Photo API (mobile / Bearer auth)

Use this to verify the delete-photo API accepts Bearer token and returns the expected status.

1. Get a valid Supabase access token (from the mobile app session or Supabase Auth).
2. Create a draft job with at least one photo (via app or API).
3. Run (replace `JOB_ID`, `PHOTO_ID`, `ACCESS_TOKEN` and optionally `BASE_URL`):

```bash
BASE_URL=https://wiselista.com
curl -i -X DELETE \
  "${BASE_URL}/api/jobs/JOB_ID/photos/PHOTO_ID" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

- **200** and `{"ok":true}` = success.
- **401** = Unauthorized (invalid or missing token).
- **400** = Job not found or not draft.
- **404** = Photo not found.

Server logs (Amplify or local): look for `[DeletePhoto]` lines to see where the request failed.
