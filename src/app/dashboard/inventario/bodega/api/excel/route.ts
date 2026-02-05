import { NextRequest, NextResponse } from 'next/server'
import { utils, write } from 'xlsx'
import { getWarehouseAssets, type WarehouseAsset } from '../../actions'
import { formatBodegaDate } from '@/lib/formatBodegaDate'

export const revalidate = 0

type HardwareSpecs = Record<string, unknown>

const getWorkshopClassifications = (asset: WarehouseAsset) => {
  const specs = asset.specifications
  if (!specs || typeof specs !== 'object') {
    return {}
  }
  const rawClassifications = (specs as Record<string, unknown>).workshop_classifications
  if (!rawClassifications || typeof rawClassifications !== 'object') {
    return {}
  }
  const cls = rawClassifications as Record<string, unknown>
  return {
    rec: typeof cls.rec === 'string' ? cls.rec : undefined,
    c: typeof cls.c === 'string' ? cls.c : undefined,
    f: typeof cls.f === 'string' ? cls.f : undefined
  }
}

const formatClassificationsLabel = (asset: WarehouseAsset) => {
  const { f, c } = getWorkshopClassifications(asset)
  const parts: string[] = []
  if (f) parts.push(`F: ${f}`)
  if (c) parts.push(`C: ${c}`)
  if (parts.length === 0) return 'Sin clasificar'
  return parts.join(' | ')
}

const getHardwareSpecs = (asset: WarehouseAsset): HardwareSpecs | null => {
  const specs = asset.specifications
  if (!specs || typeof specs !== 'object') return null
  const hardware = (specs as Record<string, unknown>).hardware_specs
  if (!hardware || typeof hardware !== 'object') return null
  return hardware as HardwareSpecs
}

const formatCpuColumn = (hardware: HardwareSpecs | null) => {
  if (!hardware) return ''
  const value = typeof hardware.processor === 'string' ? hardware.processor : ''
  return value ? `CPU: ${value}` : ''
}

const formatRamColumn = (hardware: HardwareSpecs | null) => {
  if (!hardware) return ''
  const capacity = typeof hardware.ram_capacity === 'string' ? hardware.ram_capacity : ''
  const type = typeof hardware.ram_type === 'string' ? hardware.ram_type : ''
  if (!capacity && !type) return ''
  return `${capacity || '-'}${type ? ` (${type})` : ''}`
}

const formatDiskColumn = (hardware: HardwareSpecs | null) => {
  if (!hardware) return ''
  const capacity = typeof hardware.disk_capacity === 'string' ? hardware.disk_capacity : ''
  const type = typeof hardware.disk_type === 'string' ? hardware.disk_type : ''
  if (!capacity && !type) return ''
  return `${capacity || '-'}${type ? ` (${type})` : ''}`
}

const formatKeyboardColumn = (hardware: HardwareSpecs | null) => {
  if (!hardware || typeof hardware.keyboard_type !== 'string') return ''
  const version = typeof hardware.keyboard_version === 'string' ? ` - ${hardware.keyboard_version}` : ''
  return `Teclado: ${hardware.keyboard_type}${version}`
}

const getReceptionNotes = (asset: WarehouseAsset) => {
  const specs = asset.specifications
  if (!specs || typeof specs !== 'object') return undefined
  const notes = (specs as Record<string, unknown>).reception_notes
  return typeof notes === 'string' ? notes : undefined
}

const formatLocationLabel = (asset: WarehouseAsset) => {
  if (!asset.batch_location) return ''
  const container = asset.container_type === 'caja'
    ? 'Caja'
    : asset.container_type === 'pallet'
      ? 'Pallet'
      : ''

  if (container) {
    return `${asset.batch_location} (${container})`
  }

  return asset.batch_location
}

const formatTransportLabel = (asset: WarehouseAsset) => {
  const a = asset as any
  const pieces: string[] = []
  if (a.driver_name) pieces.push(a.driver_name)
  if (a.vehicle_plate) pieces.push(a.vehicle_plate)
  if (a.transport_guide) pieces.push(a.transport_guide)
  if (pieces.length === 0) return ''
  return pieces.join(' | ')
}

