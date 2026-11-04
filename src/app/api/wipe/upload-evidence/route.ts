import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { supabaseConfig } from '@/lib/supabase/config'
import { parseWipeReportPdfBuffer } from '@/lib/wipe/parseWipeReportPdf'
import { moveAssetToValorizacion } from '@/lib/wipe/moveToValorizacion'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

function getStorageClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (serviceRoleKey) {
    return createSupabaseClient(supabaseConfig.url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return null
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Refrescar sesión antes de Storage (evita "exp claim timestamp check failed")
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
    if (refreshError) {
      console.warn('[upload-evidence] refreshSession:', refreshError.message)
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        {
          error:
            'Sesión expirada o no autenticado. Cierra sesión, vuelve a iniciar e intenta de nuevo.',
        },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const assetId = formData.get('assetId') as string
    const type = formData.get('type') as string

    if (!file || !assetId || !type) {
      return NextResponse.json(
        { error: 'Faltan parámetros: file, assetId, type' },
        { status: 400 }
      )
    }

    const normalizedType = type.toLowerCase()
    if (!['photo', 'xml', 'pdf'].includes(normalizedType)) {
      return NextResponse.json(
        { error: 'Tipo de evidencia no permitido' },
        { status: 400 }
      )
    }

    if (normalizedType === 'photo' && !file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Sube una imagen válida para el respaldo fotográfico' },
        { status: 400 }
      )
    }

    const maxPhotoSize = 6 * 1024 * 1024
    const maxXmlSize = 2 * 1024 * 1024
    const maxPdfSize = 10 * 1024 * 1024

    if (normalizedType === 'photo' && file.size > maxPhotoSize) {
      return NextResponse.json(
        { error: 'Cada foto no debe exceder 6 MB' },
        { status: 400 }
      )
    }
    if (normalizedType === 'xml' && file.size > maxXmlSize) {
      return NextResponse.json(
        { error: 'El XML no debe exceder 2 MB' },
        { status: 400 }
      )
    }
    if (normalizedType === 'pdf' && file.size > maxPdfSize) {
      return NextResponse.json(
        { error: 'El PDF no debe exceder 10 MB' },
        { status: 400 }
      )
    }

    const bucket = 'wipe-evidence'
    const timestamp = Date.now()
    const randomToken = Math.random().toString(36).slice(2, 8)
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `${assetId}/${normalizedType}/${timestamp}-${randomToken}-${safeName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Preferir service role para Storage (no depende del JWT de usuario)
    const adminClient = getStorageClient()
    const storageClient = adminClient || supabase
    const usingServiceRole = Boolean(adminClient)

    const { error: uploadError } = await storageClient.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (uploadError) {
      console.error('Error uploading wipe evidence:', uploadError)
      const msg = uploadError.message || ''
      const isBucketMissing = /bucket/i.test(msg) || /No such bucket/i.test(msg)
      const isExpiredJwt = /exp["']?\s*claim|jwt expired|token is expired/i.test(msg)

      if (isExpiredJwt) {
        return NextResponse.json(
          {
            error:
              'Sesión expirada al subir el archivo. Cierra sesión, inicia de nuevo y vuelve a certificar. (Opcional: configura SUPABASE_SERVICE_ROLE_KEY en .env.local para evitar este fallo.)',
          },
          { status: 401 }
        )
      }

      const help = isBucketMissing
        ? ' Bucket "wipe-evidence" no existe. Créalo en Supabase Storage.'
        : !usingServiceRole
          ? ' Tip: configura SUPABASE_SERVICE_ROLE_KEY en .env.local para subidas más estables.'
          : ''

      return NextResponse.json(
        { error: `Error al subir archivo: ${msg}${help}` },
        { status: 500 }
      )
    }

    const { data: urlData } = storageClient.storage.from(bucket).getPublicUrl(filePath)

    if (!urlData?.publicUrl) {
      return NextResponse.json(
        { error: 'No se pudo generar la URL pública del archivo' },
        { status: 500 }
      )
    }

    let parsedJson: Record<string, unknown> | null = null
    if (normalizedType === 'pdf') {
      try {
        parsedJson = (await parseWipeReportPdfBuffer(buffer)) as unknown as Record<string, unknown>
      } catch (parseErr) {
        console.warn('[upload-evidence] PDF parse failed:', parseErr)
      }
    }

    const metaClient = storageClient
    const { data: insertedRecord, error: insertError } = await metaClient.rpc('insert_wipe_evidence', {
      p_asset_id: assetId,
      p_type: normalizedType,
      p_file_name: file.name,
      p_file_url: urlData.publicUrl,
      p_content_type: file.type || null,
      p_file_size: file.size,
      p_uploaded_by: user.id,
    })

    let evidenceRow = Array.isArray(insertedRecord) ? insertedRecord[0] : insertedRecord

    if (insertError) {
      console.error('Error saving wipe evidence metadata:', insertError)

      const { data: fallbackRow, error: fallbackError } = await metaClient
        .from('asset_wipe_evidence')
        .insert({
          asset_id: assetId,
          type: normalizedType,
          file_name: file.name,
          file_url: urlData.publicUrl,
          content_type: file.type || null,
          file_size: file.size,
          uploaded_by: user.id,
          parsed_json: parsedJson,
        })
        .select('*')
        .single()

      if (fallbackError) {
        return NextResponse.json(
          { error: `Error guardando metadatos: ${insertError.message}` },
          { status: 500 }
        )
      }
      evidenceRow = fallbackRow
    } else if (evidenceRow?.id && parsedJson) {
      await metaClient
        .from('asset_wipe_evidence')
        .update({ parsed_json: parsedJson })
        .eq('id', evidenceRow.id)
      evidenceRow = { ...evidenceRow, parsed_json: parsedJson }
    }

    if (parsedJson) {
      const { data: assetRow } = await metaClient
        .from('assets')
        .select('specifications')
        .eq('id', assetId)
        .maybeSingle()

      const specs =
        assetRow?.specifications && typeof assetRow.specifications === 'object'
          ? { ...(assetRow.specifications as Record<string, unknown>) }
          : {}

      await metaClient
        .from('assets')
        .update({
          specifications: {
            ...specs,
            wipe_report: parsedJson,
            hardware_specs: {
              ...((specs.hardware_specs as Record<string, unknown>) || {}),
              processor: parsedJson.cpu || null,
              ram_capacity: parsedJson.ramCapacityGb || null,
              ram_type: parsedJson.ramType || null,
              disk_capacity: (parsedJson.disks as { size?: string }[] | undefined)?.[0]?.size || null,
              disk_type: (parsedJson.disks as { bus?: string }[] | undefined)?.[0]?.bus || null,
            },
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', assetId)
    }

    // Si hay evidencia (PDF o foto), el activo debe pasar a Bodega Valorización
    const wipePass =
      normalizedType === 'pdf' &&
      parsedJson &&
      Array.isArray((parsedJson as { disks?: { wipeStatus?: string }[] }).disks) &&
      (parsedJson as { disks?: { wipeStatus?: string }[] }).disks?.some((d) =>
        /pass|success|erased/i.test(String(d?.wipeStatus || ''))
      )

    const shouldMoveToVal =
      normalizedType === 'pdf' || Boolean(wipePass) || normalizedType === 'photo'

    let movedToVal: string | null = null
    if (shouldMoveToVal) {
      const software =
        (parsedJson?.software as string | undefined) ||
        (typeof parsedJson?.comments === 'string' && /blancco|wipedrive/i.test(parsedJson.comments)
          ? String(parsedJson.comments)
          : null)

      const moved = await moveAssetToValorizacion(metaClient, assetId, {
        wipeSoftware: software,
        wipeResult: wipePass || normalizedType === 'pdf' ? 'success' : 'success',
        wipeNotes:
          typeof parsedJson?.comments === 'string' ? parsedJson.comments : null,
        wipeCertificateId:
          typeof parsedJson?.reportUuid === 'string' ? parsedJson.reportUuid : null,
        performedBy: user.id,
      })
      if (moved.ok) {
        movedToVal = 'BOD-VAL'
        revalidatePath('/dashboard/inventario/bodega')
        revalidatePath('/dashboard/borrado')
        revalidatePath('/dashboard/borrado/evidencias')
      } else {
        console.warn('[upload-evidence] move to BOD-VAL failed:', moved.error)
      }
    }

    return NextResponse.json({
      success: true,
      error: null,
      data: evidenceRow,
      parsed: parsedJson,
      movedToVal,
      refreshed: Boolean(refreshed?.session),
    })
  } catch (error: unknown) {
    console.error('Error en /api/wipe/upload-evidence:', error)
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
