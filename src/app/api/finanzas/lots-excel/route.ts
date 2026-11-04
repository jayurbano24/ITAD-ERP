import { NextResponse } from 'next/server'
import { buildLotsFinanceWorkbookBuffer } from '@/lib/finanzas/exportLotsExcel'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const { buffer, fileName } = await buildLotsFinanceWorkbookBuffer()
    const body = Buffer.from(buffer)
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[finanzas/lots-excel]', error)
    const message = error instanceof Error ? error.message : 'Error generando Excel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
