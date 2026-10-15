# Rooted

Rooted is a family-tree builder. Drag people onto a canvas, upload photos, connect relatives, and label relationships. Trees are saved to MongoDB (Atlas-ready).

## Stack

- Next.js 15 (App Router) + React 19
- MongoDB (native driver + GridFS for images)
- Optional Amazon S3 for media
- NextAuth (credentials) with bcrypt password hashing
- React Flow (`@xyflow/react`) for the drag-and-drop canvas

## Features

- Drag-and-drop people from a palette onto the tree
- Connect relatives and choose relationship labels (parent, child, spouse, sibling, partner, related)
- Photo upload compressed to WebP and stored in GridFS (or S3 when configured)
- Account drawer with profile, API keys, logout, and tree delete
- Modern heritage-inspired UI (forest / mist palette)

## Setup

```bash
cp example.env .env
# fill DB_URL, DB_NAME, NEXTAUTH_SECRET, NEXTAUTH_URL, CRYPTO_KEY, JWT_SECRET
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment

| Variable | Required | Notes |
|----------|----------|--------|
| `DB_URL` | yes | MongoDB Atlas connection string |
| `DB_NAME` | yes | e.g. `rooted` |
| `NEXTAUTH_SECRET` | yes | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | yes | App URL |
| `CRYPTO_KEY` | yes | `openssl rand -hex 32` (64 hex chars) |
| `JWT_SECRET` | yes | Signing secret for API JWTs |
| `S3_*` | no | If set, media uses S3 instead of GridFS |

## Deploy

Works on any Node host (Vercel, Railway, Fly, etc.):

1. Set the env vars above (Atlas `DB_URL` / `DB_NAME`).
2. `npm run build && npm start` (or connect the GitHub repo to your host).
3. Point `NEXTAUTH_URL` at your production URL.

Media defaults to MongoDB GridFS — no extra storage service required for a first deploy.

## Scripts

- `npm run dev` — local development
- `npm run build` — production build
- `npm start` — serve production build
- `npm run lint` — ESLint
