# Auth System — NextAuth v5 + Prisma + Neon + Resend

Build a complete backend auth system with no UI. All logic via Server Actions, secure token handling, and rate limiting.

## User Review Required

> [!IMPORTANT]
> The project does **not** use a `src/` directory. All paths will follow the existing convention: `app/`, `lib/`, `actions/` at root level — not `src/app/`, `src/lib/`, etc.

> [!WARNING]
> `@upstash/ratelimit` and `@upstash/redis` are not installed. These will be added for rate limiting. You'll need to set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` environment variables.

## Open Questions

> [!IMPORTANT]
> **Environment variables required** — the following must be set in `.env` before the system works:
> - `DATABASE_URL` ✅ (already present)
> - `AUTH_SECRET` (NextAuth secret)
> - `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` (Google OAuth)
> - `RESEND_API_KEY` (Resend email)
> - `NEXT_PUBLIC_APP_URL` (for email verification links, e.g. `http://localhost:3000`)
> - `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` (rate limiting)

---

## Proposed Changes

### 1. Dependencies

Install missing packages:
```bash
npm install @upstash/ratelimit @upstash/redis
```

---

### 2. Prisma Schema & Client

#### [NEW] [schema.prisma](file:///d:/Personal/books/prisma/schema.prisma)

Full schema with tables:
- **User** — `id`, `name`, `email` (unique), `emailVerified`, `password`, `image`, `createdAt`, `updatedAt`
- **Account** — OAuth accounts linked to User (NextAuth adapter standard)
- **Session** — Database sessions (NextAuth adapter standard)
- **VerificationToken** — For email verification + set-password flow (compound unique `[identifier, token]`)
- **PendingRegistration** — `id`, `email` (unique), `token` (unique), `expires`, `createdAt`

Uses `@prisma/adapter-pg` for Neon PostgreSQL connection with `pgbouncer` + connection pooling.

#### [NEW] [db.ts](file:///d:/Personal/books/lib/db.ts)

Prisma client singleton using the driver adapter pattern (`@prisma/adapter-pg` with `pg.Pool`). Prevents connection leaks in development via `globalThis` caching.

---

### 3. NextAuth Configuration

#### [NEW] [auth.ts](file:///d:/Personal/books/auth.ts)

Root-level NextAuth v5 config exporting `{ handlers, signIn, signOut, auth }`:

**Providers:**
- `Google` — with `allowDangerousEmailAccountLinking: true` for account merge
- `Credentials` — validates email + password via bcrypt, checks `emailVerified`

**Adapter:** `@auth/prisma-adapter` connected to Prisma client

**Callbacks:**
- `jwt` — attaches `user.id` to token
- `session` — exposes `user.id` on session
- `signIn` — auto-sets `emailVerified` for OAuth providers

**Session strategy:** `jwt`

#### [NEW] [route.ts](file:///d:/Personal/books/app/api/auth/[...nextauth]/route.ts)

NextAuth API route handler — re-exports `GET` and `POST` from `auth.ts` handlers.

---

### 4. Server Actions

#### [NEW] [auth.ts](file:///d:/Personal/books/actions/auth.ts)

All actions marked `"use server"`, return `{ success: boolean; error?: string }`:

| Action | Description |
|---|---|
| `registerByEmail(email)` | Validates email, checks if user exists (generic error), creates `PendingRegistration` with crypto token (1h expiry), sends verification email via Resend. Rate limited. |
| `verifyEmailToken(token)` | Validates token from `PendingRegistration`, creates User with `emailVerified = now()`, deletes pending record. Uses Prisma transaction. Returns a one-time set-password token stored in `VerificationToken`. |
| `setPassword(token, password)` | Validates set-password token from `VerificationToken`, hashes password (bcrypt cost 12), updates User, deletes token. Uses Prisma transaction. |
| `loginWithCredentials(email, password)` | Calls `signIn("credentials", ...)`. Rate limited. |
| `loginWithGoogle()` | Calls `signIn("google", ...)`. |
| `logout()` | Calls `signOut(...)`. |
| `resendVerification(email)` | Regenerates token for existing `PendingRegistration`, resends email. Rate limited. |

---

### 5. API Route — Email Verification

#### [NEW] [route.ts](file:///d:/Personal/books/app/api/auth/verify-email/route.ts)

`GET /api/auth/verify-email?token=xxx`
- Extracts token from search params
- Calls `verifyEmailToken` logic
- On success: redirects to `/auth/set-password?token=<set-password-token>`
- On failure: redirects to `/auth?error=invalid_token`

---

### 6. Middleware

#### [NEW] [middleware.ts](file:///d:/Personal/books/middleware.ts)

Using NextAuth's `auth` wrapper:
- **Protected routes** (`/dashboard`, etc.): redirect to `/auth` if no session
- **Auth routes** (`/auth/*`): redirect to `/dashboard` if already authenticated
- **Public routes** (`/`, `/api/auth/*`): pass through
- Uses `matcher` config to exclude static assets and API routes

---

### 7. Utilities

#### [NEW] [email.ts](file:///d:/Personal/books/lib/email.ts)

`sendVerificationEmail(email, token)` — uses Resend SDK to send a verification email with the link: `${APP_URL}/api/auth/verify-email?token=${token}`

#### [NEW] [rate-limit.ts](file:///d:/Personal/books/lib/rate-limit.ts)

Rate limiter using `@upstash/ratelimit` + `@upstash/redis`:
- `authRateLimit` — 5 requests per 60 seconds per IP/email key
- Helper: `checkRateLimit(key)` returns `{ success, error? }`

#### [NEW] [session.ts](file:///d:/Personal/books/lib/session.ts)

- `getCurrentUser()` — calls `auth()`, returns user or `null`
- `requireAuth()` — calls `auth()`, redirects to `/auth` if no session, returns user

---

## File Tree (new files only)

```
books/
├── auth.ts                              # NextAuth v5 config
├── middleware.ts                         # Route protection
├── prisma/
│   └── schema.prisma                    # Database schema
├── lib/
│   ├── db.ts                            # Prisma singleton
│   ├── email.ts                         # Resend email utility
│   ├── rate-limit.ts                    # Upstash rate limiter
│   ├── session.ts                       # getCurrentUser / requireAuth
│   └── utils.ts                         # (existing)
├── actions/
│   └── auth.ts                          # All Server Actions
└── app/
    └── api/
        └── auth/
            ├── [...nextauth]/route.ts   # NextAuth handler
            └── verify-email/route.ts    # Email verification endpoint
```

---

## Verification Plan

### Automated Tests
1. `npx prisma validate` — confirm schema is valid
2. `npx prisma generate` — confirm client generates without errors
3. `npm run build` — confirm no TypeScript errors and build succeeds
4. Manual review of all file imports and types

### Manual Verification
- Set all environment variables
- Run `npx prisma db push` to sync schema to Neon
- Start dev server and test auth flows via API calls
