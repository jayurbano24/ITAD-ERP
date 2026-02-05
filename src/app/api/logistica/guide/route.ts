import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { parse } from 'csv-parse/sync'
import * as xlsx from 'xlsx'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const formData = await request.formData()
  const file = formData.get('file') as File
  const ticketId = formData.get('ticketId') as string

  if (!file) {
    return NextResponse.json({ error: 'No se ha subido ningún archivo.' }, { status: 400 })
  }

  if (!ticketId) {
    return NextResponse.json({ error: 'No se ha proporcionado el ID del ticket.' }, { status: 400 })
  }

  try {
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    let records: any[] = []

    if (file.name.endsWith('.csv')) {
      records = parse(buffer, {
        columns: true,
        skip_empty_lines: true,
      })
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const workbook = xlsx.read(buffer, { type: 'buffer' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      records = xlsx.utils.sheet_to_json(worksheet)
    } else {
      return NextResponse.json({ error: 'Formato de archivo no soportado. Por favor, sube un archivo CSV o Excel.' }, { status: 400 })
    }

    // TODO: Process records and save to database

    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error processing file:', error)
    return NextResponse.json({ error: 'Error al procesar el archivo.' }, { status: 500 })
  }
}
