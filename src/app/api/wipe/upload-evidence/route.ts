import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

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

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Error uploading wipe evidence:', uploadError)
      const msg = uploadError.message || ''
      const isBucketMissing = /bucket/i.test(msg) || /No such bucket/i.test(msg)
      const help = isBucketMissing
        ? 'Bucket "wipe-evidence" no existe. Crea el bucket en Supabase Storage (Dashboard > Storage > New bucket, nombre: wipe-evidence, público) o ejecuta node scripts/setup-wipe-evidence-bucket.js.'
        : null
      return NextResponse.json(
        { error: `Error al subir archivo: ${msg}${help ? ` | ${help}` : ''}` },
        { status: 500 }
      )
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    if (!urlData?.publicUrl) {
      return NextResponse.json(
        { error: 'No se pudo generar la URL pública del archivo' },
        { status: 500 }
      )
    }

    // Usar SQL directo para evitar problemas con schema cache
    const { data: insertedRecord, error: insertError } = await supabase.rpc('insert_wipe_evidence', {
      p_asset_id: assetId,
      p_type: normalizedType,
      p_file_name: file.name,
      p_file_url: urlData.publicUrl,
      p_content_type: file.type || null,
      p_file_size: file.size,
      p_uploaded_by: user?.id || null
    })

    if (insertError) {
      console.error('Error saving wipe evidence metadata:', insertError)
      return NextResponse.json(
        { error: `Error guardando metadatos: ${insertError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      error: null,
      data: insertedRecord
    })
  } catch (error: any) {
    console.error('Error en /api/wipe/upload-evidence:', error)
    return NextResponse.json(
      { error: error.message || 'Error desconocido' },
      { status: 500 }
    )
  }
}
