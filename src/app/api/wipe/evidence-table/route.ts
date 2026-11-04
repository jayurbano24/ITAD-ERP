import { createClient } from '@/lib/supabase/server'
import { parseWipeReportPdfBuffer } from '@/lib/wipe/parseWipeReportPdf'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type EvidenceRow = {
  id: string
  asset_id: string
  type: string
  file_name: string | null
  file_url: string | null
  parsed_json: Record<string, unknown> | null
  created_at: string | null
}

type AssetRow = {
  id: string
  serial_number: string | null
  internal_tag: string | null
  manufacturer: string | null
  model: string | null
  asset_type: string | null
  color: string | null
  status: string | null
  sales_price: number | null
  batch_id: string | null
  wipe_certificate_id: string | null
  wipe_software: string | null
  wipe_result: string | null
  wipe_notes: string | null
  wipe_completed_at: string | null
  specifications: Record<string, unknown> | null
}

function mapDeviceLabel(prefix: string | null, assetType: string | null): string | null {
  const src = `${prefix || ''} ${assetType || ''}`.toLowerCase()
  if (/lap|notebook|elitebook|latitude|thinkpad|macbook/.test(src)) return 'Laptop'
  if (/des|desktop|tower|optiplex/.test(src)) return 'Desktop'
  if (/srv|server|poweredge|proliant/.test(src)) return 'Server'
  if (/tab|tablet|ipad/.test(src)) return 'Tablet'
  if (/all.?in.?one|aio/.test(src)) return 'All-in-One'
  if (prefix === 'LAP') return 'Laptop'
  if (prefix === 'DES') return 'Desktop'
  if (prefix === 'SRV') return 'Server'
  if (prefix === 'TAB') return 'Tablet'
  return prefix || assetType || null
}

function mapFinalStatus(status: string | null | undefined): string | null {
  if (!status) return null
  const s = status.toLowerCase().replace(/_/g, ' ')
  if (s.includes('ready for sale') || s.includes('resale')) return 'Resale'
  if (s === 'sold' || s.includes('vendido')) return 'Sold'
  if (s.includes('spare') || s.includes('sapare')) return 'Spare'
  if (s.includes('recycle') || s.includes('destroy') || s.includes('scrap')) return 'Recycle'
  if (s.includes('wipe') || s.includes('borrad')) return 'Wiped'
  return status
}

function extractOrd(value: string | null | undefined): string | null {
  if (!value) return null
  const match = value.match(/\b(ORD\s*[-]?\s*\d{4,})\b/i)
  if (!match) return value.toUpperCase().startsWith('ORD') ? value.replace(/\s+/g, '').toUpperCase() : null
  return match[1].replace(/\s+/g, '').replace(/ORD-/i, 'ORD').toUpperCase()
}

/** Comentarios = errores del certificado (Failed) + método wipe */
function buildCommentsFromCertificate(parsed: Record<string, unknown>): string | null {
  const errors = Array.isArray(parsed.errors)
    ? (parsed.errors as unknown[]).map((e) => String(e)).filter(Boolean)
    : []

  if (errors.length === 0) {
    const candidates: Array<[string, unknown]> = [
      ['Battery', parsed.battery],
      ['Power/Heat', parsed.powerOnOverHeat],
      ['Screen', parsed.screen],
      ['Keyboard', parsed.keyboard],
      ['Wi-Fi', parsed.comments],
    ]
    for (const [label, value] of candidates) {
      if (typeof value === 'string' && /fail/i.test(value)) {
        // Evitar duplicar el bloque comments completo como "Wi-Fi"
        if (label === 'Wi-Fi' && /Método:|Wipe:/i.test(value)) continue
        errors.push(`${label}: ${value.replace(/\s+/g, ' ').trim()}`)
      }
    }
    // Desglose Power/Heat
    const power = typeof parsed.powerOnOverHeat === 'string' ? parsed.powerOnOverHeat : ''
    for (const part of power.split(/\s*\/\s*/)) {
      if (/fail/i.test(part) && !errors.some((e) => e.includes(part.trim()))) {
        errors.push(part.trim())
      }
    }
  }

  const extras: string[] = []
  if (typeof parsed.comments === 'string' && parsed.comments) {
    for (const part of parsed.comments.split(/\s*·\s*/)) {
      if (/fail/i.test(part) && !errors.some((e) => e.toLowerCase().includes(part.toLowerCase().slice(0, 12)))) {
        errors.push(part.trim())
      }
      if (/^Método:/i.test(part) || /^Wipe:/i.test(part)) extras.push(part.trim())
    }
  }

  const uniqueErrors = Array.from(new Set(errors.map((e) => e.trim()).filter(Boolean)))
  const parts = [...uniqueErrors, ...extras.filter((e) => !uniqueErrors.includes(e))]
  return parts.length ? parts.join(' · ') : null
}

