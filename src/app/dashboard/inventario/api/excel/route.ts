import { NextResponse } from 'next/server'
import { utils, write } from 'xlsx'
import { getInventoryMaster } from '../../actions'

export const revalidate = 0

export async function GET() {
  const { data, error } = await getInventoryMaster()

  if (error) {
    return NextResponse.json({ error: 'No se pudo construir el reporte' }, { status: 500 })
  }

  const sheetData = data.map(item => ({
    Marca: item.brand,
    Modelo: item.model,
    Tipo: item.type,
    'Disponible': item.available_count,
    'En proceso': item.in_process_count,
    'Total': item.total_quantity,
    'Valor Total (GTQ)': item.total_cost_value,
    'Rotación (días)': item.rotation_days ?? 'N/A',
    'Clasificación F': item.classification_f ?? '',
    'Clasificación C': item.classification_c ?? ''
  }))

  const workbook = utils.book_new()
  const worksheet = utils.json_to_sheet(sheetData)
  utils.book_append_sheet(workbook, worksheet, 'Inventario Maestro')
  const buffer = write(workbook, { bookType: 'xlsx', type: 'buffer' })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="inventario-maestro.xlsx"'
    }
  })
}
