-- Monetization schema for VaultEngine

-- Subscription tiers
create table if not exists vault_tiers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  price_cents integer not null default 0,
  currency text not null default 'USD',
  description text,
  max_assets integer, -- null = unlimited
  max_downloads_per_month integer, -- usage limit example
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

-- Subscriptions (buyer subscriptions to tiers)
create table if not exists vault_subscriptions (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references vault_users(id) on delete cascade,
  tier_id uuid not null references vault_tiers(id) on delete restrict,
  status text not null default 'active', -- active, cancelled, past_due
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  billing_provider_subscription_id text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

-- Entitlements granted to buyers (feature flags / unlocked assets)
create table if not exists vault_entitlements (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references vault_users(id) on delete cascade,
  asset_id uuid references vault_assets(id) on delete set null,
  feature text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

-- Simple transactions log (purchase history)
create table if not exists vault_transactions (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references vault_users(id) on delete cascade,
  subscription_id uuid references vault_subscriptions(id) on delete set null,
  amount_cents integer not null,
  currency text not null default 'USD',
  provider text,
  provider_charge_id text,
  status text not null default 'succeeded',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Paywall states for assets (e.g., paywalled, free, promo)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vault_paywall_state') THEN
    CREATE TYPE vault_paywall_state AS ENUM ('free','paywalled','promo');
  END IF;
END $$;

alter table if exists vault_assets add column if not exists paywall_state vault_paywall_state default 'free';

create index if not exists idx_vault_subscriptions_buyer_id on vault_subscriptions(buyer_id);
create index if not exists idx_vault_tiers_slug on vault_tiers(slug);
create index if not exists idx_vault_transactions_buyer_id on vault_transactions(buyer_id);
create index if not exists idx_vault_entitlements_buyer_id on vault_entitlements(buyer_id);
