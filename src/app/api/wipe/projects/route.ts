import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function normalizeOrd(value: string | null | undefined): string {
  if (!value) return ''
  return String(value).replace(/\s+/g, '').replace(/ORD-/i, 'ORD').toUpperCase()
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: batches, error: batchError } = await supabase
      .from('batches')
      .select('id, internal_batch_id, ticket_id, reception_date')
      .ilike('internal_batch_id', 'ORD%')
      .order('reception_date', { ascending: false, nullsFirst: false })

    if (batchError) {
      return NextResponse.json({ error: batchError.message }, { status: 500 })
    }

    const ordBatches = (batches || []).filter((b) => normalizeOrd(b.internal_batch_id).startsWith('ORD'))
    const batchIds = ordBatches.map((b) => b.id as string)

    if (!batchIds.length) {
      return NextResponse.json({ projects: [] })
    }

    const { data: assets } = await supabase
      .from('assets')
      .select('id, batch_id, status')
      .in('batch_id', batchIds)

    const assetIds = (assets || []).map((a) => a.id as string)
    const pdfAssetIds = new Set<string>()

    if (assetIds.length) {
      const { data: evidence } = await supabase
        .from('asset_wipe_evidence')
        .select('asset_id')
        .in('asset_id', assetIds)
        .eq('type', 'pdf')
      for (const row of evidence || []) {
        if (row.asset_id) pdfAssetIds.add(row.asset_id as string)
      }
    }

    const ticketIds = Array.from(
      new Set(ordBatches.map((b) => b.ticket_id).filter(Boolean) as string[])
    )
    const customerByTicket = new Map<string, string>()

    if (ticketIds.length) {
      const { data: tickets } = await supabase
        .from('operations_tickets')
        .select('id, client_id, xsi_order_number')
        .in('id', ticketIds)
      const clientIds = Array.from(
        new Set((tickets || []).map((t) => t.client_id).filter(Boolean) as string[])
      )
      const clientNameById = new Map<string, string>()
      if (clientIds.length) {
        const { data: clients } = await supabase
          .from('crm_entities')
          .select('id, commercial_name, legal_name')
          .in('id', clientIds)
        for (const c of clients || []) {
          clientNameById.set(
            c.id as string,
            String(c.commercial_name || c.legal_name || '').trim()
          )
        }
      }
      for (const t of tickets || []) {
        const name = t.client_id ? clientNameById.get(t.client_id as string) || null : null
        if (name) customerByTicket.set(t.id as string, name)
      }
    }

    const activeStatuses = new Set(['received', 'wiping', 'ready_for_sale', 'diagnosing', 'in_stock'])

    const projects = ordBatches
      .map((b) => {
        const batchAssets = (assets || []).filter(
          (a) => a.batch_id === b.id && activeStatuses.has(String(a.status || ''))
        )
        const withPdf = batchAssets.filter((a) => pdfAssetIds.has(a.id as string)).length
        return {
          ordCode: normalizeOrd(b.internal_batch_id as string),
          batchId: b.id as string,
          assetCount: batchAssets.length,
          withPdfCount: withPdf,
          pendingPdfCount: Math.max(0, batchAssets.length - withPdf),
          receptionDate: b.reception_date as string | null,
          customerName: b.ticket_id ? customerByTicket.get(b.ticket_id as string) || null : null,
        }
      })
      .filter((p) => p.assetCount > 0)
      .sort((a, b) => b.ordCode.localeCompare(a.ordCode, 'es', { numeric: true }))

    return NextResponse.json({ projects })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al listar proyectos' },
      { status: 500 }
    )
  }
}