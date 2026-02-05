import { Package, ArrowLeft, Warehouse } from 'lucide-react'
import Link from 'next/link'
import { getWarehouseAssets, getWarehouses, type WarehouseAsset } from './actions'
import { formatBodegaDate } from '@/lib/formatBodegaDate'
import WarehouseAssetTable from './components/WarehouseAssetTable'
import ExcelExportButton from './components/ExcelExportButton'



type WarehouseFilterParams = {
  grade?: string
  warehouse?: string
  search?: string
}

export const dynamic = 'force-dynamic'

type WorkshopClassifications = { rec?: string; c?: string; f?: string }
type HardwareSpecs = {
  processor?: string
  ram_capacity?: string
  ram_type?: string
  disk_capacity?: string
  disk_type?: string
  keyboard_type?: string
  keyboard_version?: string
  bios_version?: string
}

type WarehouseAssetRow = WarehouseAsset & {
  inputClassifications: WorkshopClassifications
  outputClassifications: WorkshopClassifications
  hardwareSpecs: HardwareSpecs
  receptionNotes?: string
  formattedReceivedDate: string | null
  formattedTransferDate: string | null
}

type WarehouseSection = {
  key: string
  code: string | null
  name: string | null
  status?: string | null
  assets: WarehouseAssetRow[]
}

// Helper functions based on component usage
function getInputClassifications(asset: WarehouseAsset): WorkshopClassifications {
  const specs = asset.specifications as any

  let rec: string | undefined
  let f: string | undefined
  let c: string | undefined

  if (specs?.workshop_classifications) {
    const wc = specs.workshop_classifications
    rec = wc.rec && wc.rec !== '$undefined' ? wc.rec : undefined
    f = wc.f && wc.f !== '$undefined' ? wc.f : undefined
    c = wc.c && wc.c !== '$undefined' ? wc.c : undefined
  }

  // Fallback a otros campos si existen
  if (!rec && specs?.rec) rec = specs.rec
  if (!f && specs?.f) f = specs.f
  if (!c && specs?.c) c = specs.c

  return { rec, f, c }
}

function getOutputClassifications(asset: WarehouseAsset): WorkshopClassifications {
  const specs = asset.specifications as any
  if (!specs) return {}

  // Clasificaciones de salida provienen de control de calidad (QC)
  // Se guardan con el sufijo _out en specifications
  const rec = specs.rec_classification_out && specs.rec_classification_out !== '$undefined'
    ? specs.rec_classification_out
    : undefined
  const c = specs.c_classification_out && specs.c_classification_out !== '$undefined'
    ? specs.c_classification_out
    : undefined
  const f = specs.f_classification_out && specs.f_classification_out !== '$undefined'
    ? specs.f_classification_out
    : undefined

  return { rec, f, c }
}

function getHardwareSpecs(asset: WarehouseAsset): HardwareSpecs {
  const specs = asset.specifications as any
  if (!specs || !specs.hardware_specs) return {}
  const hw = specs.hardware_specs as any
  return {
    processor: hw.processor,
    ram_capacity: hw.ram_capacity,
    ram_type: hw.ram_type,
    disk_capacity: hw.disk_capacity,
    disk_type: hw.disk_type,
    keyboard_type: hw.keyboard_type,
    keyboard_version: hw.keyboard_version,
    bios_version: hw.bios_version
  }
}

function getReceptionNotes(asset: WarehouseAsset): string | undefined {
  const specs = asset.specifications as any
  return specs?.reception_notes
}

