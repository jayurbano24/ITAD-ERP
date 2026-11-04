'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { Shield, FileDown, RefreshCw, Download, Tags, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  displayBattery,
  displayCharger,
  displayMemory,
  displayWipe,
  buildAssetReportBaseName,
  formatTestDateExcel,
  mapDeviceLabel,
  mapFinalStatus,
} from '@/lib/wipe/exportWipeOrderExcel'
import { downloadItadAssetReportPack } from '@/lib/wipe/fillItadAssetReportTemplate'

type WipeOrderRow = {
  assetId: string
  evidenceId: string
  evidenceUrl: string | null
  evidenceType: string
  ordCode: string | null
  classificationRec: string | null
  classificationC: string | null
  classificationF: string | null
  cosmeticConditions: string | null
  functionalConditions: string | null
  r2Applicability: string | null
  dataSanitization: string | null
  memory: string | null
  serialNumberOfHdd: string | null
  prefix: string | null
  device: string | null
  make: string | null
  model: string | null
  serialNumber: string | null
  customerAssetTag: string | null
  mainBoardPart: string | null
  ramCapacityGb: string | null
  weightKg: string | null
  ramType: string | null
  cpu: string | null
  hddCount: number | null
  ssd: string | null
  screenSize: string | null
  weightLbs: string | null
  powerOnOverHeat: string | null
  battery: string | null
  charger: string | null
  screen: string | null
  keyboard: string | null
  testDate: string | null
  technicianName: string | null
  comments: string | null
  processedTime: string | null
  hdd1Serial: string | null
  hdd1Size: string | null
  hdd1Wipe: string | null
  hdd1Destruction: string | null
  hdd2Serial: string | null
  hdd2Size: string | null
  hdd2Wipe: string | null
  hdd2Destruction: string | null
  wipeCertificateId: string | null
  wipeSoftware: string | null
  status: string | null
  finalStatus: string | null
  remarketPrice: number | null
  serviceFee: number | null
  additionalNotes: string | null
  customerName?: string | null
  evidenceCreatedAt?: string | null
}

function formatMoney(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return ''
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''))
  if (Number.isNaN(n)) return String(value)
  return `$ ${n.toFixed(2)}`
}

function kgToLbs(kg: string | null | undefined) {
  if (!kg) return ''
  const n = parseFloat(String(kg).replace(/[^0-9.]/g, ''))
  if (Number.isNaN(n)) return String(kg)
  return (n / 0.453592).toFixed(2)
}

type OrdSummary = {
  ordCode: string
  customerName: string | null
  dateFrom: string | null
  dateTo: string | null
  assetCount: number
  wipedCount: number
  withPdfCount: number
}

