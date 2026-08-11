import { NextRequest, NextResponse } from 'next/server'
import { validateMagicToken } from '../../../../lib/vaultAuth'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')
  const assetId = url.searchParams.get('assetId')
  const buyerId = url.searchParams.get('buyerId')

  if (!token || !assetId) {
    return NextResponse.json({ error: 'Missing required token or asset ID.' }, { status: 400 })
  }

  try {
    const validated = await validateMagicToken(token, assetId, buyerId ?? undefined)

    return NextResponse.json(
      {
        asset: {
          id: validated.asset.id,
          title: validated.asset.title,
          description: validated.asset.description,
          contentUrl: validated.asset.content_url,
          contentType: validated.asset.content_type,
        },
      },
      { status: 200 },
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unauthorized access.' },
      { status: 401 },
    )
  }
}
