import crypto from 'crypto'
import { supabase } from './supabaseClient'

const MAGIC_TOKEN_SECRET = process.env.VAULT_TOKEN_SECRET
const BASE_URL = process.env.VAULT_BASE_URL ?? 'https://vaultengine.example.com'
const DEFAULT_TOKEN_TTL_SECONDS = 15 * 60

if (!MAGIC_TOKEN_SECRET) {
  throw new Error('VaultEngine requires VAULT_TOKEN_SECRET environment variable.')
}

function getMagicTokenSecret(): string {
  return MAGIC_TOKEN_SECRET as string
}

function hashMagicToken(token: string): string {
  return crypto.createHmac('sha256', getMagicTokenSecret()).update(token).digest('hex')
}

export type MagicLinkPayload = {
  magicLink: string
  expiresAt: string
  tokenId: string
  buyerId: string
  assetId: string
}

export async function generateMagicLinkForAsset({
  buyerId,
  assetId,
  expiresInSeconds = DEFAULT_TOKEN_TTL_SECONDS,
  returnTo,
}: {
  buyerId: string
  assetId: string
  expiresInSeconds?: number
  returnTo?: string
}): Promise<MagicLinkPayload> {
  const rawToken = crypto.randomBytes(48).toString('hex')
  const tokenHash = hashMagicToken(rawToken)
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString()

  const { data, error } = await supabase
    .from('vault_magic_tokens')
    .insert([
      {
        buyer_id: buyerId,
        asset_id: assetId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        status: 'active',
        return_to: returnTo ?? null,
        metadata: {
          source: 'vault-magic-link-generator',
        },
      },
    ])
    .select('id, buyer_id, asset_id, expires_at')
    .single()

  if (error || !data) {
    throw new Error(`VaultEngine token creation failed: ${error?.message ?? 'unknown error'}`)
  }

  const magicLinkUrl = new URL('/api/vault/content', BASE_URL)
  magicLinkUrl.searchParams.set('token', rawToken)
  magicLinkUrl.searchParams.set('assetId', assetId)

  if (returnTo) {
    magicLinkUrl.searchParams.set('returnTo', returnTo)
  }

  return {
    magicLink: magicLinkUrl.toString(),
    expiresAt,
    tokenId: data.id,
    buyerId: data.buyer_id,
    assetId: data.asset_id,
  }
}