const REC_OPTIONS = ['R', 'E', 'C']
const F_OPTIONS = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6']
const C_OPTIONS = ['C0', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9']
const R2_OPTIONS = [
  { value: 'C', label: 'C — Controlled' },
  { value: 'U', label: 'U — Unrestricted' },
]
const SANITIZATION_OPTIONS = [
  { value: 'D1', label: 'D1 — Pre-Sanitization' },
  { value: 'D2', label: 'D2 — Non-Data' },
  { value: 'D3', label: 'D3 — Sanitized' },
]

function cell(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return ''
  return String(value)
}

const thBase =
  'border border-[#7f7f7f] px-1.5 py-1 text-center align-middle font-bold leading-tight text-[10px]'
const tdBase =
  'border border-[#7f7f7f] px-1.5 py-1 align-middle text-[11px] text-black whitespace-nowrap bg-[#f3f0f7]'

/** Select con alto contraste (evita texto gris claro en dark mode) */
const selectClass =
  'w-full rounded-lg border-2 border-gray-400 bg-white px-3 py-2.5 text-sm font-bold text-black shadow-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/30 [color-scheme:light]'
const optionClass = 'bg-white text-black font-bold'

export default function EvidencesPage() {
  const [rows, setRows] = useState<WipeOrderRow[]>([])
  const [orders, setOrders] = useState<OrdSummary[]>([])
  const [selectedOrd, setSelectedOrd] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [classifying, setClassifying] = useState<WipeOrderRow | null>(null)
  const [editRec, setEditRec] = useState('')
  const [editC, setEditC] = useState('')
  const [editF, setEditF] = useState('')
  const [editR2, setEditR2] = useState('')
  const [editSanit, setEditSanit] = useState('')
  const [editMemory, setEditMemory] = useState('')
  const [savingClass, setSavingClass] = useState(false)
  const [classError, setClassError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/wipe/evidence-table?t=${Date.now()}`, {
        cache: 'no-store',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Error al cargar')
      setRows(Array.isArray(data.rows) ? data.rows : [])
      setOrders(Array.isArray(data.orders) ? data.orders : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filteredOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return orders
    return orders.filter((o) =>
      [o.ordCode, o.customerName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    )
  }, [orders, searchTerm])

  /** Detalle solo cuando hay ORD seleccionada (1 fila por PDF/equipo) */
  const detailRows = useMemo(() => {
    if (!selectedOrd) return []
    return rows.filter((r) =>
      selectedOrd === 'SIN-ORD' ? !r.ordCode : r.ordCode === selectedOrd
    )
  }, [rows, selectedOrd])

  const openClassify = (row: WipeOrderRow) => {
    setClassifying(row)
    setEditRec(row.classificationRec || '')
    setEditC(row.cosmeticConditions || row.classificationC || '')
    setEditF(row.functionalConditions || row.classificationF || '')
    setEditR2(row.r2Applicability || '')
    setEditSanit(row.dataSanitization || '')
    setEditMemory(row.memory || '')
    setClassError(null)
  }

  const saveClassify = async () => {
    if (!classifying) return
    try {
      setSavingClass(true)
      setClassError(null)
      const response = await fetch('/api/wipe/update-classification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: classifying.assetId,
          rec: editRec || null,
          c: editC || null,
          f: editF || null,
          r2Applicability: editR2 || null,
          dataSanitization: editSanit || null,
          memory: editMemory || null,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar')
      setRows((prev) =>
        prev.map((r) =>
          r.assetId === classifying.assetId
            ? {
                ...r,
                classificationRec: data.rec,
                classificationC: data.c,
                classificationF: data.f,
                cosmeticConditions: data.c,
                functionalConditions: data.f,
                r2Applicability: data.r2Applicability,
                dataSanitization: data.dataSanitization,
                memory: data.memory,
              }
            : r
        )
      )
      setClassifying(null)
    } catch (err) {
      setClassError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSavingClass(false)
    }
  }

  const exportExcel = async (scope: 'all' | 'selected' = 'all') => {
    const data =
      scope === 'selected' && detailRows.length > 0 ? detailRows : rows
    if (data.length === 0) {
      setError('No hay reportes de activos para exportar')
      return
    }
    try {
      setExporting(true)
      setError(null)
      const result = await downloadItadAssetReportPack(
        data,
        buildAssetReportBaseName(
          scope === 'selected' ? selectedOrd : data[0]?.ordCode,
          data
        )
      )
      if (result.total > 0 && result.pdfFail > 0) {
        setError(
          `ZIP listo (${result.xlsxName}): plantilla cliente + ${result.pdfOk} PDF. ${result.pdfFail} PDF no se pudieron incluir.`
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al exportar Excel + PDF')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#e8e8e8]">
      <PageHeader
        icon={Shield}
        title="Evidencias de Borrado"
        subtitle="Resumen por ORD · detalle por equipo · link al PDF del certificado"
        variant="blue"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full md:w-72">
              <SearchInput
                placeholder="Buscar ORD, serie, cliente, R2..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-1.5 rounded border border-gray-400 bg-white px-3 py-2 text-xs font-bold text-gray-800"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
              Actualizar
            </button>
            <button
              type="button"
              onClick={() => void exportExcel('all')}
              disabled={rows.length === 0 || exporting}
              className="inline-flex items-center gap-1.5 rounded bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
              title="Descargar ZIP: Excel + PDF de borrado por equipo"
            >
              <Download className={cn('h-3.5 w-3.5', exporting && 'animate-pulse')} />
              {exporting ? 'Generando…' : 'Excel + PDF · Todos'}
            </button>
          </div>
        }
      />

      <main className="p-3 md:p-4 max-w-[100vw] space-y-4">
        {error && (
          <div className="rounded border border-rose-400 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-sm text-gray-600">
            Armando órdenes desde certificados PDF…
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded border border-gray-400 bg-white py-20 text-center text-sm text-gray-500">
            Sin evidencias aún. Sube certificados en{' '}
            <span className="font-bold">Borrado → Captura lote</span>.
          </div>
        ) : (
          <div className="rounded border border-[#7f7f7f] bg-white shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 bg-[#5b2c6f] text-white">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide">
                  Órdenes (ORD) · Cliente · Fechas · Cantidad
                </h2>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/80 mt-0.5">
                  Haz clic en un ORD para ver el detalle
                </p>
              </div>
              <button
                type="button"
                onClick={() => void exportExcel('all')}
                disabled={rows.length === 0 || exporting}
                className="inline-flex items-center gap-1.5 rounded bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-40"
              >
                <Download className={cn('h-3.5 w-3.5', exporting && 'animate-pulse')} />
                {exporting ? 'Generando…' : `Excel + PDF (${rows.length})`}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="bg-[#f3f0f7] text-[10px] uppercase tracking-wider text-gray-700">
                    <th className="border border-[#7f7f7f] px-3 py-2 text-left">Nº Orden</th>
                    <th className="border border-[#7f7f7f] px-3 py-2 text-left">Cliente</th>
                    <th className="border border-[#7f7f7f] px-3 py-2 text-left">Fecha (desde)</th>
                    <th className="border border-[#7f7f7f] px-3 py-2 text-left">Fecha (hasta)</th>
                    <th className="border border-[#7f7f7f] px-3 py-2 text-center">Activos</th>
                    <th className="border border-[#7f7f7f] px-3 py-2 text-center">Borrados</th>
                    <th className="border border-[#7f7f7f] px-3 py-2 text-center">PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o) => {
                    const active = selectedOrd === o.ordCode
                    return (
                      <tr
                        key={o.ordCode}
                        onClick={() => setSelectedOrd(active ? null : o.ordCode)}
                        className={cn(
                          'cursor-pointer transition-colors',
                          active ? 'bg-[#deebf7] ring-2 ring-inset ring-[#5b2c6f]/30' : 'hover:bg-[#f3f0f7]'
                        )}
                        title="Ver detalle completo de esta orden"
                      >
                        <td className="border border-[#7f7f7f] px-3 py-2 font-bold text-[#5b2c6f] underline underline-offset-2">
                          {o.ordCode === 'SIN-ORD' ? 'Sin ORD' : o.ordCode}
                        </td>
                        <td className="border border-[#7f7f7f] px-3 py-2 font-semibold text-gray-800">
                          {o.customerName || '—'}
                        </td>
                        <td className="border border-[#7f7f7f] px-3 py-2 font-mono text-xs text-gray-700">
                          {o.dateFrom ? o.dateFrom.slice(0, 19) : '—'}
                        </td>
                        <td className="border border-[#7f7f7f] px-3 py-2 font-mono text-xs text-gray-700">
                          {o.dateTo ? o.dateTo.slice(0, 19) : '—'}
                        </td>
                        <td className="border border-[#7f7f7f] px-3 py-2 text-center font-black tabular-nums text-gray-900">
                          {o.assetCount}
                        </td>
                        <td className="border border-[#7f7f7f] px-3 py-2 text-center font-bold text-[#006600] tabular-nums">
                          {o.wipedCount}
                        </td>
                        <td className="border border-[#7f7f7f] px-3 py-2 text-center tabular-nums text-gray-800">
                          {o.withPdfCount}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && selectedOrd && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 rounded border border-[#7f7f7f] bg-[#fff2cc] px-3 py-2">
              <p className="text-xs font-bold text-gray-800">
                Detalle completo ·{' '}
                <span className="text-[#5b2c6f]">
                  {selectedOrd === 'SIN-ORD' ? 'Sin ORD' : selectedOrd}
                </span>
                {' · '}
                {detailRows.length} PDF / equipo(s)
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void exportExcel('selected')}
                  disabled={detailRows.length === 0 || exporting}
                  className="inline-flex items-center gap-1 rounded bg-emerald-700 px-2 py-1 text-[10px] font-bold uppercase text-white disabled:opacity-40"
                >
                  <Download className="h-3 w-3" />
                  Excel + PDF de esta ORD
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrd(null)}
                  className="inline-flex items-center gap-1 rounded border border-gray-500 bg-white px-2 py-1 text-[10px] font-bold uppercase text-gray-800"
                >
                  <X className="h-3 w-3" />
                  Cerrar detalle
                </button>
              </div>
            </div>

            {detailRows.length === 0 ? (
              <div className="rounded border border-gray-400 bg-white py-12 text-center text-sm text-gray-500">
                Esta orden no tiene filas de detalle
              </div>
            ) : (
          <div className="overflow-auto rounded-sm border border-[#7f7f7f] bg-white shadow-sm">
            <table className="min-w-max w-full border-collapse font-sans">
              <thead>
                <tr>
                  <th
                    rowSpan={3}
                    className={cn(
                      thBase,
                      'sticky left-0 z-20 bg-[#c00000] text-white w-[72px] shadow-[2px_0_4px_rgba(0,0,0,0.12)]'
                    )}
                  >
                    PDF
                  </th>
                  <th colSpan={3} className={cn(thBase, 'bg-[#5b2c6f] text-white')}>
                    Orden
                  </th>
                  <th colSpan={24} className={cn(thBase, 'bg-[#5b2c6f] text-white')}>
                    Specifications / Test Results
                  </th>
                  <th colSpan={8} className={cn(thBase, 'bg-[#548235] text-white')}>
                    HDD INFORMATION
                  </th>
                </tr>

                <tr>
                  <th rowSpan={2} className={cn(thBase, 'bg-[#5b2c6f] text-white')}>ORD</th>
                  <th rowSpan={2} className={cn(thBase, 'bg-[#5b2c6f] text-white')}>REC</th>
                  <th rowSpan={2} className={cn(thBase, 'bg-[#5b2c6f] text-white')}>Clasificar</th>

                  <th rowSpan={2} className={cn(thBase, 'bg-[#5b2c6f] text-white')}>Device</th>
                  <th rowSpan={2} className={cn(thBase, 'bg-[#5b2c6f] text-white')}>Make</th>
                  <th rowSpan={2} className={cn(thBase, 'bg-[#5b2c6f] text-white')}>Model</th>
                  <th rowSpan={2} className={cn(thBase, 'bg-[#5b2c6f] text-white')}>
                    Serial<br />Number
                  </th>
                  <th rowSpan={2} className={cn(thBase, 'bg-[#5b2c6f] text-white')}>
                    Customer<br />Asset Tag#
                  </th>
                  <th rowSpan={2} className={cn(thBase, 'bg-[#5b2c6f] text-white')}>
                    R2 Applicability<br />Field
                  </th>
                  <th rowSpan={2} className={cn(thBase, 'bg-[#5b2c6f] text-white')}>
                    Data Sanitization<br />Field
                  </th>
                  <th rowSpan={2} className={cn(thBase, 'bg-[#5b2c6f] text-white')}>
                    GPU /<br />Processor
                  </th>
                  <th rowSpan={2} className={cn(thBase, 'bg-[#5b2c6f] text-white')}>
                    Number<br />of HDD
                  </th>
                  <th rowSpan={2} className={cn(thBase, 'bg-[#5b2c6f] text-white')}>RAM</th>
                  <th rowSpan={2} className={cn(thBase, 'bg-[#5b2c6f] text-white')}>
                    Screen<br />Size
                  </th>
                  <th rowSpan={2} className={cn(thBase, 'bg-[#5b2c6f] text-white')}>
                    Weight<br />(Lbs)
                  </th>
                  <th rowSpan={2} className={cn(thBase, 'bg-[#5b2c6f] text-white')}>
                    Cosmetic<br />Conditions
                  </th>
                  <th rowSpan={2} className={cn(thBase, 'bg-[#5b2c6f] text-white')}>Battery</th>
                  <th rowSpan={2} className={cn(thBase, 'bg-[#5b2c6f] text-white')}>Charger</th>
                  <th rowSpan={2} className={cn(thBase, 'bg-[#5b2c6f] text-white')}>Memory</th>
                  <th rowSpan={2} className={cn(thBase, 'bg-[#5b2c6f] text-white')}>
                    Functional<br />Conditions
                  </th>
                  <th rowSpan={2} className={cn(thBase, 'bg-[#5b2c6f] text-white')}>
                    Test<br />Date
                  </th>
                  <th rowSpan={2} className={cn(thBase, 'bg-[#5b2c6f] text-white')}>
                    Technician<br />Name
                  </th>
                  <th rowSpan={2} className={cn(thBase, 'bg-[#5b2c6f] text-white')}>Comments</th>
                  <th rowSpan={2} className={cn(thBase, 'bg-[#5b2c6f] text-white')}>
                    Remarket<br />Price
                  </th>
                  <th rowSpan={2} className={cn(thBase, 'bg-[#5b2c6f] text-white')}>
                    Service<br />Fee
                  </th>
                  <th rowSpan={2} className={cn(thBase, 'bg-[#5b2c6f] text-white')}>
                    Final<br />Status
                  </th>
                  <th rowSpan={2} className={cn(thBase, 'bg-[#5b2c6f] text-white')}>
                    Additional<br />Notes
                  </th>

                  <th colSpan={4} className={cn(thBase, 'bg-[#548235] text-white')}>
                    HDD #1
                  </th>
                  <th colSpan={4} className={cn(thBase, 'bg-[#548235] text-white')}>
                    HDD #2
                  </th>
                </tr>

                <tr>
                  <th className={cn(thBase, 'bg-[#e2efda] text-black')}>Serial Number</th>
                  <th className={cn(thBase, 'bg-[#e2efda] text-black')}>Size</th>
                  <th className={cn(thBase, 'bg-[#e2efda] text-black')}>Wipe</th>
                  <th className={cn(thBase, 'bg-[#e2efda] text-black')}>Destruction</th>
                  <th className={cn(thBase, 'bg-[#e2efda] text-black')}>Serial Number</th>
                  <th className={cn(thBase, 'bg-[#e2efda] text-black')}>Size</th>
                  <th className={cn(thBase, 'bg-[#e2efda] text-black')}>Wipe</th>
                  <th className={cn(thBase, 'bg-[#e2efda] text-black')}>Destruction</th>
                </tr>
              </thead>

              <tbody>
                {detailRows.map((r) => {
                  const device = r.device || mapDeviceLabel(r.prefix)
                  const weight = cell(r.weightLbs) || kgToLbs(r.weightKg)
                  const ram = r.ramCapacityGb
                    ? /gb/i.test(r.ramCapacityGb)
                      ? r.ramCapacityGb
                      : `${r.ramCapacityGb} GB`
                    : ''
                  const finalStatus = r.finalStatus || mapFinalStatus(r.status)
                  const pdfName = `wipe-${r.serialNumber || r.evidenceId}.pdf`
                  return (
                  <tr key={r.evidenceId} className="hover:bg-[#deebf7]/70">
                    <td
                      className={cn(
                        tdBase,
                        'sticky left-0 z-10 text-center bg-white shadow-[2px_0_4px_rgba(0,0,0,0.08)]'
                      )}
                    >
                      {r.evidenceUrl ? (
                        <a
                          href={r.evidenceUrl}
                          target="_blank"
                          rel="noreferrer"
                          download={pdfName}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 rounded bg-[#c00000] px-1.5 py-1 text-[9px] font-black uppercase tracking-wide text-white hover:bg-[#a00000]"
                          title={`Descargar PDF de borrado · ${r.serialNumber || ''}`}
                        >
                          <FileDown className="h-3.5 w-3.5 shrink-0" />
                          PDF
                        </a>
                      ) : (
                        <span className="text-[10px] font-semibold text-gray-400">—</span>
                      )}
                    </td>
                    <td className={cn(tdBase, 'font-bold text-[#5b2c6f]')}>{cell(r.ordCode)}</td>
                    <td className={cn(tdBase, 'text-center font-bold')}>{cell(r.classificationRec)}</td>
                    <td className={cn(tdBase, 'text-center')}>
                      <button
                        type="button"
                        onClick={() => openClassify(r)}
                        className="inline-flex items-center gap-0.5 rounded bg-[#548235] px-1.5 py-0.5 text-[9px] font-bold uppercase text-white"
                        title="Completar REC, C, F, R2, Sanitization"
                      >
                        <Tags className="h-3 w-3" />
                        Completar
                      </button>
                    </td>

                    <td className={cn(tdBase, 'text-center')}>{cell(device)}</td>
                    <td className={cn(tdBase, 'uppercase text-center')}>{cell(r.make)}</td>
                    <td className={tdBase}>{cell(r.model)}</td>
                    <td className={cn(tdBase, 'font-semibold text-center')}>{cell(r.serialNumber)}</td>
                    <td className={cn(tdBase, 'text-center')}>{cell(r.customerAssetTag)}</td>
                    <td className={cn(tdBase, 'text-center font-bold')}>{cell(r.r2Applicability)}</td>
                    <td className={cn(tdBase, 'text-center font-bold')}>{cell(r.dataSanitization)}</td>
                    <td className={cn(tdBase, 'max-w-[160px] truncate')} title={r.cpu || ''}>
                      {cell(r.cpu)}
                    </td>
                    <td className={cn(tdBase, 'text-center')}>{cell(r.hddCount)}</td>
                    <td className={cn(tdBase, 'text-center')}>{cell(ram)}</td>
                    <td className={cn(tdBase, 'text-center')}>{cell(r.screenSize)?.replace(/"/g, '')}</td>
                    <td className={cn(tdBase, 'text-center')}>{weight}</td>
                    <td className={cn(tdBase, 'text-center font-bold')}>
                      {cell(r.cosmeticConditions || r.classificationC)}
                    </td>
                    <td className={cn(tdBase, 'text-center')} title={r.battery || ''}>
                      {displayBattery(r.battery)}
                    </td>
                    <td className={cn(tdBase, 'text-center')}>{displayCharger(r.charger)}</td>
                    <td className={cn(tdBase, 'text-center')}>
                      {displayMemory(r.memory, r.ramCapacityGb)}
                    </td>
                    <td className={cn(tdBase, 'text-center font-bold')}>
                      {cell(r.functionalConditions || r.classificationF)}
                    </td>
                    <td className={cn(tdBase, 'font-bold text-center')}>
                      {formatTestDateExcel(r.testDate || r.processedTime)}
                    </td>
                    <td className={cn(tdBase, 'max-w-[140px] truncate')} title={r.technicianName || ''}>
                      {cell(r.technicianName)}
                    </td>
                    <td
                      className={cn(tdBase, 'max-w-[220px] truncate text-[#c00000]')}
                      title={r.comments || ''}
                    >
                      {cell(r.comments)}
                    </td>
                    <td className={cn(tdBase, 'text-right')}>{formatMoney(r.remarketPrice)}</td>
                    <td className={cn(tdBase, 'text-right text-[#c00000]')}>
                      {formatMoney(r.serviceFee)}
                    </td>
                    <td className={cn(tdBase, 'text-center text-[#c00000] font-semibold')}>
                      {cell(finalStatus)}
                    </td>
                    <td className={cn(tdBase, 'max-w-[160px] truncate')} title={r.additionalNotes || ''}>
                      {cell(r.additionalNotes)}
                    </td>

                    <td className={cn(tdBase, 'font-semibold text-[#c00000]')}>
                      {cell(r.hdd1Serial || r.serialNumberOfHdd)}
                    </td>
                    <td className={cn(tdBase, 'text-center')}>{cell(r.hdd1Size)}</td>
                    <td className={cn(tdBase, 'text-center font-semibold text-[#c00000]')}>
                      {displayWipe(r.hdd1Wipe)}
                    </td>
                    <td className={cn(tdBase, 'text-center')}>{cell(r.hdd1Destruction)}</td>
                    <td className={cn(tdBase, 'font-semibold text-[#c00000]')}>{cell(r.hdd2Serial)}</td>
                    <td className={cn(tdBase, 'text-center')}>{cell(r.hdd2Size)}</td>
                    <td className={cn(tdBase, 'text-center font-semibold text-[#c00000]')}>
                      {displayWipe(r.hdd2Wipe)}
                    </td>
                    <td className={cn(tdBase, 'text-center')}>{cell(r.hdd2Destruction)}</td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
            )}
          </div>
        )}
      </main>

      {classifying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded border border-gray-400 bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-300 bg-[#548235] px-4 py-3 text-white sticky top-0">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
                  Completar columnas
                </p>
                <p className="text-sm font-bold">
                  {classifying.serialNumber} · {classifying.ordCode || 'sin ORD'}
                </p>
              </div>
              <button type="button" onClick={() => setClassifying(null)} className="rounded p-1 hover:bg-white/20">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2 bg-white text-black">
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase text-gray-800">REC</label>
                <select
                  value={editRec}
                  onChange={(e) => setEditRec(e.target.value)}
                  className={selectClass}
                  style={{ color: '#000', backgroundColor: '#fff' }}
                >
                  <option value="" className={optionClass} style={{ color: '#000', backgroundColor: '#fff' }}>—</option>
                  {REC_OPTIONS.map((v) => (
                    <option key={v} value={v} className={optionClass} style={{ color: '#000', backgroundColor: '#fff' }}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase text-gray-800">
                  R2 Applicability Field
                </label>
                <select
                  value={editR2}
                  onChange={(e) => setEditR2(e.target.value)}
                  className={selectClass}
                  style={{ color: '#000', backgroundColor: '#fff' }}
                >
                  <option value="" className={optionClass} style={{ color: '#000', backgroundColor: '#fff' }}>—</option>
                  {R2_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className={optionClass} style={{ color: '#000', backgroundColor: '#fff' }}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase text-gray-800">
                  Data Sanitization Field
                </label>
                <select
                  value={editSanit}
                  onChange={(e) => setEditSanit(e.target.value)}
                  className={selectClass}
                  style={{ color: '#000', backgroundColor: '#fff' }}
                >
                  <option value="" className={optionClass} style={{ color: '#000', backgroundColor: '#fff' }}>—</option>
                  {SANITIZATION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className={optionClass} style={{ color: '#000', backgroundColor: '#fff' }}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase text-gray-800">Memory</label>
                <select
                  value={editMemory}
                  onChange={(e) => setEditMemory(e.target.value)}
                  className={selectClass}
                  style={{ color: '#000', backgroundColor: '#fff' }}
                >
                  <option value="" className={optionClass} style={{ color: '#000', backgroundColor: '#fff' }}>—</option>
                  <option value="Yes" className={optionClass} style={{ color: '#000', backgroundColor: '#fff' }}>Yes</option>
                  <option value="No" className={optionClass} style={{ color: '#000', backgroundColor: '#fff' }}>No</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase text-gray-800">
                  Cosmetic Conditions (C)
                </label>
                <select
                  value={editC}
                  onChange={(e) => setEditC(e.target.value)}
                  className={selectClass}
                  style={{ color: '#000', backgroundColor: '#fff' }}
                >
                  <option value="" className={optionClass} style={{ color: '#000', backgroundColor: '#fff' }}>—</option>
                  {C_OPTIONS.map((v) => (
                    <option key={v} value={v} className={optionClass} style={{ color: '#000', backgroundColor: '#fff' }}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase text-gray-800">
                  Functional Conditions (F)
                </label>
                <select
                  value={editF}
                  onChange={(e) => setEditF(e.target.value)}
                  className={selectClass}
                  style={{ color: '#000', backgroundColor: '#fff' }}
                >
                  <option value="" className={optionClass} style={{ color: '#000', backgroundColor: '#fff' }}>—</option>
                  {F_OPTIONS.map((v) => (
                    <option key={v} value={v} className={optionClass} style={{ color: '#000', backgroundColor: '#fff' }}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            {classError && <p className="px-4 text-xs font-bold text-rose-700">{classError}</p>}
            <div className="flex justify-end gap-2 border-t border-gray-200 bg-white px-4 py-3">
              <button
                type="button"
                onClick={() => setClassifying(null)}
                className="rounded border-2 border-gray-500 bg-white px-3 py-2 text-xs font-bold text-black"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingClass}
                onClick={() => void saveClassify()}
                className="rounded bg-[#548235] px-4 py-2 text-xs font-black uppercase text-white disabled:opacity-50"
              >
                {savingClass ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