function cleanClass(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const s = String(value)
  if (!s || s === '$undefined') return null
  return s
}

function readClassifications(specs: Record<string, unknown> | null | undefined) {
  const wc = asRecord(specs?.workshop_classifications) || {}
  return {
    rec: cleanClass(wc.rec ?? specs?.rec_classification_out ?? specs?.rec),
    c: cleanClass(wc.c ?? specs?.c_classification_out ?? specs?.c),
    f: cleanClass(wc.f ?? specs?.f_classification_out ?? specs?.f),
    r2Applicability: cleanClass(
      wc.r2_applicability ?? specs?.r2_applicability ?? specs?.r2Applicability
    ),
    dataSanitization: cleanClass(
      wc.data_sanitization ?? specs?.data_sanitization ?? specs?.dataSanitization
    ),
    memory: cleanClass(wc.memory ?? specs?.memory),
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value) return null
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null
    } catch {
      return null
    }
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

/** Certificado útil = tiene CPU, RAM o disco del PDF */
function isCertificateRich(parsed: Record<string, unknown> | null | undefined): boolean {
  if (!parsed) return false
  const disks = parsed.disks
  const hasDisk =
    Array.isArray(disks) &&
    disks.some((d) => d && typeof d === 'object' && ((d as Record<string, unknown>).serial || (d as Record<string, unknown>).size))
  return Boolean(parsed.cpu || parsed.ramCapacityGb || parsed.technicianName || hasDisk)
}

function pickCertificate(
  evidenceParsed: unknown,
  assetSpecs: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const fromEvidence = asRecord(evidenceParsed)
  const fromAsset = asRecord(assetSpecs?.wipe_report)
  if (isCertificateRich(fromEvidence)) return fromEvidence!
  if (isCertificateRich(fromAsset)) return fromAsset!
  return fromEvidence || fromAsset || {}
}

