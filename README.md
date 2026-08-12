# VaultEngine Repository

This monorepo contains two applications:

- A Vite + React frontend app in the repository root (development served on port 3000).
- `vaultengine/` — a Next.js App Router backend that implements a magic-link based secure asset delivery system backed by Supabase.

This README covers quick commands and where to look for the VaultEngine implementation.

## Root (Vite + React)

Commands (run from repository root):

```bash
npm install
npm start        # dev server on http://localhost:3000
npm test         # run Vitest
npm run build    # production build
npm run preview  # preview production build
```

The root app is a simple starter and test harness. See `src/` for the React source and tests.

## VaultEngine (Next.js + Supabase)

Location: `vaultengine/`

Quick start:

```bash
cd vaultengine
cp .env.example .env.local   # populate SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAULT_TOKEN_SECRET
npm install
npm run dev                  # start Next.js on port 3000 (or override)
```

Optional helpers in `vaultengine`:
- `npm run gen-secret` — generate a secure `VAULT_TOKEN_SECRET` for local testing
- `npm run seed` — seed demo user, asset, and a magic link (uses Service Role key; run only on dev/test)

See [vaultengine/README.md](vaultengine/README.md#L1) for detailed VaultEngine setup notes and security guidance.

## Environment

Critical environment variables for VaultEngine (set in `vaultengine/.env.local`):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only secret)
- `VAULT_TOKEN_SECRET` (HMAC secret used to hash tokens)
- `NEXT_PUBLIC_APP_URL` or `VAULT_BASE_URL` (used to construct magic links)

Do NOT commit `.env.local` or any secrets to source control.

## Security notes

- Tokens are HMAC-hashed before storage; the server verifies hashes when consuming tokens.
- Tokens are intended single-use and time-limited. Reviewers should check atomic consumption and audit logging.
- Asset delivery currently returns `content_url` — consider using signed URLs or a secure proxy in production.

## License

This repository is licensed under the MIT License. See `LICENSE` for details.

## Where to look

- Vault logic: `vaultengine/src/lib/vaultAuth.ts`, `vaultengine/src/lib/vaultMagicLink.ts`
- API route: `vaultengine/src/app/api/vault/content/route.ts`
- Supabase schema/migrations: `vaultengine/supabase/migrations/`

If you'd like, I can update the project website, add badges, or scaffold a short CONTRIBUTING guide.
