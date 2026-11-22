import { NextResponse } from 'next/server'
import {
  prefillTicketFromReceiptPhoto,
  prefillTicketFromReceptionExcel,
  type ReceiptPrefillResult,
} from '@/lib/tickets/receiptPrefillService'
import { isReceptionSpreadsheetFile } from '@/lib/tickets/parseReceptionExcel'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('receipt')
    const result: ReceiptPrefillResult =
      file instanceof File && isReceptionSpreadsheetFile(file)
        ? await prefillTicketFromReceptionExcel(formData)
        : await prefillTicketFromReceiptPhoto(formData)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[API receipt-prefill]', err)
    const message = err instanceof Error ? err.message : 'Error al procesar el recibo'
    return NextResponse.json(
      {
        success: false,
        error: message,
        parsed: null,
        client: null,
        clientCreated: false,
        brands: [],
        models: [],
        productTypes: [],
        items: [],
        pickup_address: null,
        pickup_date: null,
        notes: null,
        xsi_order_number: null,
        epc_order_number: null,
      } satisfies ReceiptPrefillResult,
      { status: 500 }
    )
  }
}