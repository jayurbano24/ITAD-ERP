import { Package, ArrowLeft, Warehouse } from 'lucide-react'
import Link from 'next/link'
import {
  getWarehouseAssets,
  getWarehouses,
  getRepairWarehouseBoard,
  type WarehouseAsset,
  type RepairStageKey,
} from './actions'
import { isPurchasedAsset } from '@/lib/wipe/isPurchasedAsset'
import { formatBodegaDate } from '@/lib/formatBodegaDate'
import WarehouseAssetTable from './components/WarehouseAssetTable'
import ExcelExportButton from './components/ExcelExportButton'
import RemarketingTabs, { type RemarketingTab } from './components/RemarketingTabs'
import RepairStageTabs from './components/RepairStageTabs'
import RepairStageBoard from './components/RepairStageBoard'
import ProjectCostSummary, { type ProjectCostRow } from './components/ProjectCostSummary'

type WarehouseFilterParams = {
  grade?: string
  warehouse?: string
  search?: string
  tab?: string
}

export const dynamic = 'force-dynamic'

type WorkshopClassifications = {
  rec?: string
  c?: string
  f?: string
  r2Applicability?: string
  dataSanitization?: string
}
type HardwareSpecs = {
  processor?: string
  processor_brand?: string
  processor_generation?: string
  processor_family?: string
  ram_capacity?: string
  ram_type?: string
  disk_capacity?: string
  disk_type?: string
  keyboard_type?: string
  keyboard_version?: string
  screen_size?: string
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
  let r2Applicability: string | undefined
  let dataSanitization: string | undefined

  if (specs?.workshop_classifications) {
    const wc = specs.workshop_classifications
    rec = wc.rec && wc.rec !== '$undefined' ? wc.rec : undefined
    f = wc.f && wc.f !== '$undefined' ? wc.f : undefined
    c = wc.c && wc.c !== '$undefined' ? wc.c : undefined
    r2Applicability =
      wc.r2_applicability && wc.r2_applicability !== '$undefined'
        ? String(wc.r2_applicability)
        : undefined
    dataSanitization =
      wc.data_sanitization && wc.data_sanitization !== '$undefined'
        ? String(wc.data_sanitization)
        : undefined
  }

  if (!rec && specs?.rec) rec = specs.rec
  if (!f && specs?.f) f = specs.f
  if (!c && specs?.c) c = specs.c
  if (!r2Applicability && specs?.r2_applicability) r2Applicability = String(specs.r2_applicability)
  if (!dataSanitization && specs?.data_sanitization) dataSanitization = String(specs.data_sanitization)

  return { rec, f, c, r2Applicability, dataSanitization }
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
    processor_brand: hw.processor_brand,
    processor_generation: hw.processor_generation,
    processor_family: hw.processor_family,
    ram_capacity: hw.ram_capacity,
    ram_type: hw.ram_type,
    disk_capacity: hw.disk_capacity,
    disk_type: hw.disk_type,
    keyboard_type: hw.keyboard_type,
    keyboard_version: hw.keyboard_version,
    screen_size: hw.screen_size,
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
  const {
    grade: gradeFilter,
    warehouse: warehouseFilter,
    search: searchTerm,
    tab: tabParam,
  } = searchParams
  const isRemarketing = warehouseFilter === 'BOD-REM'
  const isRepairWarehouse = warehouseFilter === 'BOD-REP'
  const remTab: RemarketingTab =
    tabParam === 'comprados'
      ? 'comprados'
      : tabParam === 'procesados'
        ? 'procesados'
        : 'venta'
  const repairTab: RepairStageKey =
    isRepairWarehouse &&
    (tabParam === 'reparacion' || tabParam === 'control_calidad' || tabParam === 'diagnostico')
      ? tabParam
      : 'diagnostico'

  const [allAssets, warehouses, repairBoard] = await Promise.all([
    getWarehouseAssets(),
    getWarehouses(),
    isRepairWarehouse ? getRepairWarehouseBoard() : Promise.resolve(null),
  ])

  const gradeOptions = ['A', 'B', 'C', 'D', 'F']
  const gradeLabels: Record<string, string> = {
    A: 'Grado A',
    B: 'Grado B',
    C: 'Grado C',
    D: 'Grado D',
    F: 'Scrap'
  }

  const remAssets = isRemarketing
    ? allAssets.filter((a) => a.warehouse_code === 'BOD-REM')
    : []
  /** Disponibles para venta (todo lo que está en BOD-REM y aún no vendido) */
  const remForSaleCount = remAssets.length
  const remPurchasedCount = remAssets.filter((a) => isPurchasedAsset(a)).length
  /** Equipos que ya pasaron recepción/taller/QC (no lote de compra) */
  const remProcessedCount = remAssets.filter((a) => !isPurchasedAsset(a)).length

  const filteredAssets = allAssets.filter((asset) => {
    if (gradeFilter && asset.condition_grade !== gradeFilter) {
      return false
    }
    if (warehouseFilter && asset.warehouse_code !== warehouseFilter) {
      return false
    }
    if (isRemarketing) {
      const purchased = isPurchasedAsset(asset)
      if (remTab === 'comprados' && !purchased) return false
      if (remTab === 'procesados' && purchased) return false
      // 'venta': muestra todos los disponibles en BOD-REM (comprados + procesados)
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

  const warehouseOrder = ['BOD-REC', 'BOD-REP', 'BOD-RPL', 'BOD-REM', 'BOD-VAL', 'BOD-HARV', 'BOD-DES']
  const warehouseSections: WarehouseSection[] = Object.entries(assetsByWarehouse)
    .map(([key, warehouse]) => {
      const warehouseInfo = warehouses.find((w) => w.code === warehouse.code)
      return {
        key,
        code: warehouse.code,
        name: warehouse.name,
        status: warehouseInfo?.status || 'activa',
        assets: warehouse.assets,
      }
    })
    .sort((a, b) => {
      const ia = a.code ? warehouseOrder.indexOf(a.code) : 999
      const ib = b.code ? warehouseOrder.indexOf(b.code) : 999
      const oa = ia === -1 ? 500 : ia
      const ob = ib === -1 ? 500 : ib
      if (oa !== ob) return oa - ob
      return (a.code || '').localeCompare(b.code || '')
    })

  const isGeneralInventory = !warehouseFilter
  const warehouseSummary = warehouseSections.map((s) => ({
    code: s.code || 'SIN',
    name: s.name || warehouseNameMap[s.code || ''] || s.code || 'Sin bodega',
    count: s.assets.length,
  }))

  const projectCostRows: ProjectCostRow[] = (() => {
    if (!isRemarketing) return []
    const byProject = new Map<string, { units: number; totalCost: number; totalSale: number }>()
    for (const asset of filteredAssets) {
      const specs = (asset.specifications ?? null) as Record<string, unknown> | null
      const projectRaw =
        specs?.project_number ?? specs?.invoice_ref ?? specs?.project_hash ?? null
      const project =
        projectRaw != null && String(projectRaw).trim() !== ''
          ? String(projectRaw).trim()
          : remTab === 'comprados' || remTab === 'venta'
            ? 'Sin Project #'
            : null
      if (!project) continue
      const cost = asset.cost_amount != null ? Number(asset.cost_amount) : 0
      const sale = asset.sales_price != null ? Number(asset.sales_price) : 0
      const prev = byProject.get(project) || { units: 0, totalCost: 0, totalSale: 0 }
      prev.units += 1
      prev.totalCost += Number.isFinite(cost) ? cost : 0
      prev.totalSale += Number.isFinite(sale) ? sale : 0
      byProject.set(project, prev)
    }
    return Array.from(byProject.entries())
      .map(([project, v]) => ({
        project,
        units: v.units,
        totalCost: Math.round(v.totalCost * 100) / 100,
        totalSale: Math.round(v.totalSale * 100) / 100,
      }))
      .sort((a, b) => a.project.localeCompare(b.project, 'es', { numeric: true }))
  })()

  const warehouseNameMap: Record<string, string> = {
    'BOD-REC': 'Bodega Recepción',
    'BOD-REP': 'Por Reparación',
    'BOD-RPL': 'Bodega de Remplazo',
    'BOD-REM': 'Bodega Remarketing',
    'BOD-VAL': 'Bodega Valorización',
    'BOD-HARV': 'Bodega Hardvesting',
    'BOD-DES': 'Bodega Destrucción'
  }

  const repairRowsForTab =
    repairBoard?.rows.filter((row) => {
      if (row.stage !== repairTab) return false
      if (!searchTerm) return true
      const q = searchTerm.toLowerCase()
      return [row.serial, row.manufacturer, row.model, row.workOrderNumber]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    }) ?? []

  const headerWarehouse = warehouseFilter
    ? warehouses.find((warehouse) => warehouse.code === warehouseFilter)
    : undefined
  const warehouseLabel = isGeneralInventory
    ? 'Inventario General'
    : headerWarehouse?.name || (warehouseFilter && warehouseNameMap[warehouseFilter]) || 'Bodega'
  const warehouseCode = isGeneralInventory
    ? 'TODAS'
    : headerWarehouse?.code || warehouseFilter || 'BODEGA'

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
                  {isRepairWarehouse
                    ? `${repairBoard?.rows.length ?? 0} equipos en flujo de reparación`
                    : isRemarketing
                      ? `${remForSaleCount} disponibles para venta · ${remPurchasedCount} comprados · ${remProcessedCount} procesados`
                      : isGeneralInventory
                        ? `${filteredAssets.length} equipos en todas las bodegas`
                        : `${filteredAssets.length} equipos en almacenamiento`}
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

      {isGeneralInventory && warehouseSummary.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {warehouseSummary.map((w) => (
            <Link
              key={w.code}
              href={`/dashboard/inventario/bodega?warehouse=${encodeURIComponent(w.code)}`}
              className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1a1f2e] px-3 py-2.5 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors"
            >
              <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                {w.code}
              </p>
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">{w.name}</p>
              <p className="text-lg font-black text-gray-900 dark:text-white tabular-nums">{w.count}</p>
            </Link>
          ))}
        </div>
      )}

      {isRemarketing && (
        <div className="space-y-4">
          <RemarketingTabs
            activeTab={remTab}
            forSaleCount={remForSaleCount}
            purchasedCount={remPurchasedCount}
            processedCount={remProcessedCount}
            search={searchTerm}
          />
          {projectCostRows.length > 0 && (
            <ProjectCostSummary
              rows={projectCostRows}
              title={
                remTab === 'comprados'
                  ? 'Total por Project · Equipos comprados'
                  : remTab === 'procesados'
                    ? 'Total por Project · Procesados'
                    : 'Total por Project · Para venta'
              }
            />
          )}
        </div>
      )}

      {isRepairWarehouse && repairBoard && (
        <div className="space-y-4">
          <RepairStageTabs
            activeTab={repairTab}
            counts={repairBoard.counts}
            search={searchTerm}
          />
          <RepairStageBoard rows={repairRowsForTab} stage={repairTab} />
        </div>
      )}

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
          {isGeneralInventory ? (
            <div className="relative group">
              <select
                name="warehouse"
                defaultValue={warehouseFilter || ''}
                className="w-full bg-white dark:bg-[#0f1419] border-2 border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white appearance-none"
              >
                <option value="">Todas las bodegas</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.code}>
                    {warehouse.code} - {warehouse.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="relative group opacity-60 cursor-not-allowed">
              <input type="hidden" name="warehouse" value={warehouseFilter || ''} />
              {isRemarketing && <input type="hidden" name="tab" value={remTab} />}
              {isRepairWarehouse && <input type="hidden" name="tab" value={repairTab} />}
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
          )}
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
              href={`/dashboard/inventario/bodega${
                warehouseFilter
                  ? `?warehouse=${warehouseFilter}${
                      isRemarketing
                        ? `&tab=${remTab}`
                        : isRepairWarehouse
                          ? `&tab=${repairTab}`
                          : ''
                    }`
                  : ''
              }`}
              className="px-6 h-full flex items-center rounded-2xl border-2 border-gray-100 dark:border-gray-800 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            >
              Limpiar
            </Link>
          )}
        </div>
      </form>

      {!isRepairWarehouse && (
        <WarehouseAssetTable sections={warehouseSections} unified={isGeneralInventory} />
      )}

      {!isRepairWarehouse && filteredAssets.length === 0 && (
        <div className="bg-gray-50 dark:bg-[#1a1f2e] border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-[3rem] p-20 text-center">
          <div className="w-24 h-24 bg-white dark:bg-[#0f1419] rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <Package className="w-12 h-12 text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight uppercase">
            {remTab === 'comprados'
              ? 'Sin equipos comprados'
              : remTab === 'procesados'
                ? 'Sin equipos procesados'
                : 'No hay equipos para venta'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 font-bold text-sm max-w-sm mx-auto leading-relaxed">
            {remTab === 'comprados'
              ? 'Registra un lote arriba (serie + costo c/u) para que aparezcan aquí en Remarketing.'
              : remTab === 'procesados'
                ? 'Aquí llegan equipos que ya pasaron recepción / taller / QC hacia Remarketing.'
                : 'Los equipos listos para vender (comprados o ya procesados) aparecerán en esta pestaña.'}
          </p>
        </div>
      )}
    </div>
  )
}