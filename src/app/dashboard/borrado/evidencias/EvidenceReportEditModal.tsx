'use client'

import { X } from 'lucide-react'
import { THINKPAD_GEN_SUGGESTIONS } from '@/lib/wipe/resolveWipeDisplayModel'
import type { EvidenceReportFormState } from '@/lib/wipe/evidenceReportEditFields'
import { REC_OPTIONS, F_OPTIONS, C_OPTIONS, R2_OPTIONS, SANITIZATION_OPTIONS } from './evidenceEditConstants'

const inputClass =
  'w-full rounded-lg border-2 border-gray-400 px-2 py-1.5 text-sm text-black bg-white'
const labelClass = 'mb-0.5 block text-[10px] font-black uppercase text-gray-800'
const selectClass =
  'w-full rounded-lg border-2 border-gray-400 bg-white px-2 py-1.5 text-sm font-bold text-black [color-scheme:light]'

type Props = {
  title: string
  subtitle: string
  bulk: boolean
  form: EvidenceReportFormState
  setForm: React.Dispatch<React.SetStateAction<EvidenceReportFormState>>
  error: string | null
  saving: boolean
  onClose: () => void
  onSave: () => void
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded border border-gray-300 p-3">
      <legend className="px-1 text-[10px] font-black uppercase text-[#5b2c6f]">{title}</legend>
      <div className="grid gap-2 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className || ''}>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  )
}

