import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from './supabaseClient'

function getMagicTokenSecret(): string {
  const secret = process.env.VAULT_TOKEN_SECRET
  if (!secret) {
    throw new Error('VaultEngine requires VAULT_TOKEN_SECRET environment variable.')
  }
  return secret
}

function hashMagicToken(token: string): string {
  return crypto.createHmac('sha256', getMagicTokenSecret()).update(token).digest('hex')
}

async function revokeToken(tokenId: string, reason: string) {
  const supabase = getSupabaseClient()
  await supabase
    .from('vault_magic_tokens')
    .update({ status: 'revoked', revoked_at: new Date().toISOString(), revoke_reason: reason })
    .eq('id', tokenId)
}

async function recordAuditEvent(tokenId: string, eventType: string, payload: Record<string, unknown>) {
  const supabase = getSupabaseClient()
  await supabase.from('vault_access_audit').insert([
    {
      token_id: tokenId,
      event_type: eventType,
      event_payload: payload,
    },
  ])
}

export type ValidatedVaultAccess = {
  tokenId: string
  buyerId: string
  asset: {
    id: string
    title: string
    description: string | null
    content_url: string
    content_type: string
    is_active: boolean
  }
}

export async function validateMagicToken(token: string, assetId: string, buyerId?: string): Promise<ValidatedVaultAccess> {
  const tokenHash = hashMagicToken(token)
  const supabase = getSupabaseClient()

  const { data: tokenRow, error: tokenError } = await supabase
    .from('vault_magic_tokens')
    .select('id, asset_id, buyer_id, expires_at, consumed_at, revoked_at, status, metadata')
    .eq('token_hash', tokenHash)
    .single()

  if (tokenError || !tokenRow) {
    throw new Error('Invalid or tampered magic token.')
  }

  if (tokenRow.asset_id !== assetId) {
    await revokeToken(tokenRow.id, 'Asset mismatch')
    throw new Error('Magic token does not match the requested asset.')
  }

  if (buyerId && tokenRow.buyer_id !== buyerId) {
    await revokeToken(tokenRow.id, 'Buyer mismatch')
    throw new Error('Magic token buyer does not match.')
  }

  if (tokenRow.status !== 'active' || tokenRow.revoked_at || tokenRow.consumed_at) {
    throw new Error('This magic link has already been consumed or revoked.')
  }

  const now = new Date()
  if (new Date(tokenRow.expires_at) <= now) {
    await revokeToken(tokenRow.id, 'Expired token access attempt')
    throw new Error('This magic link has expired.')
  }

  const { data: asset, error: assetError } = await supabase
    .from('vault_assets')
    .select('id, title, description, content_url, content_type, is_active')
    .eq('id', assetId)
    .single()

  if (assetError || !asset) {
    await revokeToken(tokenRow.id, 'Asset fetch failed')
    throw new Error('Unable to fetch the requested asset.')
  }

  if (!asset.is_active) {
    await revokeToken(tokenRow.id, 'Asset inactive')
    throw new Error('This asset is no longer available.')
  }

  const { data: updatedRows, error: updateError } = await supabase
    .from('vault_magic_tokens')
    .update({ consumed_at: new Date().toISOString(), status: 'consumed', last_accessed_at: new Date().toISOString() })
    .match({ id: tokenRow.id, status: 'active', consumed_at: null })
    .select('id')

  if (updateError || !updatedRows || updatedRows.length !== 1) {
    throw new Error('Magic token could not be consumed or has already been used.')
  }

  await recordAuditEvent(tokenRow.id, 'token_consumed', {
    assetId,
    buyerId: tokenRow.buyer_id,
    timestamp: new Date().toISOString(),
  })

  return {
    tokenId: tokenRow.id,
    buyerId: tokenRow.buyer_id,
    asset,
  }
}

export async function verifyMagicTokenMiddleware(request: NextRequest) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token') ?? request.headers.get('x-vault-magic-token')
  const assetId = url.searchParams.get('assetId') ?? request.headers.get('x-vault-asset-id')
  const buyerId = url.searchParams.get('buyerId') ?? request.headers.get('x-vault-buyer-id')

  if (!token || !assetId) {
    return NextResponse.json(
      { error: 'Missing magic token or asset identifier.' },
      { status: 401 },
    )
  }

  try {
    await validateMagicToken(token, assetId, buyerId ?? undefined)
    return NextResponse.next()
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unauthorized access.' },
      { status: 401 },
    )
  }
}
