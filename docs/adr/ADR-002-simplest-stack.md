# ADR-002: Use Supabase + Next.js (Vercel) + Expo as the V1 stack

**Date:** 2025-02-02  
**Status:** Accepted

## Decision

V1 backend: Supabase (DB, Auth, Storage). API + web dashboard: Next.js on Vercel. Mobile: Expo (React Native). No Redis; Stripe Checkout; one AI API.

## Reason

- Minimal cost and ops (free tiers; one vendor for DB/Auth/Storage)
- Single repo for API + web; Supabase handles auth and files
- Cursor-native recommendations doc locks this for consistency

## Rejected

- Separate Auth0/Clerk: extra cost and moving parts
- Redis/queue service: not needed for pilot volume; use DB + cron or one worker
- Separate S3: Supabase Storage is S3-compatible and included
