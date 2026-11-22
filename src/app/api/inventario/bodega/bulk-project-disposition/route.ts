import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { setSession } from '@/lib/supabase/session'
import {
  assetMatchesProjectRef,
  getProjectDispositionPlan,
  isAssetPendingProjectDisposition,
  normalizeProjectRef,
  type ProjectDispositionKey,
} from '@/lib/inventario/projectDisposition'

const SOURCE_WAREHOUSE = 'BOD-REC'
const CHUNK_SIZE = 80

type AssetRow = {
  id: string
  status: string
  serial_number: string | null
  specifications: Record<string, unknown> | null
  current_warehouse_id: string | null
  batch_id: string | null
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      projectRef?: string
      disposition?: ProjectDispositionKey
      sourceWarehouseCode?: string
      onlyRemaining?: boolean
      notes?: string | null
    }

    const projectRef = normalizeProjectRef(body.projectRef || '')
    const dispositionKey = body.disposition
    const sourceCode = (body.sourceWarehouseCode || SOURCE_WAREHOUSE).trim().toUpperCase()
    const onlyRemaining = body.onlyRemaining !== false
    const notes = (body.notes || '').trim() || null

    if (!projectRef) {
      return NextResponse.json({ error: 'Indique el proyecto (ej. ORD26580)' }, { status: 400 })
    }
    if (!dispositionKey) {
      return NextResponse.json({ error: 'Seleccione disposición: resale, recycle, spare o harvesting' }, { status: 400 })
    }

    let plan
    try {
      plan = getProjectDispositionPlan(dispositionKey)
    } catch {
      return NextResponse.json({ error: 'Disposición inválida' }, { status: 400 })
    }

    const supabase = await createClient()
    await setSession(supabase)

    const { data: sourceWh, error: sourceWhErr } = await supabase
      .from('warehouses')
      .select('id, name')
      .eq('code', sourceCode)
      .maybeSingle()

    if (sourceWhErr || !sourceWh?.id) {
      return NextResponse.json({ error: `Bodega ${sourceCode} no encontrada` }, { status: 404 })
    }

    const { data: destWh, error: destWhErr } = await supabase
      .from('warehouses')
      .select('id, name')
      .eq('code', plan.warehouseCode)
      .maybeSingle()

    if (destWhErr || !destWh?.id) {
      return NextResponse.json({ error: `Bodega destino ${plan.warehouseCode} no encontrada` }, { status: 404 })
    }

    const { data: rawAssets, error: assetsErr } = await supabase
      .from('assets')
      .select('id, status, serial_number, specifications, current_warehouse_id, batch_id')
      .eq('current_warehouse_id', sourceWh.id)
      .not('status', 'in', '("sold","destroyed","scrapped")')

    if (assetsErr) {
      return NextResponse.json({ error: assetsErr.message }, { status: 500 })
    }

    const assets = (rawAssets || []) as AssetRow[]
    if (assets.length === 0) {
      return NextResponse.json({ error: `No hay equipos en ${sourceCode}` }, { status: 400 })
    }

    const batchIds = Array.from(new Set(assets.map((a) => a.batch_id).filter(Boolean))) as string[]
    let batchesMap: Record<string, { code: string | null; order_code: string | null }> = {}

    if (batchIds.length > 0) {
      const { data: batches } = await supabase
        .from('batches')
        .select('id, internal_batch_id, ticket_id')
        .in('id', batchIds)

      const ticketIds = (batches || []).map((b) => b.ticket_id).filter(Boolean) as string[]
      const ticketsMap: Record<string, string | null> = {}

      if (ticketIds.length > 0) {
        const { data: tickets } = await supabase
          .from('operations_tickets')
          .select('id, readable_id, description, title')
          .in('id', ticketIds)

        for (const t of tickets || []) {
          const desc = `${t.description || ''} ${t.title || ''}`
          const ordMatch = desc.match(/\bORD\d+\b/i)
          ticketsMap[t.id] = ordMatch?.[0]?.toUpperCase() || null
        }
      }

      for (const b of batches || []) {
        const ticketOrd = b.ticket_id ? ticketsMap[b.ticket_id] : null
        batchesMap[b.id] = {
          code: b.internal_batch_id,
          order_code: ticketOrd,
        }
      }
    }

    const targets = assets.filter((asset) => {
      const batchMeta = asset.batch_id ? batchesMap[asset.batch_id] : null
      const enriched = {
        specifications: asset.specifications,
        order_code: batchMeta?.order_code ?? null,
        batch_code: batchMeta?.code ?? null,
      }
      if (!assetMatchesProjectRef(enriched, projectRef)) return false
      if (!isAssetPendingProjectDisposition(asset, onlyRemaining)) return false
      return true
    })

    if (targets.length === 0) {
      return NextResponse.json({
        error: onlyRemaining
          ? `No hay equipos pendientes del proyecto ${projectRef} en ${sourceCode}`
          : `No hay equipos del proyecto ${projectRef} en ${sourceCode}`,
      }, { status: 400 })
    }

    const now = new Date().toISOString()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    let updated = 0
    const failures: string[] = []

    for (let i = 0; i < targets.length; i += CHUNK_SIZE) {
      const chunk = targets.slice(i, i + CHUNK_SIZE)
      for (const asset of chunk) {
        const specs = (asset.specifications || {}) as Record<string, unknown>
        const workshop = (specs.workshop_classifications || {}) as Record<string, unknown>
        const nextSpecs = {
          ...specs,
          itad_disposition: plan.label,
          project_disposition_applied_at: now,
          workshop_classifications: {
            ...workshop,
            itad_disposition: plan.label,
          },
        }

        const patch: Record<string, unknown> = {
          specifications: nextSpecs,
          current_warehouse_id: destWh.id,
          last_transfer_date: now,
          updated_at: now,
        }
        if (plan.status) {
          patch.status = plan.status
        }

        const { error: upErr } = await supabase.from('assets').update(patch).eq('id', asset.id)
        if (upErr) {
          failures.push(`${asset.serial_number || asset.id}: ${upErr.message}`)
          continue
        }
        updated += 1

        await supabase.from('inventory_movements').insert({
          asset_id: asset.id,
          from_warehouse_id: sourceWh.id,
          to_warehouse_id: destWh.id,
          movement_type: 'transfer',
          transfer_date: now,
          notes:
            notes ||
            `Diagnóstico masivo ${projectRef} → ${plan.label} (${destWh.name})`,
          created_by: user?.id || null,
        })
      }
    }

    try {
      const { AuditService } = await import('@/lib/services/audit-service')
      await AuditService.registrar(
        {
          action: 'BULK_DISPOSITION',
          module: 'WAREHOUSE',
          description: `Diagnóstico masivo proyecto ${projectRef}: ${updated} equipo(s) → ${plan.label}`,
          entityType: 'PROJECT',
          entityId: targets[0]?.id || projectRef,
          entityReference: projectRef,
          additionalData: {
            disposition: plan.label,
            warehouse: plan.warehouseCode,
            only_remaining: onlyRemaining,
            asset_count: updated,
            failures: failures.slice(0, 20),
          },
        },
        request
      )
    } catch (auditError) {
      console.error('[bulk-project-disposition] audit', auditError)
    }

    return NextResponse.json({
      success: true,
      projectRef,
      disposition: plan.label,
      destinationWarehouse: plan.warehouseCode,
      updated,
      skippedFailures: failures.length,
      failures: failures.slice(0, 15),
      message: `${updated} equipo(s) de ${projectRef} clasificados como ${plan.label} y enviados a ${destWh.name}.`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}