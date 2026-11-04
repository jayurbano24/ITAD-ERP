import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { supabaseConfig } from '@/lib/supabase/config'
import {
  parseWipeCertificateSummary,
  type WipeCertificateSummary,
  type WipeReportOrder,
} from '@/lib/wipe/parseWipeReportPdf'
import { moveAssetToValorizacion } from '@/lib/wipe/moveToValorizacion'
import { revalidatePath } from 'next/cache'

const MAX_FILES = 50
const MAX_FILE_BYTES = 10 * 1024 * 1024

function getStorageClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (serviceRoleKey) {
    return createSupabaseClient(supabaseConfig.url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return null
}

export type BatchCertificateResult = {
  fileName: string
  ok: boolean
  error?: string
  summary?: WipeCertificateSummary
  assetId?: string | null
  assetSerial?: string | null
  evidenceSaved?: boolean
  movedToVal?: boolean
  status:
    | 'evidencia_ok'
    | 'parseado_sin_activo'
    | 'parseado_sin_serie'
    | 'borrado_fallido'
    | 'error'
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    await supabase.auth.refreshSession()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData
      .getAll('files')
      .filter((f): f is File => typeof File !== 'undefined' && f instanceof File)

    // Compat: algunos clientes mandan "file" repetido
    if (files.length === 0) {
      const single = formData.getAll('file').filter((f): f is File => f instanceof File)
      files.push(...single)
    }

    if (files.length === 0) {
      return NextResponse.json({ error: 'Sube al menos un PDF' }, { status: 400 })
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Máximo ${MAX_FILES} certificados por lote` },
        { status: 400 }
      )
    }

    const adminClient = getStorageClient()
    const storageClient = adminClient || supabase
    const results: BatchCertificateResult[] = []
    let anyMoved = false

    for (const file of files) {
      const fileName = file.name || 'certificado.pdf'
      try {
        const isPdf =
          file.type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')
        if (!isPdf) {
          results.push({
            fileName,
            ok: false,
            error: 'No es PDF',
            status: 'error',
          })
          continue
        }
        if (file.size > MAX_FILE_BYTES) {
          results.push({
            fileName,
            ok: false,
            error: 'PDF > 10 MB',
            status: 'error',
          })
          continue
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        const { report, summary } = await parseWipeCertificateSummary(buffer)

        if (!summary.serie) {
          results.push({
            fileName,
            ok: true,
            summary,
            assetId: null,
            evidenceSaved: false,
            movedToVal: false,
            status: 'parseado_sin_serie',
            error: 'Sin serie de equipo en el PDF',
          })
          continue
        }

        const serieNorm = summary.serie.trim().toUpperCase()
        const { data: candidates } = await supabase
          .from('assets')
          .select('id, serial_number, manufacturer, model, status, specifications')
          .ilike('serial_number', serieNorm)
          .limit(10)

        const asset =
          (candidates || []).find(
            (a) => String(a.serial_number || '').trim().toUpperCase() === serieNorm
          ) || null

        if (!asset) {
          results.push({
            fileName,
            ok: true,
            summary,
            assetId: null,
            assetSerial: summary.serie,
            evidenceSaved: false,
            movedToVal: false,
            status: 'parseado_sin_activo',
            error: 'Serie no encontrada en inventario',
          })
          continue
        }

        if (asset.status === 'sold' || asset.status === 'destroyed' || asset.status === 'scrapped') {
          results.push({
            fileName,
            ok: false,
            summary,
            assetId: asset.id,
            assetSerial: asset.serial_number,
            evidenceSaved: false,
            movedToVal: false,
            status: 'error',
            error: `Activo en estado ${asset.status} (fuera de proceso)`,
          })
          continue
        }

        // Subir PDF a Storage + metadata evidencia
        const timestamp = Date.now()
        const token = Math.random().toString(36).slice(2, 8)
        const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
        const filePath = `${asset.id}/pdf/${timestamp}-${token}-${safeName}`

        const { error: uploadError } = await storageClient.storage
          .from('wipe-evidence')
          .upload(filePath, buffer, {
            contentType: file.type || 'application/pdf',
            upsert: false,
          })

        if (uploadError) {
          results.push({
            fileName,
            ok: false,
            summary,
            assetId: asset.id,
            assetSerial: asset.serial_number,
            evidenceSaved: false,
            movedToVal: false,
            status: 'error',
            error: `Storage: ${uploadError.message}`,
          })
          continue
        }

        const { data: urlData } = storageClient.storage.from('wipe-evidence').getPublicUrl(filePath)
        const publicUrl = urlData?.publicUrl || null

        const parsedJson = report as unknown as Record<string, unknown>
        let evidenceSaved = false

        const { data: rpcRows, error: rpcError } = await storageClient.rpc('insert_wipe_evidence', {
          p_asset_id: asset.id,
          p_type: 'pdf',
          p_file_name: fileName,
          p_file_url: publicUrl,
          p_content_type: file.type || 'application/pdf',
          p_file_size: file.size,
          p_uploaded_by: user.id,
        })

        let evidenceId: string | null = null
        if (!rpcError) {
          const row = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows
          evidenceId = row?.id || null
          evidenceSaved = true
        } else {
          const { data: fallbackRow, error: fallbackError } = await storageClient
            .from('asset_wipe_evidence')
            .insert({
              asset_id: asset.id,
              type: 'pdf',
              file_name: fileName,
              file_url: publicUrl,
              content_type: file.type || 'application/pdf',
              file_size: file.size,
              uploaded_by: user.id,
              parsed_json: parsedJson,
            })
            .select('id')
            .single()

          if (fallbackError) {
            results.push({
              fileName,
              ok: false,
              summary,
              assetId: asset.id,
              assetSerial: asset.serial_number,
              evidenceSaved: false,
              movedToVal: false,
              status: 'error',
              error: `Metadata: ${fallbackError.message}`,
            })
            continue
          }
          evidenceId = fallbackRow.id
          evidenceSaved = true
        }

        if (evidenceId && !rpcError) {
          await storageClient
            .from('asset_wipe_evidence')
            .update({ parsed_json: parsedJson })
            .eq('id', evidenceId)
        }

        // Enriquecer specs del activo
        const specs =
          asset.specifications && typeof asset.specifications === 'object'
            ? { ...(asset.specifications as Record<string, unknown>) }
            : {}
        await storageClient
          .from('assets')
          .update({
            specifications: {
              ...specs,
              wipe_report: parsedJson,
              hardware_specs: {
                ...((specs.hardware_specs as Record<string, unknown>) || {}),
                processor: (report as WipeReportOrder).cpu || null,
                ram_capacity: (report as WipeReportOrder).ramCapacityGb || null,
                ram_type: (report as WipeReportOrder).ramType || null,
                disk_capacity: report.disks?.[0]?.size || null,
                disk_type: report.disks?.[0]?.bus || null,
              },
            },
            manufacturer: asset.manufacturer || summary.marca,
            model: asset.model || summary.modelo,
            updated_at: new Date().toISOString(),
          })
          .eq('id', asset.id)

        const wipedOk = summary.borrado === true
        let movedToVal = false

        if (wipedOk) {
          const moved = await moveAssetToValorizacion(storageClient, asset.id, {
            wipeSoftware: summary.software,
            wipeResult: 'success',
            wipeNotes: report.comments,
            wipeCertificateId: summary.certificadoId,
            performedBy: user.id,
          })
          movedToVal = moved.ok
          if (moved.ok) anyMoved = true
        }

        results.push({
          fileName,
          ok: true,
          summary,
          assetId: asset.id,
          assetSerial: asset.serial_number,
          evidenceSaved,
          movedToVal,
          status: wipedOk ? (movedToVal || evidenceSaved ? 'evidencia_ok' : 'evidencia_ok') : 'borrado_fallido',
          error: wipedOk
            ? undefined
            : 'Certificado indica borrado no exitoso; evidencia guardada sin mover a BOD-VAL',
        })
      } catch (err) {
        results.push({
          fileName,
          ok: false,
          status: 'error',
          error: err instanceof Error ? err.message : 'Error al procesar',
        })
      }
    }

    if (anyMoved) {
      revalidatePath('/dashboard/inventario/bodega')
      revalidatePath('/dashboard/borrado')
      revalidatePath('/dashboard/borrado/evidencias')
    }

    const totals = {
      total: results.length,
      ok: results.filter((r) => r.status === 'evidencia_ok').length,
      sinActivo: results.filter((r) => r.status === 'parseado_sin_activo').length,
      sinSerie: results.filter((r) => r.status === 'parseado_sin_serie').length,
      fallidos: results.filter((r) => r.status === 'borrado_fallido' || r.status === 'error').length,
    }

    return NextResponse.json({ success: true, results, totals })
  } catch (error: unknown) {
    console.error('[batch-certificates]', error)
    const message = error instanceof Error ? error.message : 'Error en lote'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
