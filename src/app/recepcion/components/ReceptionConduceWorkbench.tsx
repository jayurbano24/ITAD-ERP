'use client'

import { useMemo, useState, type Ref } from 'react'
import { Check, Loader2, Package, Pencil, ScanBarcode, X } from 'lucide-react'
import ReceptionPitoleoPanel from '@/app/recepcion/components/ReceptionPitoleoPanel'
import { cn } from '@/lib/utils'

export type PitoleoUnit = {
  id: string
  serie: string
}

export type PitoleoProductLine = {
  key: string
  marca: string
  modelo: string
  tipo: string
  quantity: number
  withSerial: number
  units: PitoleoUnit[]
}

type Props = {
  ticketLabel?: string
  productLines: PitoleoProductLine[]
  activeProductLineKey: string | null
  activeProductLine: PitoleoProductLine | null
  onSelectLineKey?: (lineKey: string) => void
  onOpenPitoleoByQuantity?: (lineKey: string) => void
  pitoleoInline?: boolean
  serialInput: string
  onSerialInputChange: (value: string) => void
  onSerialKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  serialError: string | null
  addingSerial: boolean
  onRemoveSerial: (unit: PitoleoUnit) => void
  onAddAdditionalSlot: () => void
  serialInputRef: Ref<HTMLInputElement>
  pitoleoPanelRef: Ref<HTMLDivElement>
  inputsDisabled?: boolean
  showCompleteFooter?: boolean
  allSeriesComplete?: boolean
  completingTicket?: boolean
  onCompleteTicket?: () => void
  onSaveLineQuantity?: (lineKey: string, quantity: number) => Promise<string | null>
  savingLineQuantityKey?: string | null
  allowEditQuantity?: boolean
}

