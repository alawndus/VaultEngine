# VaultEngine (local)

This folder contains a small Next.js App Router example for VaultEngine — a magic-link based secure asset viewer backed by Supabase.

## Quick setup

1. Copy the example env file and fill in your Supabase values:

```bash
cd vaultengine
cp .env.example .env.local
# edit .env.local and add your real SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAULT_TOKEN_SECRET
```

1. Generate a secure vault token secret (optional helper):

```bash
npm run gen-secret
# copy output into .env.local as VAULT_TOKEN_SECRET
```

3. Install and start:

```bash
npm install
npm run dev
```

4. (Optional) Seed Supabase with a demo user/asset and generate a magic link:

```bash
# Ensure .env.local has your SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and VAULT_TOKEN_SECRET
npm run seed
# the script will print a magic link you can open in the browser
```

## Notes

- Do NOT commit `.env.local` to source control — it contains secrets.
- The `seed` script uses the Supabase Service Role key and will create rows in the `vault_*` tables. Run only against test/dev projects.
- For production, rotate the `VAULT_TOKEN_SECRET` carefully and revoke tokens if required.

## Database migrations (release steps)

Before seeding or running in production, apply the SQL migrations in the Supabase SQL Editor (or via the Supabase CLI) in this order:

1. vaultengine/supabase/migrations/20260811_vaultengine_schema.sql
2. vaultengine/supabase/migrations/20260812_monetization_schema.sql

Examples:

- Supabase SQL Editor: open your project > SQL Editor > New query. Paste the contents of each migration file and run them.

- psql (if you have a DB connection string):

  psql "$SUPABASE_DB_URL" -f vaultengine/supabase/migrations/20260811_vaultengine_schema.sql
  psql "$SUPABASE_DB_URL" -f vaultengine/supabase/migrations/20260812_monetization_schema.sql

After migrations are applied, run:

  cd vaultengine
  npm run seed

The seed script will create demo users, a demo asset, a magic token, example tiers and subscriptions (for development), and print a demo magic link.

## Monetization notes

- The repository includes a simple monetization schema (tiers, subscriptions, entitlements, transactions). This is a demo: integrate a real billing provider (Stripe, Paddle, etc.) for production use.
- Configure billing credentials in `.env.local` (see `.env.example`) before running any production migration or seeding that touches billing tables.
- The application currently uses `paywall_state` on `vault_assets` to indicate whether an asset is free or paywalled. Implement server-side checks to require active subscriptions or entitlements before granting access to paywalled assets.