function scoreEvidence(row: EvidenceRow, asset: AssetRow | undefined): number {
  let score = 0
  if (row.type === 'pdf') score += 10
  const parsed = pickCertificate(row.parsed_json, asset?.specifications)
  if (isCertificateRich(parsed)) score += 50
  if (row.file_url) score += 1
  return score
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: evidenceRows, error } = await supabase
      .from('asset_wipe_evidence')
      .select('id, asset_id, type, file_name, file_url, parsed_json, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = (evidenceRows || []) as EvidenceRow[]
    const assetIds = Array.from(new Set(rows.map((r) => r.asset_id)))

    const { data: assets } = assetIds.length
      ? await supabase
          .from('assets')
          .select(
            'id, serial_number, internal_tag, manufacturer, model, asset_type, color, status, sales_price, batch_id, wipe_certificate_id, wipe_software, wipe_result, wipe_notes, wipe_completed_at, specifications'
          )
          .in('id', assetIds)
      : { data: [] }

    const assetsMap = new Map<string, AssetRow>(
      ((assets || []) as AssetRow[]).map((a) => [a.id, a])
    )

    const batchIds = Array.from(
      new Set((assets || []).map((a) => (a as AssetRow).batch_id).filter(Boolean) as string[])
    )
    const { data: batches } = batchIds.length
      ? await supabase
          .from('batches')
          .select('id, internal_batch_id, ticket_id')
          .in('id', batchIds)
      : { data: [] }
    const batchOrdMap = new Map(
      (batches || []).map((b) => [b.id as string, extractOrd(b.internal_batch_id as string)])
    )
    const ticketIds = Array.from(
      new Set((batches || []).map((b) => b.ticket_id).filter(Boolean) as string[])
    )
    const { data: tickets } = ticketIds.length
      ? await supabase
          .from('operations_tickets')
          .select('id, readable_id, title, description, client_id')
          .in('id', ticketIds)
      : { data: [] }
    const clientIds = Array.from(
      new Set((tickets || []).map((t) => t.client_id).filter(Boolean) as string[])
    )
    const { data: clients } = clientIds.length
      ? await supabase
          .from('crm_entities')
          .select('id, legal_name, commercial_name')
          .in('id', clientIds)
      : { data: [] }
    const clientNameById = new Map(
      (clients || []).map((c) => [
        c.id as string,
        String(c.commercial_name || c.legal_name || '').trim() || null,
      ])
    )
    const ticketById = new Map(
      (tickets || []).map((t) => [
        t.id as string,
        {
          ...t,
          customerName: t.client_id ? clientNameById.get(t.client_id as string) || null : null,
        },
      ])
    )
    const batchTicketMap = new Map(
      (batches || [])
        .filter((b) => b.ticket_id)
        .map((b) => [b.id as string, ticketById.get(b.ticket_id as string) || null])
    )

    // Backfill: parsear PDFs sin certificado rico
    for (const row of rows) {
      if (row.type !== 'pdf' || !row.file_url) continue
      const asset = assetsMap.get(row.asset_id)
      const currentParsed = pickCertificate(row.parsed_json, asset?.specifications)
      const alreadyRich = isCertificateRich(currentParsed)
      const hasErrors =
        Array.isArray(currentParsed.errors) && (currentParsed.errors as unknown[]).length > 0
      // Re-parsear si falta certificado rico O si aún no hay lista de errores Failed
      if (alreadyRich && isCertificateRich(asRecord(row.parsed_json)) && hasErrors) continue

      try {
        const response = await fetch(row.file_url, { cache: 'no-store' })
        if (!response.ok) continue
        const buffer = Buffer.from(await response.arrayBuffer())
        const parsed = await parseWipeReportPdfBuffer(buffer)
        if (!isCertificateRich(parsed as unknown as Record<string, unknown>)) continue

        await supabase.from('asset_wipe_evidence').update({ parsed_json: parsed }).eq('id', row.id)
        row.parsed_json = parsed as unknown as Record<string, unknown>

        if (asset) {
          const specs =
            asset.specifications && typeof asset.specifications === 'object'
              ? { ...asset.specifications }
              : {}
          const nextSpecs = {
            ...specs,
            wipe_report: parsed,
            hardware_specs: {
              ...((specs.hardware_specs as Record<string, unknown>) || {}),
              processor: parsed.cpu || null,
              ram_capacity: parsed.ramCapacityGb || null,
              ram_type: parsed.ramType || null,
              disk_capacity: parsed.disks?.[0]?.size || null,
              disk_type: parsed.disks?.[0]?.bus || null,
            },
          }
          const wipeNotes = parsed.comments || asset.wipe_notes
          await supabase
            .from('assets')
            .update({
              specifications: nextSpecs,
              wipe_notes: wipeNotes,
            })
            .eq('id', asset.id)
          asset.specifications = nextSpecs
          asset.wipe_notes = wipeNotes
        }
      } catch (err) {
        console.warn('[evidence-table] backfill parse failed', row.id, err)
      }
    }

    // Una fila por asset: priorizar PDF con certificado parseado
    const byAsset = new Map<string, EvidenceRow>()
    for (const row of rows) {
      const existing = byAsset.get(row.asset_id)
      if (!existing) {
        byAsset.set(row.asset_id, row)
        continue
      }
      const asset = assetsMap.get(row.asset_id)
      if (scoreEvidence(row, asset) > scoreEvidence(existing, asset)) {
        byAsset.set(row.asset_id, row)
      }
    }

    const table = Array.from(byAsset.values()).map((ev) => {
      const asset = assetsMap.get(ev.asset_id)
      const parsed = pickCertificate(ev.parsed_json, asset?.specifications)
      const disks = (parsed.disks as Array<Record<string, unknown>> | undefined) || []
      const disk1 = disks[0] || {}
      const disk2 = disks[1] || {}
      const hw = (asRecord(asset?.specifications?.hardware_specs) || {}) as Record<string, unknown>
      const classifications = readClassifications(asset?.specifications)
      const ordFromBatch = asset?.batch_id ? batchOrdMap.get(asset.batch_id) || null : null
      const ordFromSpecs = extractOrd(
        String(
          (asset?.specifications as Record<string, unknown> | null)?.source_order_number ||
            (asset?.specifications as Record<string, unknown> | null)?.ticket_readable_id ||
            ''
        )
      )
      const ticketMeta = asset?.batch_id ? batchTicketMap.get(asset.batch_id) : null
      const ordFromTicket = extractOrd(
        String(ticketMeta?.readable_id || ticketMeta?.title || ticketMeta?.description || '')
      )
      const ordCode = ordFromBatch || ordFromTicket || ordFromSpecs || null

      const customerName =
        (parsed.customerName as string) ||
        (ticketMeta?.customerName as string | null) ||
        null

      const hddCountRaw = parsed.hddCount
      const hddCount =
        typeof hddCountRaw === 'number'
          ? hddCountRaw
          : disks.length > 0
            ? disks.length
            : null

      const comments =
        buildCommentsFromCertificate(parsed) ||
        asset?.wipe_notes ||
        null

      const ramCapacityGb =
        (parsed.ramCapacityGb as string) || (hw.ram_capacity as string) || null
      const hdd1Serial = (disk1.serial as string) || null
      const wipePass = String(disk1.wipeStatus || asset?.wipe_result || '')
        .toLowerCase()
        .includes('pass')
      // Si hay wipe Pass y no hay sanitización, sugerir D1 (clear)
      const dataSanitization =
        classifications.dataSanitization || (wipePass ? 'D1' : null)
      const memory =
        classifications.memory ||
        (ramCapacityGb ? 'Yes' : parsed.ramCapacityGb === null ? 'No' : null)

      return {
        assetId: ev.asset_id,
        evidenceId: ev.id,
        evidenceUrl: ev.file_url,
        evidenceType: ev.type,
        ordCode,
        classificationRec: classifications.rec,
        classificationC: classifications.c,
        classificationF: classifications.f,
        cosmeticConditions: classifications.c,
        functionalConditions: classifications.f,
        r2Applicability: classifications.r2Applicability,
        dataSanitization,
        memory,
        serialNumberOfHdd: hdd1Serial,
        prefix:
          (parsed.prefix as string) ||
          (asset?.asset_type?.toUpperCase().includes('LAP') ? 'LAP' : null) ||
          (asset?.asset_type?.toUpperCase().startsWith('LAP') ? 'LAP' : null),
        device: mapDeviceLabel(
          (parsed.prefix as string) ||
            (asset?.asset_type?.toUpperCase().includes('LAP') ? 'LAP' : null),
          asset?.asset_type || null
        ),
        make: (parsed.make as string) || asset?.manufacturer || null,
        model: (parsed.model as string) || asset?.model || null,
        serialNumber: (parsed.serialNumber as string) || asset?.serial_number || null,
        customerAssetTag: (parsed.customerAssetTag as string) || asset?.internal_tag || null,
        mainBoardPart: (parsed.mainBoardPart as string) || null,
        ramCapacityGb,
        ramType: (parsed.ramType as string) || (hw.ram_type as string) || null,
        cpu: (parsed.cpu as string) || (hw.processor as string) || null,
        hddCount,
        ssd: (parsed.ssd as string) || (hw.disk_type ? 'Yes' : null),
        screenSize: (parsed.screenSize as string) || null,
        weightLbs: (parsed.weightLbs as string) || null,
        powerOnOverHeat: (parsed.powerOnOverHeat as string) || null,
        battery: (parsed.battery as string) || null,
        charger: (parsed.charger as string) || null,
        screen: (parsed.screen as string) || null,
        keyboard: (parsed.keyboard as string) || null,
        testDate: (parsed.testDate as string) || asset?.wipe_completed_at || null,
        technicianName: (parsed.technicianName as string) || null,
        comments,
        processedTime: (parsed.processedTime as string) || asset?.wipe_completed_at || null,
        hdd1Serial,
        hdd1Size: (disk1.size as string) || (hw.disk_capacity as string) || null,
        hdd1Wipe: (disk1.wipeStatus as string) || asset?.wipe_result || null,
        hdd1Destruction: (disk1.destruction as string) || null,
        hdd2Serial: (disk2.serial as string) || null,
        hdd2Size: (disk2.size as string) || null,
        hdd2Wipe: (disk2.wipeStatus as string) || null,
        hdd2Destruction: (disk2.destruction as string) || null,
        wipeCertificateId: asset?.wipe_certificate_id || (parsed.reportUuid as string) || null,
        wipeSoftware: (parsed.software as string) || asset?.wipe_software || null,
        status: asset?.status || null,
        finalStatus: mapFinalStatus(asset?.status),
        remarketPrice: asset?.sales_price ?? null,
        serviceFee: null,
        additionalNotes: asset?.wipe_notes || null,
        fromCertificate: isCertificateRich(parsed),
        customerName,
        evidenceCreatedAt: ev.created_at,
      }
    })

    // Resumen por ORD para la vista de órdenes
    type OrdSummary = {
      ordCode: string
      customerName: string | null
      dateFrom: string | null
      dateTo: string | null
      assetCount: number
      wipedCount: number
      withPdfCount: number
    }
    const byOrd = new Map<string, OrdSummary>()
    for (const row of table) {
      const key = row.ordCode || 'SIN-ORD'
      const existing = byOrd.get(key)
      const dateCandidate = row.testDate || row.processedTime || row.evidenceCreatedAt || null
      if (!existing) {
        byOrd.set(key, {
          ordCode: key,
          customerName: row.customerName,
          dateFrom: dateCandidate,
          dateTo: dateCandidate,
          assetCount: 1,
          wipedCount: /pass|erased|success/i.test(String(row.hdd1Wipe || '')) ? 1 : 0,
          withPdfCount: row.evidenceUrl ? 1 : 0,
        })
      } else {
        existing.assetCount += 1
        if (/pass|erased|success/i.test(String(row.hdd1Wipe || ''))) existing.wipedCount += 1
        if (row.evidenceUrl) existing.withPdfCount += 1
        if (row.customerName && !existing.customerName) existing.customerName = row.customerName
        if (dateCandidate) {
          if (!existing.dateFrom || dateCandidate < existing.dateFrom) existing.dateFrom = dateCandidate
          if (!existing.dateTo || dateCandidate > existing.dateTo) existing.dateTo = dateCandidate
        }
      }
    }

    const orders = Array.from(byOrd.values()).sort((a, b) => {
      if (a.ordCode === 'SIN-ORD') return 1
      if (b.ordCode === 'SIN-ORD') return -1
      return b.ordCode.localeCompare(a.ordCode, 'es', { numeric: true })
    })

    return NextResponse.json(
      { rows: table, orders },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  } catch (err) {
    console.error('[evidence-table]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al armar tabla' },
      { status: 500 }
    )
  }
}
