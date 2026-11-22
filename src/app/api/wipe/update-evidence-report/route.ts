import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { setSession } from '@/lib/supabase/session'
import type { EvidenceReportPatch } from '@/lib/wipe/evidenceReportEditFields'

const REC_VALUES = new Set(['R', 'E', 'C'])
const F_VALUES = new Set(['F1', 'F2', 'F3', 'F4', 'F5', 'F6'])
const C_VALUES = new Set(['C0', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9'])
const R2_VALUES = new Set(['C', 'U'])
const SANITIZATION_VALUES = new Set(['D1', 'D2', 'D3'])

type Body = EvidenceReportPatch & {
  assetId?: string
  assetIds?: string[]
}

function trimOrNull(v: string | null | undefined): string | null {
  if (v === undefined) return undefined as unknown as null
  const t = (v ?? '').trim()
  return t || null
}

async function applyReportPatch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  assetId: string,
  body: EvidenceReportPatch
) {
  const { data: asset, error: assetError } = await supabase
    .from('assets')
    .select('id, serial_number, internal_tag, manufacturer, model, sales_price, wipe_notes, specifications')
    .eq('id', assetId)
    .maybeSingle()

  if (assetError || !asset) {
    return { error: assetError?.message || 'Activo no encontrado' }
  }

  const specs =
    asset.specifications && typeof asset.specifications === 'object'
      ? { ...(asset.specifications as Record<string, unknown>) }
      : {}

  const reportOverrides: Record<string, unknown> = {
    ...(typeof specs.report_overrides === 'object' && specs.report_overrides
      ? (specs.report_overrides as Record<string, unknown>)
      : {}),
  }

  const assign = (key: string, value: string | null | undefined) => {
    if (value === undefined) return
    reportOverrides[key] = value
  }

  assign('make', body.make !== undefined ? trimOrNull(body.make) : undefined)
  assign('model', body.model !== undefined ? trimOrNull(body.model) : undefined)
  assign('device', body.device !== undefined ? trimOrNull(body.device) : undefined)
  assign('serialNumber', body.serialNumber !== undefined ? trimOrNull(body.serialNumber) : undefined)
  assign('customerAssetTag', body.customerAssetTag !== undefined ? trimOrNull(body.customerAssetTag) : undefined)
  assign('mainBoardPart', body.mainBoardPart !== undefined ? trimOrNull(body.mainBoardPart) : undefined)
  assign('cpu', body.cpu !== undefined ? trimOrNull(body.cpu) : undefined)
  assign('ramCapacityGb', body.ramCapacityGb !== undefined ? trimOrNull(body.ramCapacityGb) : undefined)
  assign('ramType', body.ramType !== undefined ? trimOrNull(body.ramType) : undefined)
  assign('screenSize', body.screenSize !== undefined ? trimOrNull(body.screenSize) : undefined)
  assign('weightLbs', body.weightLbs !== undefined ? trimOrNull(body.weightLbs) : undefined)
  assign('battery', body.battery !== undefined ? trimOrNull(body.battery) : undefined)
  assign('charger', body.charger !== undefined ? trimOrNull(body.charger) : undefined)
  assign('technicianName', body.technicianName !== undefined ? trimOrNull(body.technicianName) : undefined)
  assign('testDate', body.testDate !== undefined ? trimOrNull(body.testDate) : undefined)
  assign('comments', body.comments !== undefined ? trimOrNull(body.comments) : undefined)

  const wipeReport =
    specs.wipe_report && typeof specs.wipe_report === 'object'
      ? { ...(specs.wipe_report as Record<string, unknown>) }
      : {}

  if (reportOverrides.model) wipeReport.displayModel = reportOverrides.model
  for (const k of ['make', 'cpu', 'ramCapacityGb', 'ramType', 'screenSize', 'technicianName', 'testDate', 'comments', 'battery', 'charger', 'mainBoardPart', 'serialNumber'] as const) {
    const v = reportOverrides[k]
    if (v) (wipeReport as Record<string, unknown>)[k] = v
  }

  if (body.hddCount !== undefined) {
    const n = parseInt(String(body.hddCount), 10)
    if (!Number.isNaN(n)) wipeReport.hddCount = n
  }

  const disks = Array.isArray(wipeReport.disks)
    ? ([...(wipeReport.disks as Record<string, unknown>[])] as Record<string, unknown>[])
    : [{}, {}]
  while (disks.length < 2) disks.push({})
  const touchDisk = (idx: number, field: string, val: string | null | undefined) => {
    if (val === undefined) return
    disks[idx] = { ...disks[idx], [field]: val }
  }
  touchDisk(0, 'serial', body.hdd1Serial !== undefined ? trimOrNull(body.hdd1Serial) : undefined)
  touchDisk(0, 'size', body.hdd1Size !== undefined ? trimOrNull(body.hdd1Size) : undefined)
  touchDisk(0, 'wipeStatus', body.hdd1Wipe !== undefined ? trimOrNull(body.hdd1Wipe) : undefined)
  touchDisk(0, 'destruction', body.hdd1Destruction !== undefined ? trimOrNull(body.hdd1Destruction) : undefined)
  touchDisk(1, 'serial', body.hdd2Serial !== undefined ? trimOrNull(body.hdd2Serial) : undefined)
  touchDisk(1, 'size', body.hdd2Size !== undefined ? trimOrNull(body.hdd2Size) : undefined)
  touchDisk(1, 'wipeStatus', body.hdd2Wipe !== undefined ? trimOrNull(body.hdd2Wipe) : undefined)
  touchDisk(1, 'destruction', body.hdd2Destruction !== undefined ? trimOrNull(body.hdd2Destruction) : undefined)
  if (
    body.hdd1Serial !== undefined ||
    body.hdd1Size !== undefined ||
    body.hdd2Serial !== undefined
  ) {
    wipeReport.disks = disks.filter((d) => Object.keys(d).length > 0)
  }

  const rec = body.rec !== undefined ? trimOrNull(body.rec)?.toUpperCase() || null : undefined
  const c = body.c !== undefined ? trimOrNull(body.c)?.toUpperCase() || null : undefined
  const f = body.f !== undefined ? trimOrNull(body.f)?.toUpperCase() || null : undefined
  const r2 = body.r2Applicability !== undefined ? trimOrNull(body.r2Applicability)?.toUpperCase() || null : undefined
  const sanitization =
    body.dataSanitization !== undefined ? trimOrNull(body.dataSanitization)?.toUpperCase() || null : undefined
  let memory: string | null | undefined = undefined
  if (body.memory !== undefined) {
    const m = trimOrNull(body.memory)
    memory = m ? m.charAt(0).toUpperCase() + m.slice(1).toLowerCase() : null
  }

  if (rec !== undefined && rec && !REC_VALUES.has(rec)) return { error: `REC inválido: ${rec}` }
  if (c !== undefined && c && !C_VALUES.has(c)) return { error: `Cosmetic inválido: ${c}` }
  if (f !== undefined && f && !F_VALUES.has(f)) return { error: `Functional inválido: ${f}` }
  if (r2 !== undefined && r2 && !R2_VALUES.has(r2)) return { error: `R2 inválido: ${r2}` }
  if (sanitization !== undefined && sanitization && !SANITIZATION_VALUES.has(sanitization)) {
    return { error: `Sanitization inválido: ${sanitization}` }
  }

  const workshop = (specs.workshop_classifications || {}) as Record<string, unknown>
  const nextWorkshop = { ...workshop }
  if (rec !== undefined) nextWorkshop.rec = rec
  if (c !== undefined) nextWorkshop.c = c
  if (f !== undefined) nextWorkshop.f = f
  if (r2 !== undefined) nextWorkshop.r2_applicability = r2
  if (sanitization !== undefined) nextWorkshop.data_sanitization = sanitization
  if (memory !== undefined) nextWorkshop.memory = memory

  const nextSpecs: Record<string, unknown> = {
    ...specs,
    report_overrides: reportOverrides,
    wipe_report: wipeReport,
    workshop_classifications: nextWorkshop,
    hardware_specs: {
      ...((specs.hardware_specs as Record<string, unknown>) || {}),
      ...(reportOverrides.cpu ? { processor: reportOverrides.cpu } : {}),
      ...(reportOverrides.ramCapacityGb ? { ram_capacity: reportOverrides.ramCapacityGb } : {}),
      ...(reportOverrides.screenSize ? { screen_size: reportOverrides.screenSize } : {}),
    },
  }
  if (rec !== undefined) nextSpecs.rec_classification_out = rec
  if (c !== undefined) nextSpecs.c_classification_out = c
  if (f !== undefined) nextSpecs.f_classification_out = f
  if (r2 !== undefined) nextSpecs.r2_applicability = r2
  if (sanitization !== undefined) nextSpecs.data_sanitization = sanitization
  if (memory !== undefined) nextSpecs.memory = memory

  let salesPrice = asset.sales_price
  if (body.remarketPrice !== undefined) {
    const n = parseFloat(String(body.remarketPrice).replace(/[^0-9.-]/g, ''))
    if (!Number.isNaN(n)) salesPrice = n
  }

  const assetUpdate: Record<string, unknown> = {
    specifications: nextSpecs,
    updated_at: new Date().toISOString(),
  }
  if (reportOverrides.model) assetUpdate.model = reportOverrides.model
  if (reportOverrides.make) assetUpdate.manufacturer = reportOverrides.make
  if (body.serialNumber !== undefined && trimOrNull(body.serialNumber)) {
    assetUpdate.serial_number = trimOrNull(body.serialNumber)
  }
  if (body.customerAssetTag !== undefined && trimOrNull(body.customerAssetTag)) {
    assetUpdate.internal_tag = trimOrNull(body.customerAssetTag)
  }
  if (body.additionalNotes !== undefined) assetUpdate.wipe_notes = trimOrNull(body.additionalNotes)
  if (body.remarketPrice !== undefined) assetUpdate.sales_price = salesPrice

  const { error: updateError } = await supabase.from('assets').update(assetUpdate).eq('id', assetId)
  if (updateError) return { error: updateError.message }

  if (rec !== undefined || c !== undefined || f !== undefined) {
    await supabase
      .from('work_orders')
      .update({
        ...(rec !== undefined ? { rec_classification: rec } : {}),
        ...(c !== undefined ? { c_classification: c } : {}),
        ...(f !== undefined ? { f_classification: f } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('asset_id', assetId)
  }

  const { data: evidenceRows } = await supabase
    .from('asset_wipe_evidence')
    .select('id, parsed_json')
    .eq('asset_id', assetId)
    .eq('type', 'pdf')
    .order('created_at', { ascending: false })
    .limit(1)

  const ev = evidenceRows?.[0]
  if (ev?.id) {
    const pj =
      ev.parsed_json && typeof ev.parsed_json === 'object'
        ? { ...(ev.parsed_json as Record<string, unknown>), ...wipeReport }
        : wipeReport
    await supabase.from('asset_wipe_evidence').update({ parsed_json: pj }).eq('id', ev.id)
  }

  return { ok: true as const }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body
    const ids = [
      ...(Array.isArray(body.assetIds) ? body.assetIds : []),
      ...(body.assetId?.trim() ? [body.assetId.trim()] : []),
    ].filter((id, i, a) => a.indexOf(id) === i)

    if (!ids.length) {
      return NextResponse.json({ error: 'assetId o assetIds es requerido' }, { status: 400 })
    }

    const supabase = await createClient()
    await setSession(supabase)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const {
      assetId: _a,
      assetIds: _b,
      ...patch
    } = body

    let updated = 0
    for (const assetId of ids) {
      const result = await applyReportPatch(supabase, assetId, patch)
      if (result.error) {
        return NextResponse.json({ error: `${assetId}: ${result.error}` }, { status: 400 })
      }
      updated += 1
    }

    return NextResponse.json({ success: true, updated })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al guardar'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}