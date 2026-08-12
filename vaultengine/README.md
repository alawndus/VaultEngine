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
