<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project Shape

- Single-package npm app (`package-lock.json` v3), Next.js `16.2.5`, React `19.2.4`, TypeScript strict mode.
- Real source is under `src/`: App Router routes in `src/app`, auth UI in `src/features/auth`, shared code in `src/lib`, server actions in `src/actions`.
- Path alias is `@/* -> ./src/*`; prefer it for app imports.
- Tailwind v4 is configured through `src/app/globals.css` and `@tailwindcss/postcss`; shadcn config is `components.json` with UI aliases to `@/components/ui`.

## Commands

- Install: `npm install`.
- Dev server: `npm run dev`.
- Lint: `npm run lint`.
- Production build/typecheck: `npm run build` (there is no separate `typecheck` script).
- Prisma: use the npm scripts because the schema is not at the default path: `npm run prisma:generate`, `npm run prisma:migrate`, `npm run prisma:push`, `npm run prisma:studio`.
- No test runner, CI workflow, formatter script, or pre-commit config is present; do not invent test commands.

## Frontend Standards

- UI must be responsive across mobile, tablet, and desktop; review layouts with small-screen-first Tailwind classes before finalizing.
- Prefer existing shadcn UI components from `src/components/ui` for buttons, inputs, labels, cards, separators, toasts, and similar primitives; only use raw HTML when no matching component exists or the component would be inappropriate.
- Before importing a component, hook, icon, or framework API, verify it exists in this repo/dependency version; do not leave speculative imports or imports from packages that are not installed.
- For Next.js or React APIs, check the installed Next `16.2.5` docs in `node_modules/next/dist/docs/` when unsure; avoid deprecated APIs and heed deprecation notices.
- Keep generated UI aligned with the Shelfgram Stitch direction: cozy editorial, warm cream surfaces, forest-green primary, muted brown accents, Noto Serif headings, Manrope body, soft rounded controls, paper-grain/ambient depth when useful.
- After UI/code changes, run `npm run lint`; run `npm run build` when changes touch routing, server/client boundaries, auth, Prisma, or framework APIs.

## Data And Auth

- Prisma v7 schema is `src/prisma/schema.prisma`; `prisma.config.ts` loads `.env` and points migrations to `src/prisma/migrations`.
- The app Prisma client is `src/lib/db.ts`, using `@prisma/adapter-pg` with `pg.Pool` and `DATABASE_URL`.
- Required env vars inferred from code: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`; optional `RESEND_FROM_EMAIL`.
- NextAuth v5 config lives in `src/lib/auth.ts` and exports `{ handlers, signIn, signOut, auth }`; `src/app/api/auth/[...nextauth]/route.ts` only re-exports `GET`/`POST`.
- Auth uses JWT sessions even though standard NextAuth Prisma models are in the schema; credentials login requires `emailVerified` and a bcrypt password, while Google sign-in auto-verifies existing users.
- Email registration flow is split across `src/actions/auth.ts`, `src/lib/email.ts`, and `GET /api/auth/verify-email`.

## Gotchas

- `src/lib/proxy.ts` contains route-protection logic, but there is no root or `src/` framework proxy/middleware entrypoint importing it; verify the current Next 16 docs before wiring or renaming it.
- `.gitignore` ignores `/src/prisma/migrations`, so newly generated migrations may be hidden unless explicitly handled.
- `implementation_plan.md` is stale in places: it says the project does not use `src/`, but the implemented app does.
- Do not edit generated output in `.next/`, `next-env.d.ts`, or `node_modules/`.
