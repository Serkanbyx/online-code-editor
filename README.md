# CodeNest

CodeNest is a full-stack online code editor with realtime collaboration, Monaco-powered editing, Piston code execution, and a public snippet community.

![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=111)
![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=fff)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss&logoColor=fff)
![Node.js](https://img.shields.io/badge/Node.js-ESM-339933?logo=nodedotjs&logoColor=fff)
![Express](https://img.shields.io/badge/Express-5-000?logo=express&logoColor=fff)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_9-47a248?logo=mongodb&logoColor=fff)
![Socket.io](https://img.shields.io/badge/Socket.io-4-010101?logo=socketdotio&logoColor=fff)
![Yjs](https://img.shields.io/badge/Yjs-CRDT-f7df1e)
![Monaco](https://img.shields.io/badge/Monaco-Editor-007acc)

![CodeNest editor screenshot](./docs/screenshot-editor.png)

## Features

- Realtime co-editing with Yjs CRDT documents and y-websocket sync.
- Monaco-powered browser editing with shared editor defaults and read-only viewer hardening.
- Code execution for 30+ runtimes through the server-side Piston proxy.
- Snippet save, share, edit, delete, and fork flows.
- Public discovery with search, language filters, tag filters, sorting, and pagination.
- Comments, nested replies, soft deletes, and like toggling.
- Public user profiles with privacy preferences for email, likes, and comments.
- Admin dashboard, user management, content moderation, and report resolution.
- Settings for theme, editor preferences, density, privacy, and notifications.
- Responsive UI for desktop and mobile editor layouts.

## Roles & Permissions

| Capability | Guest | User | Admin |
|---|---|---|---|
| Browse public snippets | yes | yes | yes |
| View public profile | yes | yes | yes |
| Register / Login | yes | - | - |
| Create snippet / room | - | yes | yes |
| Run code | - | yes | yes |
| Comment / Like / Fork | - | yes | yes |
| Change own preferences | - | yes | yes |
| Delete own data | - | yes | yes |
| Moderate snippets / comments | - | - | yes |
| Manage users (ban, role) | - | - | yes |
| Resolve reports | - | - | yes |

## REST Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | Public | Health check with environment and timestamp |
| POST | `/api/auth/register` | Public | Register a user and return JWT |
| POST | `/api/auth/login` | Public | Authenticate a user and return JWT |
| GET | `/api/auth/me` | User | Return the current user |
| PATCH | `/api/auth/me` | User | Update display name, bio, or avatar URL |
| PATCH | `/api/auth/password` | User | Change password after current password verification |
| DELETE | `/api/auth/me` | User | Delete the current account and cascade owned data |
| POST | `/api/snippets` | User | Create a snippet |
| GET | `/api/snippets/me` | User | List current user's snippets |
| GET | `/api/snippets/public` | Optional | Explore public active snippets |
| POST | `/api/snippets/:id/fork` | User | Fork a visible snippet into a private copy |
| GET | `/api/snippets/:id` | Optional | Read a visible snippet by ID |
| PATCH | `/api/snippets/:id` | Owner/Admin | Update a snippet |
| DELETE | `/api/snippets/:id` | Owner/Admin | Delete a snippet and cascade comments/likes |
| GET | `/api/comments/snippet/:snippetId` | Optional | List top-level comments for a snippet |
| GET | `/api/comments/:commentId/replies` | Optional | List replies for a comment |
| POST | `/api/comments` | User | Create a comment or reply |
| PATCH | `/api/comments/:id` | Owner | Update comment content |
| DELETE | `/api/comments/:id` | Owner/Admin | Soft-delete a comment |
| POST | `/api/likes/:snippetId` | User | Toggle a snippet like |
| GET | `/api/likes/me` | User | List current user's liked snippets |
| GET | `/api/likes/:snippetId/me` | User | Check whether current user liked a snippet |
| POST | `/api/rooms` | User | Create a collaboration room |
| GET | `/api/rooms/me` | User | List owned or joined rooms |
| GET | `/api/rooms/:roomId` | Optional | Read an accessible room |
| POST | `/api/rooms/:roomId/join` | User | Join an accessible room |
| POST | `/api/rooms/:roomId/leave` | User | Leave a room as a participant |
| POST | `/api/rooms/:roomId/participants` | Owner | Add a participant by username |
| PATCH | `/api/rooms/:roomId` | Owner | Update room name, language, or visibility |
| DELETE | `/api/rooms/:roomId` | Owner | Delete a room and clean up CRDT state |
| GET | `/api/code/runtimes` | Optional | Return supported Piston runtimes |
| POST | `/api/code/run` | User | Execute code through the Piston proxy |
| POST | `/api/upload/avatar` | User | Upload an avatar image to Cloudinary |
| PATCH | `/api/profile/me/preferences` | User | Update user preferences |
| GET | `/api/profile/:username` | Optional | Read a public profile |
| GET | `/api/profile/:username/snippets` | Optional | List public snippets for a profile |
| GET | `/api/profile/:username/likes` | Optional | List visible liked snippets for a profile |
| GET | `/api/profile/:username/comments` | Optional | List visible comments for a profile |
| POST | `/api/reports` | User | Report a snippet or comment |
| GET | `/api/reports/me` | User | List reports filed by current user |
| GET | `/api/admin/stats` | Admin | Dashboard aggregate stats |
| GET | `/api/admin/users` | Admin | List users with filters |
| GET | `/api/admin/users/:id` | Admin | Read user details |
| PATCH | `/api/admin/users/:id/role` | Admin | Change user role |
| PATCH | `/api/admin/users/:id/ban` | Admin | Ban or unban a user |
| DELETE | `/api/admin/users/:id` | Admin | Delete a user with cascade cleanup |
| GET | `/api/admin/snippets` | Admin | List snippets for moderation |
| PATCH | `/api/admin/snippets/:id/status` | Admin | Moderate snippet status |
| DELETE | `/api/admin/snippets/:id` | Admin | Hard-delete a snippet |
| GET | `/api/admin/comments` | Admin | List comments for moderation |
| PATCH | `/api/admin/comments/:id/status` | Admin | Moderate comment status |
| GET | `/api/admin/reports` | Admin | List report queue |
| PATCH | `/api/admin/reports/:id` | Admin | Resolve or dismiss a report |

## Socket.io Events

| Event | Direction | Payload | Purpose |
|---|---|---|---|
| `room:join` | C -> S | `{ roomId }` | Join presence channel |
| `room:leave` | C -> S | `{ roomId }` | Leave |
| `room:userJoined` | S -> C | `{ user }` | Notify peers |
| `room:userLeft` | S -> C | `{ userId }` | Notify peers |
| `room:usersInRoom` | S -> C | `{ users }` | Initial snapshot |
| `cursor:change` | C -> S | `{ roomId, position, selection? }` | Send my cursor |
| `cursor:update` | S -> C | `{ userId, position, selection }` | Receive others' cursors |
| `room:languageChange` | C -> S -> C | `{ roomId, language }` | Owner-driven syntax switch |

## Yjs Channel

| Path | Purpose |
|---|---|
| `WSS /yjs/:roomId?token=<jwt>` | CRDT document sync and awareness |

Yjs documents are stored in memory for the MVP. A server restart clears unsaved room content, so saving a snippet to MongoDB is the durability path. For production persistence, replace the in-memory setup with `y-leveldb`-backed Yjs storage.

## Supported Languages

Each language uses the latest compatible version from the Piston runtime catalog unless a client explicitly sends a validated version.

- JavaScript - latest from runtime catalog
- TypeScript - latest from runtime catalog
- Python - latest from runtime catalog
- Java - latest from runtime catalog
- C - latest from runtime catalog
- C++ - latest from runtime catalog
- C# - latest from runtime catalog
- Go - latest from runtime catalog
- Rust - latest from runtime catalog
- Ruby - latest from runtime catalog
- PHP - latest from runtime catalog
- Swift - latest from runtime catalog
- Kotlin - latest from runtime catalog
- Scala - latest from runtime catalog
- R - latest from runtime catalog
- Dart - latest from runtime catalog
- Elixir - latest from runtime catalog
- Perl - latest from runtime catalog
- Lua - latest from runtime catalog
- Bash - latest from runtime catalog
- SQL - latest from runtime catalog
- HTML - latest from runtime catalog
- CSS - latest from runtime catalog
- JSON - latest from runtime catalog
- YAML - latest from runtime catalog
- Markdown - latest from runtime catalog

## Piston API

Code runs through the Piston API hosted at emkc.org. It is free, requires no API key, and supports 30+ languages with sandboxed execution. Self-hosting Piston is supported by setting `PISTON_BASE_URL`.

## Folder Structure

```text
codenest/
  server/
  client/
  .gitignore
  README.md
  STEPS.md
```

```text
server/
  config/
    db.js
    env.js
  middleware/
    auth.js
    adminOnly.js
    optionalAuth.js
    errorHandler.js
    notFound.js
    sanitize.js
    rateLimiters.js
    validate.js
    upload.js
    socketAuth.js
  models/
    User.js
    Snippet.js
    Comment.js
    Like.js
    Room.js
    Report.js
  controllers/
    authController.js
    snippetController.js
    commentController.js
    likeController.js
    roomController.js
    codeController.js
    uploadController.js
    profileController.js
    adminController.js
  routes/
    authRoutes.js
    snippetRoutes.js
    commentRoutes.js
    likeRoutes.js
    roomRoutes.js
    codeRoutes.js
    uploadRoutes.js
    profileRoutes.js
    adminRoutes.js
    reportRoutes.js
  validators/
    authValidator.js
    snippetValidator.js
    commentValidator.js
    roomValidator.js
    codeValidator.js
    profileValidator.js
    adminValidator.js
    reportValidator.js
  sockets/
    index.js
    presenceHandlers.js
    cursorHandlers.js
    yjsServer.js
  utils/
    generateToken.js
    asyncHandler.js
    apiError.js
    pistonClient.js
    escapeRegex.js
    pickFields.js
    cloudinary.js
    constants.js
  scripts/
    seedAdmin.js
  index.js
  package.json
  .env.example
```

```text
client/
  public/
    favicon.svg
  src/
    api/
      axios.js
      authService.js
      snippetService.js
      commentService.js
      likeService.js
      roomService.js
      codeService.js
      uploadService.js
      profileService.js
      adminService.js
      reportService.js
    components/
      common/
      layout/
      editor/
      snippets/
      admin/
    context/
      AuthContext.jsx
      PreferencesContext.jsx
      SocketContext.jsx
    hooks/
      useLocalStorage.js
      useDebounce.js
      useSocket.js
      useYjsRoom.js
      useGuestId.js
      useCopyToClipboard.js
    layouts/
      MainLayout.jsx
      AdminLayout.jsx
      SettingsLayout.jsx
    pages/
      auth/
      home/
      snippets/
      rooms/
      profile/
      settings/
      admin/
      misc/
    routes/
      ProtectedRoute.jsx
      AdminRoute.jsx
      GuestOnlyRoute.jsx
    utils/
      formatDate.js
      helpers.js
      constants.js
      languages.js
    App.jsx
    main.jsx
    index.css
  index.html
  vite.config.js
  package.json
  .env.example
  netlify.toml
```

## Security

- **Mass assignment:** every controller destructures only allowed fields; never spreads `req.body` into a model.
- **Role protection:** `role` is not settable via register, profile update, or any non-admin route.
- **User enumeration:** login returns the same message for missing email and wrong password.
- **Password security:** bcrypt salt 12, `select: false`, never returned in responses, change requires current password.
- **JWT secret:** at least 32 chars enforced at startup in production; process exits if shorter.
- **Rate limiters:** separate instances for global, auth, admin, code-run, and write actions.
- **Helmet:** default security headers are enabled.
- **CORS:** strict allowlist via `CORS_ORIGIN`; never wildcard in production.
- **Body size limits:** global 64 KB, code-run 96 KB, multer avatar 2 MB.
- **Mongo sanitize:** custom middleware sanitizes `req.body` and `req.params` only.
- **Express 5 compatibility:** no middleware reassigns `req.query`; `hpp` is not installed.
- **XSS:** text inputs pass `escape()` in validators; React handles output escaping.
- **ReDoS:** `$regex` queries pass through `escapeRegex` first.
- **Ownership checks:** snippet/comment update and delete verify author ownership or admin access.
- **Visibility filtering:** public snippet endpoints return only `isPublic && status === 'active'`.
- **Pagination clamp:** `limit` is capped at 50 and `page` is forced to a positive integer.
- **File upload:** MIME whitelist, 2 MB cap, and server-generated filenames.
- **Admin self-protection:** admins cannot ban/delete themselves or change their own role; last-admin protection is enforced.
- **Cascade deletes:** user and snippet deletion clean related snippets, comments, likes, reports, and room participants.
- **Error handler:** production responses do not leak stack traces or internal paths.
- **Privacy:** `preferences.privacy.*` is enforced server-side.
- **`x-powered-by` disabled.**
- **`.env.example` synced:** required variables are documented with safe placeholders and no real secrets.
- **Sensitive logging:** tokens, passwords, and full user documents are not logged.
- **JWT storage:** client stores the token in `localStorage` and sends it only via `Authorization`.
- **Mongoose 9 compatibility:** pre/post hooks use async functions without `next`.
- **Piston payload guard:** server enforces `MAX_CODE_PAYLOAD_KB` and router-level body limits.
- **Yjs room access guard:** WebSocket upgrades call `verifyAccess` before CRDT sync.
- **Socket.io handshake JWT:** unauthenticated sockets and banned users are rejected.
- **Soft deletes:** removed comments display safe placeholders; original removed content is not returned.

## Getting Started

1. Clone the repo and install dependencies: `cd server && npm install`, then `cd ../client && npm install`.
2. Copy `.env.example` to `.env` in both folders and fill in values.
3. Start MongoDB locally or set `MONGO_URI` to your Atlas cluster.
4. Seed the admin user: `cd server && npm run seed`.
5. Run the backend: `npm run dev`.
6. Run the frontend: `cd ../client && npm run dev`.
7. Open `http://localhost:5173`.

## Deployment

Use MongoDB Atlas for the database, Render for the backend, and Netlify for the frontend. Render runs Express, Socket.io, and y-websocket on the same service URL with `/api`, `/socket.io`, and `/yjs/<roomId>` paths. Netlify builds from `client/` with `npm run build` and publishes `client/dist`.

In production, set `CORS_ORIGIN` to the exact Netlify URL, use a `JWT_SECRET` with at least 32 characters, keep `PISTON_BASE_URL=https://emkc.org/api/v2/piston`, and configure `VITE_API_URL`, `VITE_SOCKET_URL`, and `VITE_YJS_URL` to the Render service. On Render free tier, configure an uptime monitor against `/api/health` and keep the client cold-start timeout UX enabled.

## License

MIT
