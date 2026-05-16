<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project Shape

- Single-package npm app (`package-lock.json` v3), Next.js `16.2.5`, React `19.2.4`, TypeScript strict mode.
- Real source is under `src/`: App Router routes in `src/app`, auth UI in `src/features/auth`, shared code in `src/lib`, server actions in `src/actions`.
- Path alias is `@/* -> ./src/*`; prefer it for app imports.
- Tailwind v4 is configured through `src/app/globals.css` and `@tailwindcss/postcss`; shadcn config is `components.json` with UI aliases to `@/components/ui`.
- Use feature folders under `src/features/<feature>/`; for auth, UI components live in `components/` and Zod schemas in `schemas/`.

## Commands

- Install: `npm install`.
- Dev server: `npm run dev`.
- Lint: `npm run lint`.
- Production build/typecheck: `npm run build` (there is no separate `typecheck` script).
- Prisma: use the npm scripts because the schema is not at the default path: `npm run prisma:generate`, `npm run prisma:migrate`, `npm run prisma:push`, `npm run prisma:studio`.
- No test runner, CI workflow, formatter script, or pre-commit config is present; do not invent test commands.

## Frontend Standards

- UI must be responsive across mobile, tablet, and desktop; review layouts with small-screen-first Tailwind classes before finalizing.
- Always use existing shadcn UI components from `src/components/ui` as the default for interface primitives: buttons, inputs, labels, cards, dialogs, sheets, scroll areas, separators, toasts, avatars, tooltips, and similar elements. Do not use raw/default HTML tags for these controls when a matching shadcn component exists; raw HTML is only acceptable when no suitable shadcn primitive exists or the shadcn component would be semantically inappropriate.
- Do not overuse `Card` or fall back to repetitive box-on-box layouts. Prefer lighter compositions such as split panels, list rows, soft dividers, inset sections, and whitespace-driven grouping. Use cards only when they add clear semantic grouping or interaction value.
- Favor a minimalist, modern visual rhythm: fewer decorative icons, less repeated metadata, and only the information needed for the current decision. Avoid stacking multiple generic badges, stat chips, and nested bordered containers unless they materially improve comprehension.
- Prefer Server Components for App Router `page.tsx` files and static layout/marketing UI. For interactive screens, compose a server shell with focused Client Component islands instead of making the whole page client-side.
- For auth routes, keep static page structure in `*-shell.tsx` Server Components and form behavior in `*-form.tsx` Client Components, e.g. `LoginShell` + `LoginForm`, `RegisterShell` + `RegisterForm`, and `SetPasswordShell` + `SetPasswordForm`.
- Before importing a component, hook, icon, or framework API, verify it exists in this repo/dependency version; do not leave speculative imports or imports from packages that are not installed.
- For input-driven search, autosave, typing indicators, or any insert/update triggered by text input, debounce the server/network call with `usehooks-ts` (`useDebounceCallback` or `useDebounceValue`). The raw `onChange` handler should update local state only; never call Server Actions, database-backed fetches, Redis writes, or websocket broadcast endpoints on every keystroke.
- Build forms with `react-hook-form` plus Zod schemas/resolvers; keep form schemas near the feature (for auth, `src/features/auth/schemas/auth-schemas.ts`) and avoid hand-rolled `FormEvent` submit handlers.
- Keep Client Component boundaries narrow: `"use client"` belongs on interactive form/control files only, not on route pages or static shells unless there is a concrete browser API/state requirement.
- Redux Toolkit is installed, but only use it for genuinely shared app state; keep local UI state such as password visibility in component state, and do not put form state in Redux.
- If Redux becomes necessary, keep one app store and colocate feature slices under `src/features/<feature>/store/`.
- For Next.js or React APIs, check the installed Next `16.2.5` docs in `node_modules/next/dist/docs/` when unsure; avoid deprecated APIs and heed deprecation notices.
- Keep generated UI aligned with the Shelfgram Stitch direction: cozy editorial, warm cream surfaces, forest-green primary, muted brown accents, Noto Serif headings, Manrope body, soft rounded controls, paper-grain/ambient depth when useful.
- After UI/code changes, run `npm run lint`; run `npm run build` when changes touch routing, server/client boundaries, auth, Prisma, or framework APIs.

## Data And Auth

- Prisma v7 schema is `src/prisma/schema.prisma`; `prisma.config.ts` loads `.env` and points migrations to `src/prisma/migrations`.
- The app Prisma client is `src/lib/db.ts`, using `@prisma/adapter-pg` with `pg.Pool` and `DATABASE_URL`.
- When adding or changing any Prisma table, model, enum, relation, or column, immediately run the required Prisma sync commands: `npm run prisma:generate` and `npm run prisma:push`. The user has pre-approved these commands for schema changes. Do not use destructive flags such as `--accept-data-loss` unless the user explicitly approves that specific risk.
- Required env vars inferred from code: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `NEXT_PUBLIC_APP_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`; optional `SMTP_SECURE`, `EMAIL_FROM`.
- NextAuth v5 config lives in `src/lib/auth.ts` and exports `{ handlers, signIn, signOut, auth }`; `src/app/api/auth/[...nextauth]/route.ts` only re-exports `GET`/`POST`.
- Auth uses JWT sessions even though standard NextAuth Prisma models are in the schema; credentials login requires `emailVerified` and a bcrypt password, while Google sign-in auto-verifies existing users.
- Email registration flow is split across `src/actions/auth.ts`, `src/lib/email.ts`, and `GET /api/auth/verify-email`.
- Auth UI follows a server-shell/client-form split: route pages under `src/app/auth` compose shell and form components; server actions stay in `src/actions/auth.ts`; validation schemas stay in `src/features/auth/schemas/auth-schemas.ts`.

## Gotchas

- `src/lib/proxy.ts` contains route-protection logic, but there is no root or `src/` framework proxy/middleware entrypoint importing it; verify the current Next 16 docs before wiring or renaming it.
- `.gitignore` ignores `/src/prisma/migrations`, so newly generated migrations may be hidden unless explicitly handled.
- `implementation_plan.md` is stale in places: it says the project does not use `src/`, but the implemented app does.
- Do not edit generated output in `.next/`, `next-env.d.ts`, or `node_modules/`.
