# Copilot Instructions for codespaces-react

## Repository Structure

This is a monorepo containing two separate applications:

1. **Root directory** — A Vite + React 18 frontend app
2. **`/vaultengine`** — A Next.js 14 App Router backend with Supabase integration

## Build, Test & Lint Commands

### Root React App (Vite)
- **Start dev server**: `npm start` (runs on port 3000)
- **Run tests**: `npm test` (Vitest in watch mode)
- **Build for production**: `npm run build`
- **Preview production build**: `npm preview`

### VaultEngine (Next.js)
Navigate to `/vaultengine` first or adjust commands:
- **Start dev server**: `npm run dev` (runs on port 3000 by default)
- **Lint code**: `npm run lint` (ESLint)
- **Build**: `npm run build`
- **Start production server**: `npm start`
- **Generate secure secret**: `npm run gen-secret`
- **Seed database**: `npm run seed` (creates test data in Supabase)

### Testing Strategy
- Root app uses **Vitest** with jsdom environment
- VaultEngine has no test scripts defined; uses Next.js built-in linting

## Architecture Overview

### VaultEngine: Magic-Link Based Asset Delivery

The core architecture revolves around cryptographically secure, ephemeral access to protected assets:

1. **Magic Token System** (`/vaultengine/src/lib/vaultAuth.ts`):
   - Uses HMAC-SHA256 to hash tokens with `VAULT_TOKEN_SECRET` env var
   - Tokens are single-use, time-bound (expires_at), revocable
   - Each token references a specific asset and optional buyer ID
   - Validates token authenticity before granting access

2. **Supabase Schema** (referenced in code but not included):
   - `vault_magic_tokens` — Token storage and status tracking
   - `vault_assets` — Asset metadata and content references
   - `vault_access_audit` — Audit log of token consumption
   - Service Role key required for server-side operations

3. **API Routes** (`/vaultengine/src/app/api/vault/content/route.ts`):
   - Token validation middleware rejects requests missing token/assetId
   - Tokens can be passed via query params or headers (x-vault-magic-token, x-vault-asset-id, x-vault-buyer-id)
   - Returns 401 for invalid/expired/consumed tokens

4. **Environment Configuration**:
   - Copy `.env.example` to `.env.local` before running
   - Required: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VAULT_TOKEN_SECRET`
   - Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_APP_URL` for client-side and local Next.js compatibility
   - `.env.local` and `.env*.local` must NOT be committed (contains secrets)
   - For standalone Node scripts, use `node --env-file=.env.local <script-path>`

5. **Supabase Migration Safety**:
   - Always check whether required tables like `public.vault_users` exist before running seed or mutation scripts
   - If a migration file exists in `supabase/migrations/` or the repo root, run it in the Supabase SQL Editor whenever `DATABASE_URL` or `SUPABASE_ACCESS_TOKEN` is not available in `.env.local`
   - If tables are missing, stop with a clear message instead of an unhandled exception

### Root React App
- Simple Vite + React starter with test fixtures
- Tests using React Testing Library + Vitest

## Key Conventions & Patterns

### VaultEngine-Specific

1. **Security Patterns**:
   - Never log or expose the actual `VAULT_TOKEN_SECRET`
   - Tokens are always hashed before database storage
   - Use `.single()` query when expecting exactly one row to prevent leaks
   - Revoke tokens immediately on validation failures (mismatched assetId, expired, etc.)

2. **Type Safety**:
   - TypeScript with strict mode enabled in `tsconfig.json`
   - Use `ValidatedVaultAccess` type when passing vault data between functions
   - NextRequest/NextResponse for API route handlers

3. **Error Handling**:
   - Throw descriptive errors in validation logic; let middleware catch and return 401
   - Record audit events before revoking tokens for debugging
   - Validation failures trigger both revocation and audit logging

4. **Database Interactions**:
   - All Supabase queries use `getSupabaseClient()` from `supabaseClient.ts`
   - Use `.eq()`, `.single()`, `.match()` for precise filtering
   - Include `.select()` to explicitly declare needed columns

### File Organization
- `/vaultengine/src/lib/` — Utility functions (auth, magic link, supabase client)
- `/vaultengine/src/app/` — Next.js App Router pages and API routes
- `/vaultengine/src/components/` — React components (currently minimal)
- `/vaultengine/scripts/` — Utility scripts (seed-supabase.mjs)

## Common Tasks

### Extending VaultEngine
- Add new API routes to `/vaultengine/src/app/api/`
- Extend `validateMagicToken()` for new validation rules
- Update types in `vaultAuth.ts` for new token metadata
- Remember to seed test data after schema changes (`npm run seed`)

### Working with Environment
- Use `process.env.VAULT_TOKEN_SECRET` to access secrets in server code
- Use `process.env.NEXT_PUBLIC_*` only for public client-side constants
- Never hardcode secrets; always throw if required env vars are missing (see `getMagicTokenSecret()`)

### Adding Dependencies
- Root app: `npm install <package>` (installs to root package.json)
- VaultEngine: `cd vaultengine && npm install <package>`
