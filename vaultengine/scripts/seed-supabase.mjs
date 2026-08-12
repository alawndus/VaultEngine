import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

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

  const magicLink = `${NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/api/vault/content?token=${rawToken}&assetId=${assetId}`

  console.log('\nSeed complete:')
  console.log('  Demo user id:', buyerId)
  console.log('  Demo asset id:', assetId)
  console.log('  Magic link (valid 15 minutes):')
  console.log(`  ${magicLink}\n`)
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
