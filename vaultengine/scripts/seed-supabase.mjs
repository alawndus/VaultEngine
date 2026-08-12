import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { execSync } from 'child_process'
import fs from 'fs'

const SUPABASE_URL = process.env.SUPABASE_URL
const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const VAULT_TOKEN_SECRET = process.env.VAULT_TOKEN_SECRET
const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !VAULT_TOKEN_SECRET) {
  console.error('Please set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and VAULT_TOKEN_SECRET in your environment or .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function main() {
  try {
    // Basic preflight: existing core tables
    const { error } = await supabase.from('vault_users').select('id').limit(1)

    if (error && /Could not find the table|schema cache/i.test(error.message)) {
      console.error('Supabase schema is missing required tables before seeding.')
      console.error('Please run the migrations in the Supabase SQL Editor:')
      console.error('  vaultengine/supabase/migrations/20260811_vaultengine_schema.sql')
      console.error('  vaultengine/supabase/migrations/20260812_monetization_schema.sql')
      console.error('Then rerun: cd /workspaces/codespaces-react/vaultengine && npm run seed')
      process.exit(1)
    }

    if (error) {
      throw error
    }

    // Additional monetization schema check: vault_tiers
    const { error: tierError } = await supabase.from('vault_tiers').select('id').limit(1)
    if (tierError) {
      console.error('Monetization schema (vault_tiers, vault_subscriptions, etc.) appears to be missing.')
      console.error('Please run the migrations in the Supabase SQL Editor:')
      console.error('  vaultengine/supabase/migrations/20260811_vaultengine_schema.sql')
      console.error('  vaultengine/supabase/migrations/20260812_monetization_schema.sql')
      console.error('Then rerun: cd /workspaces/codespaces-react/vaultengine && npm run seed')
      process.exit(1)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Seed preflight check failed before inserting demo data.')
    console.error('If the database schema is missing, run the migrations in the Supabase SQL Editor:')
    console.error('  vaultengine/supabase/migrations/20260811_vaultengine_schema.sql')
    console.error('  vaultengine/supabase/migrations/20260812_monetization_schema.sql')
    console.error('Then rerun: cd /workspaces/codespaces-react/vaultengine && npm run seed')
    console.error(`Underlying error: ${message}`)
    process.exit(1)
  }

  // Create demo user
  const email = process.env.DEMO_USER_EMAIL ?? 'demo@local'
  const name = process.env.DEMO_USER_NAME ?? 'Demo User'

  const { data: userData, error: userError } = await supabase
    .from('vault_users')
    .insert([{ email, name }])
    .select('id')
    .single()

  if (userError) {
    console.error('Failed to create demo user:', userError.message)
    process.exit(1)
  }

  const buyerId = userData.id

  // Create demo asset
  const { data: assetData, error: assetError } = await supabase
    .from('vault_assets')
    .insert([
      {
        title: process.env.DEMO_ASSET_TITLE ?? 'Demo Asset',
        description: process.env.DEMO_ASSET_DESCRIPTION ?? 'Demo secure image',
        content_url: process.env.DEMO_ASSET_URL ?? 'https://images.unsplash.com/photo-1563298723-dcfebaa392e3',
        content_type: process.env.DEMO_ASSET_CONTENT_TYPE ?? 'image/jpeg',
        is_active: true,
      },
    ])
    .select('id')
    .single()

  if (assetError) {
    console.error('Failed to create demo asset:', assetError.message)
    process.exit(1)
  }

  const assetId = assetData.id

  // Monetization: create demo tiers (upsert by slug)
  const demoTiers = [
    { slug: 'free', title: 'Free', price_cents: 0, currency: 'USD', description: 'Free tier (limited)', max_assets: 5 },
    { slug: 'basic', title: 'Basic', price_cents: 500, currency: 'USD', description: 'Basic monthly subscription', max_assets: 100 },
    { slug: 'pro', title: 'Pro', price_cents: 1999, currency: 'USD', description: 'Pro tier with unlimited assets', max_assets: null },
  ]

  const { data: tiersUpserted, error: tiersError } = await supabase
    .from('vault_tiers')
    .upsert(demoTiers, { onConflict: 'slug' })
    .select('id,slug')

  if (tiersError) {
    console.error('Failed to upsert demo tiers:', tiersError.message)
    process.exit(1)
  }

  // Map slug -> id
  const tierMap = {}
  for (const t of tiersUpserted) {
    tierMap[t.slug] = t.id
  }

  // Create an active demo subscription for the user to the 'basic' tier
  const { data: subData, error: subError } = await supabase
    .from('vault_subscriptions')
    .insert([
      {
        buyer_id: buyerId,
        tier_id: tierMap['basic'],
        status: 'active',
        starts_at: new Date().toISOString(),
        metadata: { seeded: true },
      },
    ])
    .select('id')
    .single()

  if (subError) {
    console.error('Failed to create demo subscription:', subError.message)
    process.exit(1)
  }

  const subscriptionId = subData.id

  // Grant an entitlement for the demo asset to the demo user (short-lived)
  const entitlementExpiresAt = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString() // 30 days
  const { data: entData, error: entError } = await supabase
    .from('vault_entitlements')
    .insert([
      {
        buyer_id: buyerId,
        asset_id: assetId,
        feature: 'access',
        expires_at: entitlementExpiresAt,
        metadata: { seeded: true },
      },
    ])
    .select('id')
    .single()

  if (entError) {
    console.error('Failed to create entitlement:', entError.message)
    process.exit(1)
  }

  // Create a demo transaction record (succeeded)
  const { data: txData, error: txError } = await supabase
    .from('vault_transactions')
    .insert([
      {
        buyer_id: buyerId,
        subscription_id: subscriptionId,
        amount_cents: 500,
        currency: 'USD',
        provider: process.env.BILLING_PROVIDER ?? 'stripe',
        provider_charge_id: 'demo_charge_1',
        status: 'succeeded',
        metadata: { seeded: true },
      },
    ])
    .select('id')
    .single()

  if (txError) {
    console.error('Failed to create demo transaction:', txError.message)
    process.exit(1)
  }

  // Optionally mark the demo asset as paywalled
  const paywalled = (process.env.DEMO_ASSET_PAYWALL ?? 'paywalled')
  if (paywalled === 'paywalled') {
    const { error: updateAssetError } = await supabase
      .from('vault_assets')
      .update({ paywall_state: 'paywalled' })
      .eq('id', assetId)

    if (updateAssetError) {
      console.error('Failed to mark asset as paywalled:', updateAssetError.message)
      process.exit(1)
    }
  }

  // Generate magic token
  const rawToken = crypto.randomBytes(48).toString('hex')
  const tokenHash = crypto.createHmac('sha256', VAULT_TOKEN_SECRET).update(rawToken).digest('hex')
  const expiresAt = new Date(Date.now() + (15 * 60 * 1000)).toISOString()

  const { data: tokenData, error: tokenError } = await supabase
    .from('vault_magic_tokens')
    .insert([
      {
        buyer_id: buyerId,
        asset_id: assetId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        status: 'active',
        metadata: { seeded: true },
      },
    ])
    .select('id')
    .single()

  if (tokenError) {
    console.error('Failed to create magic token:', tokenError.message)
    process.exit(1)
  }

  const appUrl = (NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  const magicLink = `${appUrl}/api/vault/content?token=${rawToken}&assetId=${assetId}`

  console.log('\nSeed complete:')
  console.log('  Demo user id:', buyerId)
  console.log('  Demo asset id:', assetId)
  console.log('  Demo subscription id:', subscriptionId)
  console.log('  Demo entitlement id:', entData.id)
  console.log('  Demo transaction id:', txData.id)
  console.log('  Magic link (valid 15 minutes):')
  console.log(`  ${magicLink}\n`)
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