export function EvidenceReportEditModal({
  title,
  subtitle,
  bulk,
  form,
  setForm,
  error,
  saving,
  onClose,
  onSave,
}: Props) {
  const set = (key: keyof EvidenceReportFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-3xl rounded border border-gray-400 bg-white shadow-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-300 bg-[#5b2c6f] px-4 py-3 text-white shrink-0">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{title}</p>
            <p className="text-sm font-bold">{subtitle}</p>
            {bulk && (
              <p className="text-[10px] mt-1 opacity-90">
                Solo los campos que llenes se aplicarán a todos los equipos seleccionados.
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-white/20">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 grid gap-3 bg-white text-black">
          <Section title="Identificación">
            <Field label="Device">
              <input className={inputClass} value={form.device} onChange={(e) => set('device', e.target.value)} />
            </Field>
            <Field label="Make">
              <input className={inputClass} value={form.make} onChange={(e) => set('make', e.target.value)} />
            </Field>
            <Field label="Model (comercial)" className="sm:col-span-2">
              <input
                list="thinkpad-models-ev"
                className={inputClass}
                value={form.model}
                onChange={(e) => set('model', e.target.value)}
                placeholder="ThinkPad T14 Gen 2"
              />
              <datalist id="thinkpad-models-ev">
                {THINKPAD_GEN_SUGGESTIONS.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </Field>
            <Field label="Serial Number">
              <input
                className={inputClass}
                value={form.serialNumber}
                onChange={(e) => set('serialNumber', e.target.value)}
              />
            </Field>
            <Field label="Customer Asset Tag#">
              <input
                className={inputClass}
                value={form.customerAssetTag}
                onChange={(e) => set('customerAssetTag', e.target.value)}
              />
            </Field>
            <Field label="Main Board Part" className="sm:col-span-2">
              <input
                className={inputClass}
                value={form.mainBoardPart}
                onChange={(e) => set('mainBoardPart', e.target.value)}
              />
            </Field>
          </Section>

          <Section title="Clasificación ITAD">
            <Field label="REC">
              <select className={selectClass} value={form.rec} onChange={(e) => set('rec', e.target.value)}>
                <option value="">—</option>
                {REC_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="R2 Applicability">
              <select
                className={selectClass}
                value={form.r2Applicability}
                onChange={(e) => set('r2Applicability', e.target.value)}
              >
                <option value="">—</option>
                {R2_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Data Sanitization">
              <select
                className={selectClass}
                value={form.dataSanitization}
                onChange={(e) => set('dataSanitization', e.target.value)}
              >
                <option value="">—</option>
                {SANITIZATION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Memory (test)">
              <select className={selectClass} value={form.memory} onChange={(e) => set('memory', e.target.value)}>
                <option value="">—</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="Pass">Pass</option>
              </select>
            </Field>
            <Field label="Cosmetic (C)">
              <select className={selectClass} value={form.c} onChange={(e) => set('c', e.target.value)}>
                <option value="">—</option>
                {C_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Functional (F)">
              <select className={selectClass} value={form.f} onChange={(e) => set('f', e.target.value)}>
                <option value="">—</option>
                {F_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
          </Section>

          <Section title="Especificaciones">
            <Field label="CPU / Processor" className="sm:col-span-2">
              <input className={inputClass} value={form.cpu} onChange={(e) => set('cpu', e.target.value)} />
            </Field>
            <Field label="RAM">
              <input
                className={inputClass}
                value={form.ramCapacityGb}
                onChange={(e) => set('ramCapacityGb', e.target.value)}
              />
            </Field>
            <Field label="RAM Type">
              <input className={inputClass} value={form.ramType} onChange={(e) => set('ramType', e.target.value)} />
            </Field>
            <Field label="Screen Size">
              <input
                className={inputClass}
                value={form.screenSize}
                onChange={(e) => set('screenSize', e.target.value)}
              />
            </Field>
            <Field label="Weight (Lbs)">
              <input className={inputClass} value={form.weightLbs} onChange={(e) => set('weightLbs', e.target.value)} />
            </Field>
            <Field label="# HDD">
              <input className={inputClass} value={form.hddCount} onChange={(e) => set('hddCount', e.target.value)} />
            </Field>
            <Field label="Battery">
              <input className={inputClass} value={form.battery} onChange={(e) => set('battery', e.target.value)} />
            </Field>
            <Field label="Charger">
              <input className={inputClass} value={form.charger} onChange={(e) => set('charger', e.target.value)} />
            </Field>
          </Section>

          <Section title="HDD #1">
            <Field label="Serial">
              <input className={inputClass} value={form.hdd1Serial} onChange={(e) => set('hdd1Serial', e.target.value)} />
            </Field>
            <Field label="Size">
              <input className={inputClass} value={form.hdd1Size} onChange={(e) => set('hdd1Size', e.target.value)} />
            </Field>
            <Field label="Wipe">
              <input className={inputClass} value={form.hdd1Wipe} onChange={(e) => set('hdd1Wipe', e.target.value)} />
            </Field>
            <Field label="Destruction">
              <input
                className={inputClass}
                value={form.hdd1Destruction}
                onChange={(e) => set('hdd1Destruction', e.target.value)}
              />
            </Field>
          </Section>

          <Section title="HDD #2">
            <Field label="Serial">
              <input className={inputClass} value={form.hdd2Serial} onChange={(e) => set('hdd2Serial', e.target.value)} />
            </Field>
            <Field label="Size">
              <input className={inputClass} value={form.hdd2Size} onChange={(e) => set('hdd2Size', e.target.value)} />
            </Field>
            <Field label="Wipe">
              <input className={inputClass} value={form.hdd2Wipe} onChange={(e) => set('hdd2Wipe', e.target.value)} />
            </Field>
            <Field label="Destruction">
              <input
                className={inputClass}
                value={form.hdd2Destruction}
                onChange={(e) => set('hdd2Destruction', e.target.value)}
              />
            </Field>
          </Section>

          <Section title="Cierre y precios">
            <Field label="Test Date">
              <input className={inputClass} value={form.testDate} onChange={(e) => set('testDate', e.target.value)} />
            </Field>
            <Field label="Technician">
              <input
                className={inputClass}
                value={form.technicianName}
                onChange={(e) => set('technicianName', e.target.value)}
              />
            </Field>
            <Field label="Remarket Price">
              <input
                className={inputClass}
                value={form.remarketPrice}
                onChange={(e) => set('remarketPrice', e.target.value)}
              />
            </Field>
            <Field label="Service Fee">
              <input className={inputClass} value={form.serviceFee} onChange={(e) => set('serviceFee', e.target.value)} />
            </Field>
            <Field label="Comments" className="sm:col-span-2">
              <textarea
                className={inputClass}
                rows={2}
                value={form.comments}
                onChange={(e) => set('comments', e.target.value)}
              />
            </Field>
            <Field label="Additional Notes" className="sm:col-span-2">
              <textarea
                className={inputClass}
                rows={2}
                value={form.additionalNotes}
                onChange={(e) => set('additionalNotes', e.target.value)}
              />
            </Field>
          </Section>
        </div>

        {error && <p className="px-4 text-xs font-bold text-rose-700 shrink-0">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-gray-200 bg-white px-4 py-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded border-2 border-gray-500 bg-white px-3 py-2 text-xs font-bold text-black"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="rounded bg-[#5b2c6f] px-4 py-2 text-xs font-black uppercase text-white disabled:opacity-50"
          >
            {saving ? 'Guardando…' : bulk ? 'Aplicar a selección' : 'Guardar fila completa'}
          </button>
        </div>
      </div>
    </div>
  )
}