import { NextRequest, NextResponse } from 'next/server'
import bwip from 'bwip-js'

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const value = searchParams.get('value')

    if (!value) {
      return NextResponse.json({ error: 'Missing value parameter' }, { status: 400 })
    }

    // Generate barcode PNG
    const png = await bwip.toBuffer({
      bcid: 'code128',
      text: value,
      scale: 3,
      height: 10,
      includetext: true,
      textxalign: 'center'
    })

    return new NextResponse(png as any, {
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
