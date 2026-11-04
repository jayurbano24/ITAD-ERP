'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Trash2, Upload } from 'lucide-react'
import { createPurchaseLot } from '../actions'
import type { PurchaseLotLine } from '../actions'
import {
  parseConfigurationText,
  parsePurchaseLotPaste,
} from '@/lib/inventory/parsePurchaseLotPaste'

type Row = {
  key: string
  serial: string
  manufacturer: string
  model: string
  asset_type: string
  conditionGrade: string
  cost: string
  configuration: string
}

function emptyRow(): Row {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    serial: '',
    manufacturer: '',
    model: '',
    asset_type: 'Laptop',
    conditionGrade: '',
    cost: '',
    configuration: '',
  }
}

export default function PurchaseLotForm({ onDone }: { onDone?: () => void }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [supplierName, setSupplierName] = useState('')
  const [invoiceRef, setInvoiceRef] = useState('')
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState<Row[]>([emptyRow()])
  const [pasteOpen, setPasteOpen] = useState(true)
  const [pasteText, setPasteText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  const total = useMemo(
    () =>
      rows.reduce((sum, r) => {
        const n = parseFloat(r.cost)
        return sum + (Number.isFinite(n) ? n : 0)
      }, 0),
    [rows]
  )

  const updateRow = (key: string, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  const applyPaste = () => {
    const parsed = parsePurchaseLotPaste(pasteText)
    if (parsed.length === 0) {
      setError('No se detectaron filas. Pega: Serie · Marca/Modelo · Grade · Precio · Configuration')
      return
    }
    setError(null)
    setRows(
      parsed.map((p) => ({
        key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        serial: p.serial,
        manufacturer: p.manufacturer || '',
        model: p.model || '',
        asset_type: p.asset_type || 'Laptop',
        conditionGrade: p.conditionGrade || '',
        cost: String(p.cost),
        configuration: p.configuration || '',
      }))
    )
    setPasteOpen(false)
    setPasteText('')
    setOkMsg(`${parsed.length} equipos cargados desde Excel — revisa y guarda`)
  }

  const submit = () => {
    setError(null)
    setOkMsg(null)

    const lines: PurchaseLotLine[] = rows
      .map((r) => {
        const serial = r.serial.trim().toUpperCase()
        const cfg = parseConfigurationText(r.configuration)
        return {
          serial,
          manufacturer: r.manufacturer.trim() || null,
          model: r.model.trim() || null,
          asset_type: r.asset_type.trim() || 'Laptop',
          conditionGrade: r.conditionGrade.trim() || null,
          cost: parseFloat(r.cost),
          configuration: cfg.configuration,
          hardwareSpecs: cfg.hardwareSpecs,
        }
      })
      .filter((l) => l.serial)

    startTransition(async () => {
      const result = await createPurchaseLot({
        supplierName,
        invoiceRef,
        notes,
        lines,
      })
      if (!result.success) {
        setError(result.error || 'No se pudo crear el lote')
        return
      }
      setOkMsg(`Lote ${result.batchCode} · ${result.count} equipos en BOD-REM`)
      setRows([emptyRow()])
      setInvoiceRef('')
      setNotes('')
      router.refresh()
      onDone?.()
    })
  }

  return (
    <div className="bg-white dark:bg-[#1a1f2e] border border-amber-200 dark:border-amber-500/20 rounded-2xl p-5 space-y-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
            Registrar lote comprado
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
            Pega tu Excel: Serial # · Manufacturer Model · Condition · Precio base final · Configuration
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPasteOpen((v) => !v)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30"
        >
          <Upload className="w-3.5 h-3.5" />
          Pegar Excel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="flex flex-col gap-1.5 md:col-span-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Proveedor *</span>
          <input
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f1419] px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white"
            placeholder="Ej. XS Internacional"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Project #</span>
          <input
            value={invoiceRef}
            onChange={(e) => setInvoiceRef(e.target.value)}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f1419] px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white"
            placeholder="Ej. 1118435"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Notas</span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f1419] px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white"
            placeholder="Opcional"
          />
        </label>
      </div>

      {pasteOpen && (
        <div className="space-y-2">
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={8}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f1419] px-3 py-2 text-xs font-mono text-gray-900 dark:text-white"
            placeholder={
              'Serial #\tManufacturer Model\tCondition\tPrecio base final\tConfiguration\n67096131457\tMICROSOFT SURFACE LAP\tGrade B\t140.22\tCore i7 1185G7...'
            }
          />
          <button
            type="button"
            onClick={applyPaste}
            className="px-3 py-2 rounded-lg bg-amber-600 text-white text-xs font-bold"
          >
            Cargar filas pegadas
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800 max-h-[420px]">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 dark:bg-gray-900/50 text-[10px] uppercase tracking-wider text-gray-500 sticky top-0">
            <tr>
              <th className="text-left px-2 py-2">Serie *</th>
              <th className="text-left px-2 py-2">Marca</th>
              <th className="text-left px-2 py-2">Modelo</th>
              <th className="text-left px-2 py-2">Tipo</th>
              <th className="text-left px-2 py-2">Grade</th>
              <th className="text-right px-2 py-2">Costo Q *</th>
              <th className="text-left px-2 py-2">Config</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-gray-100 dark:border-gray-800 align-top">
                <td className="px-2 py-1">
                  <input
                    value={row.serial}
                    onChange={(e) => updateRow(row.key, { serial: e.target.value.toUpperCase() })}
                    className="w-full min-w-[90px] bg-transparent font-mono font-bold text-gray-900 dark:text-white outline-none"
                    placeholder="SERIE"
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    value={row.manufacturer}
                    onChange={(e) => updateRow(row.key, { manufacturer: e.target.value })}
                    className="w-full min-w-[70px] bg-transparent text-gray-900 dark:text-white outline-none"
                    placeholder="Lenovo"
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    value={row.model}
                    onChange={(e) => updateRow(row.key, { model: e.target.value })}
                    className="w-full min-w-[110px] bg-transparent text-gray-900 dark:text-white outline-none"
                    placeholder="ThinkPad T14"
                  />
                </td>
                <td className="px-2 py-1">
                  <select
                    value={row.asset_type}
                    onChange={(e) => updateRow(row.key, { asset_type: e.target.value })}
                    className="bg-transparent text-gray-900 dark:text-white outline-none"
                  >
                    <option value="Laptop">Laptop</option>
                    <option value="Desktop">Desktop</option>
                    <option value="All-in-One">All-in-One</option>
                    <option value="Monitor">Monitor</option>
                    <option value="Other">Other</option>
                  </select>
                </td>
                <td className="px-2 py-1">
                  <select
                    value={row.conditionGrade}
                    onChange={(e) => updateRow(row.key, { conditionGrade: e.target.value })}
                    className="bg-transparent text-gray-900 dark:text-white outline-none"
                  >
                    <option value="">—</option>
                    <option value="Grade A">Grade A</option>
                    <option value="Grade B">Grade B</option>
                    <option value="Grade C">Grade C</option>
                    <option value="Scrap">Scrap (D)</option>
                  </select>
                </td>
                <td className="px-2 py-1 text-right">
                  <input
                    value={row.cost}
                    onChange={(e) => updateRow(row.key, { cost: e.target.value })}
                    className="w-20 text-right bg-transparent font-bold text-amber-700 dark:text-amber-400 outline-none"
                    placeholder="0.00"
                    inputMode="decimal"
                  />
                </td>
                <td className="px-2 py-1 max-w-[180px]">
                  <div className="truncate text-[10px] text-gray-500 dark:text-gray-400" title={row.configuration}>
                    {row.configuration || '—'}
                  </div>
                </td>
                <td className="px-1 py-1 text-center">
                  <button
                    type="button"
                    onClick={() => setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== row.key)))}
                    className="p-1 text-gray-400 hover:text-red-500"
                    title="Quitar fila"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, emptyRow()])}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400"
        >
          <Plus className="w-3.5 h-3.5" />
          Agregar fila
        </button>
        <div className="flex items-center gap-4">
          <span className="text-sm font-black text-gray-900 dark:text-white tabular-nums">
            {rows.filter((r) => r.serial).length} eq · Total Q{' '}
            {total.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={submit}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black uppercase tracking-wider disabled:opacity-50"
          >
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Guardar en Remarketing
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-xl px-3 py-2">
          {error}
        </p>
      )}
      {okMsg && (
        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl px-3 py-2">
          {okMsg}
        </p>
      )}
    </div>
  )
}
