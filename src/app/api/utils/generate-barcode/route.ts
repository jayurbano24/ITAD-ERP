import { NextRequest, NextResponse } from 'next/server'
import bwip from 'bwip-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const value = searchParams.get('value')?.trim()

    if (!value) {
      return NextResponse.json({ error: 'Missing value parameter' }, { status: 400 })
    }

    const includetext = searchParams.get('text') !== '0'
    const scale = Math.min(4, Math.max(1, Number(searchParams.get('scale')) || 3))
    const height = Math.min(20, Math.max(4, Number(searchParams.get('height')) || 10))

    const png = await bwip.toBuffer({
      bcid: 'code128',
      text: value,
      scale,
      height,
      includetext,
      textxalign: 'center',
    })

    return new NextResponse(png as BodyInit, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400'
      }
    })
  } catch (error) {
    console.error('Barcode generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate barcode' },
      { status: 500 }
    )
  }
}
