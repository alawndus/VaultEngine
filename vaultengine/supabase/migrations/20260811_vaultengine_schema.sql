-- VaultEngine Supabase schema migration

create extension if not exists "pgcrypto";

create table if not exists vault_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists vault_assets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  content_url text not null,
  content_type text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  storage_metadata jsonb not null default '{}'::jsonb
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vault_token_status') THEN
    CREATE TYPE vault_token_status AS ENUM ('active', 'consumed', 'expired', 'revoked');
  END IF;
END $$;

create table if not exists vault_magic_tokens (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references vault_users(id) on delete cascade,
  asset_id uuid not null references vault_assets(id) on delete cascade,
  token_hash text not null unique,
  status vault_token_status not null default 'active',
  expires_at timestamptz not null,
  consumed_at timestamptz,
  revoked_at timestamptz,
  last_accessed_at timestamptz,
  revoke_reason text,
  return_to text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_vault_magic_tokens_asset_id on vault_magic_tokens(asset_id);
create index if not exists idx_vault_magic_tokens_buyer_id on vault_magic_tokens(buyer_id);
create index if not exists idx_vault_magic_tokens_expires_at on vault_magic_tokens(expires_at);
create index if not exists idx_vault_magic_tokens_status on vault_magic_tokens(status);

create table if not exists vault_access_audit (
  id uuid primary key default gen_random_uuid(),
  token_id uuid not null references vault_magic_tokens(id) on delete cascade,
  buyer_id uuid not null,
  asset_id uuid not null,
  event_type text not null,
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create function if not exists vault_magic_token_expiration_check() returns trigger as $$
begin
  if new.expires_at <= now() then
    new.status := 'expired';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger if not exists trigger_vault_magic_token_status
before insert or update on vault_magic_tokens
for each row
execute procedure vault_magic_token_expiration_check();
