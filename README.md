# Rooted

Rooted is a family-tree builder you can deploy and share. Drag people onto a canvas, upload photos, connect relatives, label relationships, and invite family with private-by-default sharing.

## Stack

- Next.js 15 (App Router) + React 19
- MongoDB (native driver + GridFS for images)
- Optional Amazon S3 for media
- NextAuth (credentials) + bcrypt
- Resend for transactional email
- React Flow (`@xyflow/react`)

## Public launch features

- Email verification + password reset
- Rate limiting on auth, media, and share endpoints
- Private trees by default, view-only share links, email invites (view/edit)
- Media access scoped to owner, collaborators, or share token
- GitHub Actions CI (lint, tests, build)

## Setup

```bash
cp example.env .env
# fill DB_*, NEXTAUTH_*, CRYPTO_KEY, JWT_SECRET, RESEND_API_KEY, EMAIL_FROM
npm install
npm run dev
```

For local smoke tests without email, set `AUTO_VERIFY_EMAIL=true` (do **not** use in production).

Without `RESEND_API_KEY`, verification/reset/invite links are printed in the server console.

## Deploy checklist

1. Set production env vars (including `NEXTAUTH_URL` = your domain).
2. Configure Resend + a verified `EMAIL_FROM` domain.
3. Atlas network access for your host.
4. `npm run build && npm start` (or connect the repo to Vercel/Railway/Fly).
5. Register once end-to-end: verify email → sign in → save tree → enable share link.

## Scripts

- `npm run dev` — local development
- `npm run build` / `npm start` — production
- `npm run lint` — ESLint
- `npm test` — Vitest unit tests