const applyFilters = (
  asset: WarehouseAsset,
  gradeFilter: string,
  warehouseFilter: string,
  searchTerm: string
) => {
  if (gradeFilter && (asset.condition_grade || '').toUpperCase() !== gradeFilter) {
    return false
  }
  if (warehouseFilter && asset.warehouse_code !== warehouseFilter) {
    return false
  }
  if (searchTerm) {
    const haystack = [
      asset.serial_number,
      asset.manufacturer,
      asset.model,
      asset.ticket_code,
      asset.batch_code,
      asset.batch_location
    ]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(searchTerm))

    if (!haystack) return false
  }
  return true
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const gradeFilter = (searchParams.get('grade') || '').toUpperCase()
  const warehouseFilter = searchParams.get('warehouse') || ''
  const searchTerm = (searchParams.get('search') || '').trim().toLowerCase()

  const assets = await getWarehouseAssets()
  const filteredAssets = assets.filter((asset) =>
    applyFilters(asset, gradeFilter, warehouseFilter, searchTerm)
  )

  const sheetData = filteredAssets.map((asset) => {
    const hardwareSpecs = getHardwareSpecs(asset)
    const receptionNotes = getReceptionNotes(asset)
    const receivedDate = asset.warehouse_received_at || asset.created_at || ''
    const formattedDate = formatBodegaDate(receivedDate)

    const formattedTransferDate = asset.last_transfer_date ? formatBodegaDate(asset.last_transfer_date) : ''

    // Generar resumen de especificaciones
    const specsSummary = [
      formatCpuColumn(hardwareSpecs),
      formatRamColumn(hardwareSpecs),
      formatDiskColumn(hardwareSpecs),
      formatKeyboardColumn(hardwareSpecs)
    ].filter(Boolean).join(' | ').replace(/CPU: |Teclado: /g, '')

    // Campos Base Comunes
    const row: Record<string, any> = {
      Bodega: asset.warehouse_name || asset.warehouse_code || '',
      'Serie / IMEI': asset.serial_number || '',
      Marca: asset.manufacturer || '',
      Modelo: asset.model || '',
      Tipo: asset.asset_type || '',
      Color: asset.color || '',
      'REC IN-F / C': formatClassificationsLabel(asset),
      Especificaciones: specsSummary || '',
      Ubicación: formatLocationLabel(asset),
      Ticket: asset.ticket_code || '',
      Lote: asset.batch_code || '',
      Caja: asset.box_number ? String(asset.box_number) : '',
      'Fecha en Bodega': formattedDate,
      'Fecha de Traslado': formattedTransferDate
    }

    // Campos Específicos por Bodega
    // BOD-DES: Destrucción
    if (warehouseFilter === 'BOD-DES') {
      const specs = asset.specifications as any
      const isDestroyed = asset.status === 'destroyed'
      row['Estatus'] = isDestroyed ? 'DESTRUIDO' : 'Pendiente'
      row['Fecha Destrucción'] = specs?.destroyed_at ? formatBodegaDate(specs.destroyed_at) : ''
      row['Peso Total Lote (Lb)'] = specs?.destruction_batch_weight || ''
    }

    // BOD-REM / BOD-VAL: Venta y Borrado
    if (warehouseFilter === 'BOD-REM' || warehouseFilter === 'BOD-VAL') {
      row['Precio Venta (Q)'] = asset.sales_price ? asset.sales_price.toFixed(2) : ''

      const isWiped = asset.status === 'wiped' || asset.wipe_status === 'success'
      row['Borrado Certificado'] = isWiped ? 'Sí' : 'No'
      row['Fecha Borrado'] = asset.wiped_at ? formatBodegaDate(asset.wiped_at) : ''
    }

    return row
  })

  const workbook = utils.book_new()
  const worksheet = utils.json_to_sheet(sheetData)

  const reportName = warehouseFilter ? `Inventario - ${warehouseFilter}` : 'Inventario General'
  const sheetName = warehouseFilter || 'Inventario'
  // Sheet names cannot exceed 31 chars
  const safeSheetName = sheetName.length > 31 ? sheetName.substring(0, 31) : sheetName

  utils.book_append_sheet(workbook, worksheet, safeSheetName)
  const buffer = write(workbook, { bookType: 'xlsx', type: 'buffer' })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${reportName}.xlsx"`
    }
  })
}