export default function ReceptionConduceWorkbench({
  ticketLabel,
  productLines,
  activeProductLineKey,
  activeProductLine,
  onSelectLineKey,
  onOpenPitoleoByQuantity,
  pitoleoInline = true,
  serialInput,
  onSerialInputChange,
  onSerialKeyDown,
  serialError,
  addingSerial,
  onRemoveSerial,
  onAddAdditionalSlot,
  serialInputRef,
  pitoleoPanelRef,
  inputsDisabled,
  showCompleteFooter,
  allSeriesComplete,
  completingTicket,
  onCompleteTicket,
  onSaveLineQuantity,
  savingLineQuantityKey,
  allowEditQuantity,
}: Props) {
  const [editingQtyKey, setEditingQtyKey] = useState<string | null>(null)
  const [draftQty, setDraftQty] = useState('1')
  const [qtyEditError, setQtyEditError] = useState<string | null>(null)

  const startEditQuantity = (line: PitoleoProductLine) => {
    setEditingQtyKey(line.key)
    setDraftQty(String(line.quantity))
    setQtyEditError(null)
  }

  const cancelEditQuantity = () => {
    setEditingQtyKey(null)
    setQtyEditError(null)
  }

  const commitEditQuantity = async (line: PitoleoProductLine) => {
    const parsed = Math.floor(Number(draftQty))
    if (!Number.isFinite(parsed) || parsed < 1) {
      setQtyEditError('Cantidad cerrada: entero ≥ 1')
      return
    }
    if (parsed < line.withSerial) {
      setQtyEditError(`Mínimo ${line.withSerial} (series capturadas)`)
      return
    }
    if (!onSaveLineQuantity) {
      cancelEditQuantity()
      return
    }
    if (parsed === line.quantity) {
      cancelEditQuantity()
      return
    }
    const err = await onSaveLineQuantity(line.key, parsed)
    if (err) {
      setQtyEditError(err)
      return
    }
    cancelEditQuantity()
  }

  const scannedSerialRows = useMemo(
    () =>
      productLines.flatMap((line) =>
        line.units
          .filter((u) => (u.serie || '').trim())
          .map((u) => ({
            id: u.id,
            marca: line.marca,
            modelo: line.modelo,
            tipo: line.tipo,
            serie: (u.serie || '').trim(),
          }))
      ),
    [productLines]
  )

  return (
    <div id="pitoleo-workbench" className="rounded-[1.75rem] border border-gray-100 dark:border-surface-800 bg-white dark:bg-surface-900 shadow-xl overflow-hidden">
      {ticketLabel ? (
        <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-500/10 border-b border-amber-100 dark:border-amber-500/20 flex items-center justify-between gap-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-900 dark:text-amber-200">
            # Ticket: {ticketLabel}
          </p>
          <span className="text-[9px] font-black uppercase tracking-widest text-amber-700/80">
            {productLines.length} ítem(s)
          </span>
        </div>
      ) : null}

      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-black text-white shrink-0">
              2
            </span>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white">
              Listado de equipos del conduce
            </p>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">
            {productLines.length} ítem(s)
          </span>
        </div>

        {productLines.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 dark:border-surface-700 p-12 text-center">
            <Package className="mx-auto w-10 h-10 text-gray-300 mb-2 opacity-60" />
            <p className="text-xs font-black uppercase tracking-widest text-gray-400">
              Sin equipos en este ticket
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-800 bg-gray-950 text-white">
            <table className="w-full min-w-[640px] text-left">
              <thead className="text-[9px] font-black uppercase tracking-widest text-gray-300">
                <tr>
                  <th className="px-3 py-2.5">Tipos</th>
                  <th className="px-3 py-2.5">Marca</th>
                  <th className="px-3 py-2.5">Modelo</th>
                  <th className="px-3 py-2.5 text-center">Cantidad</th>
                  <th className="px-3 py-2.5 text-center">Recibido</th>
                  <th className="px-3 py-2.5 text-center">Pendiente</th>
                  <th className="px-3 py-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-xs bg-white dark:bg-surface-900 text-gray-900 dark:text-white">
                {productLines.map((line) => {
                  const pending = Math.max(line.quantity - line.withSerial, 0)
                  const isSelected =
                    activeProductLineKey === line.key
                  const openByQty = Boolean(onOpenPitoleoByQuantity)
                  return (
                    <tr
                      key={line.key}
                      role={openByQty ? undefined : 'button'}
                      tabIndex={openByQty ? undefined : 0}
                      onClick={
                        openByQty
                          ? undefined
                          : () => onSelectLineKey?.(line.key)
                      }
                      onKeyDown={
                        openByQty
                          ? undefined
                          : (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                onSelectLineKey?.(line.key)
                              }
                            }
                      }
                      className={cn(
                        'border-t border-gray-100 dark:border-surface-800 transition-colors',
                        openByQty ? '' : 'cursor-pointer',
                        isSelected
                          ? 'bg-cyan-500/10 ring-2 ring-inset ring-cyan-500/40'
                          : openByQty
                            ? ''
                            : 'hover:bg-gray-50/90 dark:hover:bg-surface-950/60'
                      )}
                    >
                      <td className="px-3 py-2.5 font-bold">{line.tipo}</td>
                      <td className="px-3 py-2.5">{line.marca}</td>
                      <td className="px-3 py-2.5">{line.modelo}</td>
                      <td className="px-3 py-2.5 text-center">
                        {editingQtyKey === line.key && allowEditQuantity ? (
                          <div className="inline-flex flex-col items-center gap-1">
                            <div className="inline-flex items-center gap-1">
                              <input
                                type="number"
                                min={Math.max(1, line.withSerial)}
                                step={1}
                                inputMode="numeric"
                                value={draftQty}
                                disabled={savingLineQuantityKey === line.key}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/[^\d]/g, '')
                                  setDraftQty(raw)
                                  setQtyEditError(null)
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    void commitEditQuantity(line)
                                  }
                                  if (e.key === 'Escape') cancelEditQuantity()
                                }}
                                className="w-14 px-1 py-1 rounded-lg border border-cyan-500/40 bg-white dark:bg-surface-950 font-mono font-black text-center text-sm"
                                aria-label="Cantidad cerrada"
                              />
                              <button
                                type="button"
                                disabled={savingLineQuantityKey === line.key}
                                onClick={() => void commitEditQuantity(line)}
                                className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
                                title="Guardar cantidad"
                              >
                                {savingLineQuantityKey === line.key ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                disabled={savingLineQuantityKey === line.key}
                                onClick={cancelEditQuantity}
                                className="p-1.5 rounded-lg border border-gray-200 dark:border-surface-700 text-gray-500 hover:text-gray-800"
                                title="Cancelar"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {qtyEditError ? (
                              <span className="text-[9px] font-bold text-rose-500 max-w-[140px] leading-tight">
                                {qtyEditError}
                              </span>
                            ) : (
                              <span className="text-[8px] uppercase tracking-widest text-gray-400">
                                Entero cerrado · mín. {line.withSerial}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 justify-center">
                            {openByQty ? (
                              <button
                                type="button"
                                onClick={() => onOpenPitoleoByQuantity?.(line.key)}
                                className={cn(
                                  'min-w-[2.5rem] px-2 py-1 rounded-lg font-mono font-black text-base',
                                  'text-cyan-700 dark:text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25',
                                  'ring-1 ring-cyan-500/30 transition-colors'
                                )}
                                title="Pistolear series de esta línea"
                              >
                                {line.quantity}
                              </button>
                            ) : (
                              <span className="font-mono font-black min-w-[2.5rem]">{line.quantity}</span>
                            )}
                            {allowEditQuantity && onSaveLineQuantity ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  startEditQuantity(line)
                                }}
                                disabled={Boolean(savingLineQuantityKey) || inputsDisabled}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-cyan-700 hover:bg-cyan-500/10 disabled:opacity-40"
                                title="Editar cantidad (entero cerrado)"
                                aria-label="Editar cantidad"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            ) : null}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono font-black text-emerald-600">
                        {line.withSerial}
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono font-black text-amber-600">{pending}</td>
                      <td className="px-3 py-2.5 text-right">
                        <span
                          className={cn(
                            'inline-flex p-2 rounded-lg',
                            isSelected ? 'bg-cyan-600 text-white' : 'bg-cyan-600/15 text-cyan-700'
                          )}
                        >
                          <ScanBarcode className="w-4 h-4" />
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {productLines.length > 0 ? (
          <div className="rounded-2xl border border-gray-100 dark:border-surface-800 bg-gray-50/80 dark:bg-surface-950/50 overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-gray-100 dark:border-surface-800">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-surface-200">
                Series pistoleadas
              </p>
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">
                {scannedSerialRows.length} capturada(s)
              </span>
            </div>
            {scannedSerialRows.length === 0 ? (
              <p className="text-center text-[10px] font-bold uppercase tracking-widest text-gray-400 py-8 px-4">
                Al escanear, cada serie se listará aquí con marca y modelo
              </p>
            ) : (
              <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
                <table className="w-full min-w-[480px] text-left text-xs">
                  <thead className="sticky top-0 z-[1] bg-gray-100 dark:bg-surface-900 text-[9px] font-black uppercase tracking-widest text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Marca</th>
                      <th className="px-3 py-2">Modelo</th>
                      <th className="px-3 py-2">Serie</th>
                      <th className="px-3 py-2 text-right w-16">#</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-surface-800 bg-white dark:bg-surface-900">
                    {scannedSerialRows.map((row, idx) => (
                      <tr
                        key={row.id}
                        className="animate-in fade-in duration-200"
                      >
                        <td className="px-3 py-2.5 font-bold text-gray-800 dark:text-white">{row.marca}</td>
                        <td className="px-3 py-2.5 text-gray-700 dark:text-surface-200">{row.modelo}</td>
                        <td className="px-3 py-2.5 font-mono font-black text-cyan-700 dark:text-cyan-300">
                          {row.serie}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-[10px] text-gray-400">
                          {idx + 1}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}

        {pitoleoInline && activeProductLine ? (
          <ReceptionPitoleoPanel
            line={activeProductLine}
            serialInput={serialInput}
            onSerialInputChange={onSerialInputChange}
            onSerialKeyDown={onSerialKeyDown}
            serialError={serialError}
            addingSerial={addingSerial}
            onRemoveSerial={onRemoveSerial}
            onAddAdditionalSlot={onAddAdditionalSlot}
            serialInputRef={serialInputRef}
            panelRef={pitoleoPanelRef}
            inputsDisabled={inputsDisabled}
            className="animate-in fade-in duration-300"
          />
        ) : productLines.length > 0 && !pitoleoInline ? (
          <p className="text-center text-[10px] font-bold uppercase tracking-widest text-gray-400 py-4">
            Pulse el número en <span className="text-cyan-600">Cantidad</span> para abrir el pistoleo
          </p>
        ) : productLines.length > 0 ? (
          <p className="text-center text-[10px] font-bold uppercase tracking-widest text-gray-400 py-4">
            Pulse una fila del listado para pistolear series
          </p>
        ) : null}
      </div>

      {showCompleteFooter ? (
        <div className="px-4 pb-4">
          <button
            type="button"
            disabled={completingTicket || !allSeriesComplete}
            onClick={onCompleteTicket}
            className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gray-200 dark:bg-surface-800 text-gray-500 enabled:bg-indigo-600 enabled:text-white enabled:hover:bg-indigo-500"
          >
            {allSeriesComplete
              ? 'Series completas — enviar a bodega'
              : 'Complete el pistoleo de series'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