export default async function BodegaPage({
  searchParams
}: {
  searchParams: WarehouseFilterParams
}) {
  const { grade: gradeFilter, warehouse: warehouseFilter, search: searchTerm } = searchParams
  const [allAssets, warehouses] = await Promise.all([getWarehouseAssets(), getWarehouses()])

  const gradeOptions = ['A', 'B', 'C', 'D', 'F']
  const gradeLabels: Record<string, string> = {
    A: 'Grado A',
    B: 'Grado B',
    C: 'Grado C',
    D: 'Grado D',
    F: 'Scrap'
  }

  const filteredAssets = allAssets.filter((asset) => {
    if (gradeFilter && asset.condition_grade !== gradeFilter) {
      return false
    }
    if (warehouseFilter && asset.warehouse_code !== warehouseFilter) {
      return false
    }
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const haystack = [
        asset.serial_number,
        asset.manufacturer,
        asset.model,
        asset.ticket_code,
        asset.batch_code,
        asset.batch_location
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(searchLower))

      if (!haystack) return false
    }
    return true
  })

  const enrichedAssets: WarehouseAssetRow[] = filteredAssets.map((asset) => {
    const inputClassifications = getInputClassifications(asset)
    const outputClassifications = getOutputClassifications(asset)
    const hardwareSpecs = getHardwareSpecs(asset)
    const receptionNotes = getReceptionNotes(asset)
    const receivedDate = asset.warehouse_received_at || asset.created_at
    const formattedReceivedDate = receivedDate ? formatBodegaDate(receivedDate) : null
    const formattedTransferDate = asset.last_transfer_date ? formatBodegaDate(asset.last_transfer_date) : null

    return {
      ...asset,
      inputClassifications,
      outputClassifications,
      hardwareSpecs,
      receptionNotes,
      formattedReceivedDate,
      formattedTransferDate
    }
  })

  const assetsByWarehouse = enrichedAssets.reduce((acc, asset) => {
    const key = asset.warehouse_code || 'SIN_BODEGA'
    if (!acc[key]) {
      acc[key] = {
        code: asset.warehouse_code,
        name: asset.warehouse_name,
        assets: [] as WarehouseAssetRow[]
      }
    }
    acc[key].assets.push(asset)
    return acc
  }, {} as Record<string, { code: string | null; name: string | null; assets: WarehouseAssetRow[] }>)

  const warehouseSections: WarehouseSection[] = Object.entries(assetsByWarehouse).map(([key, warehouse]) => {
    const warehouseInfo = warehouses.find(w => w.code === warehouse.code)
    return {
      key,
      code: warehouse.code,
      name: warehouse.name,
      status: warehouseInfo?.status || 'activa',
      assets: warehouse.assets
    }
  })

  const warehouseNameMap: Record<string, string> = {
    'BOD-REC': 'Bodega Recepción',
    'BOD-REM': 'Bodega Remarketing',
    'BOD-VAL': 'Bodega Valorización',
    'BOD-HARV': 'Bodega Hardvesting',
    'BOD-DES': 'Bodega Destrucción'
  }

  const headerWarehouse = warehouseFilter
    ? warehouses.find((warehouse) => warehouse.code === warehouseFilter)
    : undefined
  const fallbackWarehouse = warehouses.find((warehouse) => warehouse.code === 'BOD-REC') || warehouses[0]
  const currentWarehouse = headerWarehouse || fallbackWarehouse
  const warehouseLabel = headerWarehouse?.name || (warehouseFilter && warehouseNameMap[warehouseFilter]) || currentWarehouse?.name || 'Bodega'
  const warehouseCode = headerWarehouse?.code || currentWarehouse?.code || warehouseFilter || 'BODEGA'

  const isFilterActive = Boolean(gradeFilter || searchTerm)

  const excelParams = new URLSearchParams()
  if (gradeFilter) excelParams.set('grade', gradeFilter)
  if (warehouseFilter) excelParams.set('warehouse', warehouseFilter)
  if (searchTerm) excelParams.set('search', searchTerm)

  const excelHref = `/dashboard/inventario/bodega/api/excel${excelParams.toString() ? `?${excelParams.toString()}` : ''}`

  return (
    <div className="p-6 space-y-6 bg-white dark:bg-[#0b0f1a] min-h-screen transition-colors duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-100 dark:border-gray-800 pb-6">
        <div>
          <Link
            href="/dashboard/inventario"
            className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-white transition-colors mb-4 font-bold text-xs uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Inventario
          </Link>
          <div className="flex items-center gap-5">
            <div className="p-4 bg-indigo-600 dark:bg-indigo-600 rounded-[2rem] shadow-lg shadow-indigo-500/20">
              <Warehouse className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                {warehouseLabel}
              </h1>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-100 dark:border-indigo-500/20">
                  {warehouseCode}
                </span>
                <span className="text-gray-700 dark:text-gray-300 font-bold text-[11px] uppercase tracking-wider">
                  {filteredAssets.length} equipos en almacenamiento
                </span>
              </div>
            </div>
          </div>
        </div>
        <ExcelExportButton
          warehouses={warehouses}
          currentFilters={{
            grade: gradeFilter,
            search: searchTerm,
            warehouse: warehouseFilter
          }}
        />
      </div>

      <form
        className="bg-gray-50 dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-700 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-4 gap-6 shadow-sm transition-all"
        method="get"
      >
        <div className="flex flex-col gap-2.5">
          <label className="text-gray-700 dark:text-gray-300 text-[10px] font-bold uppercase tracking-widest pl-1">
            Clasificación
          </label>
          <div className="relative group opacity-60 cursor-not-allowed">
            <input type="hidden" name="grade" value={gradeFilter || ''} />
            <select
              name="grade_disabled"
              defaultValue={gradeFilter}
              disabled
              className="w-full bg-white dark:bg-[#0f1419] border-2 border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white appearance-none cursor-not-allowed"
            >
              <option value="">Todas las clasificaciones</option>
              {gradeOptions.map((grade) => (
                <option key={grade} value={grade}>
                  {grade} - {gradeLabels[grade]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <label className="text-gray-700 dark:text-gray-300 text-[10px] font-bold uppercase tracking-widest pl-1">
            Ubicación
          </label>
          <div className="relative group opacity-60 cursor-not-allowed">
            <input type="hidden" name="warehouse" value={warehouseFilter || ''} />
            <select
              name="warehouse_disabled"
              defaultValue={warehouseFilter}
              disabled
              className="w-full bg-white dark:bg-[#0f1419] border-2 border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white appearance-none cursor-not-allowed"
            >
              <option value="">Todas las bodegas</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.code}>
                  {warehouse.code} - {warehouse.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 md:col-span-1">
          <label className="text-gray-700 dark:text-gray-300 text-[10px] font-bold uppercase tracking-widest pl-1">
            Buscar serie, modelo o lote
          </label>
          <div className="relative group">
            <input
              type="search"
              name="search"
              defaultValue={searchTerm}
              placeholder="Ej. DXA123, iPhone..."
              className="w-full bg-white dark:bg-[#0f1419] border-2 border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 h-[46px] mt-auto">
          <button
            type="submit"
            className="flex-1 bg-indigo-600 h-full rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
          >
            Aplicar filtros
          </button>
          {isFilterActive && (
            <Link
              href={`/dashboard/inventario/bodega${warehouseFilter ? `?warehouse=${warehouseFilter}` : ''}`}
              className="px-6 h-full flex items-center rounded-2xl border-2 border-gray-100 dark:border-gray-800 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            >
              Limpiar
            </Link>
          )}
        </div>
      </form>

      <WarehouseAssetTable sections={warehouseSections} />

      {filteredAssets.length === 0 && (
        <div className="bg-gray-50 dark:bg-[#1a1f2e] border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-[3rem] p-20 text-center">
          <div className="w-24 h-24 bg-white dark:bg-[#0f1419] rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <Package className="w-12 h-12 text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight uppercase">No hay equipos en bodega</h3>
          <p className="text-gray-500 dark:text-gray-400 font-bold text-sm max-w-sm mx-auto leading-relaxed">
            Los equipos aparecerán aquí cuando finalices la recepción de un lote o realices un traslado de inventario.
          </p>
        </div>
      )}
    </div>
  )
}