# CodeNest

CodeNest is a full-stack online code editor that brings the VS Code editing experience (Monaco) to the browser, lets multiple users co-edit the same document in real time using Yjs CRDT, executes code safely against the Piston API across 30+ languages, and provides a snippet library with public discovery, likes, comments, and forking.

## Stack

- **Client:** React 19 + Vite + Tailwind v4 + Monaco Editor + Yjs + Socket.io client + React Router v7
- **Server:** Node + Express 5 + Mongoose 9 + Socket.io + y-websocket + Piston (proxied)
- **Auth:** JWT (access tokens), bcrypt password hashing
- **Roles:** `user` (default), `admin` (moderation, user management)

## Monorepo Layout

```
.
├─ client/   # React 19 + Vite SPA
├─ server/   # Express 5 API + Socket.io + y-websocket
├─ .gitignore
├─ README.md
└─ STEPS.md  # Step-by-step build guide
```

## Local Development (after Step 1)

> Dependencies are listed in each package's `package.json` but are **not installed yet**.
> Step 1 only scaffolds the workspace; install and run commands are introduced in later steps.

When you are ready to install (after the user explicitly approves):

```bash
# In one terminal
cd server
npm install
cp .env.example .env   # then fill in real secrets
npm run dev

# In another terminal
cd client
npm install
cp .env.example .env
npm run dev
```

## Environment Variables

- `server/.env.example` — backend secrets (Mongo URI, JWT secret, Piston URL, Cloudinary, admin seed).
- `client/.env.example` — frontend `VITE_*` URLs (API, Socket.io, y-websocket).

Real `.env` files are git-ignored and must never be committed.

## Build Guide

See [`STEPS.md`](./STEPS.md) for the full, step-by-step build prompts. Each step is a self-contained instruction set executed in order.
