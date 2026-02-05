import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { setSession } from '@/lib/supabase/session'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        await setSession(supabase)
        const formData = await request.formData()

        const assetIdsJson = formData.get('assetIds') as string
        const assetIds = JSON.parse(assetIdsJson)
        const totalWeight = formData.get('totalWeight') as string
        const photos = formData.getAll('photos') as File[]

        if (!assetIds || assetIds.length === 0) {
            return NextResponse.json({ error: 'No se seleccionaron equipos' }, { status: 400 })
        }

        // 1. Subir fotos a Storage
        // Asumimos bucket 'evidence' existe. Si no, esto fallará y el frontend mostrará error.
        // Creamos una carpeta por batch de destrucción usando timestamp
        const batchId = Date.now().toString()
        const uploadPromises = photos.map(async (photo) => {
            const path = `destruction/${batchId}/${photo.name}`
            const { data, error } = await supabase.storage
                .from('evidence')
                .upload(path, photo)

            if (error) {
                console.error('Error subiendo foto:', error)
                return null
            }
            // Obtener URL pública
            const { data: { publicUrl } } = supabase.storage.from('evidence').getPublicUrl(path)
            return publicUrl
        })

        const uploadedUrls = (await Promise.all(uploadPromises)).filter(url => url !== null)

        // 2. Actualizar estado de los activos a 'destroyed'
        // Guardamos las URLs de evidencia en los metadatos de CADA asset para referencia futura
        // Esto no es lo más óptimo para base de datos normalizada, pero es práctico para este MVP.
        // Una mejor opción sería una tabla 'asset_evidence', pero requeriría migration.
        // Usaremos el campo 'specifications' o 'metadata' si existe. 'specifications' es JSONB.

        // Primero obtenemos los assets para preservar su metadata actual
        const { data: currentAssets } = await supabase
            .from('assets')
            .select('id, specifications')
            .in('id', assetIds)

        if (currentAssets) {
            const updates = currentAssets.map(asset => {
                const specs = asset.specifications as any || {}

                return {
                    id: asset.id,
                    status: 'destroyed', // Nuevo estado
                    specifications: {
                        ...specs,
                        destruction_evidence: uploadedUrls,
                        destroyed_at: new Date().toISOString(),
                        destruction_batch_weight: parseFloat(totalWeight || '0')
                    }
                }
            })

            // Upsert para actualizar (o update en loop si upsert es complejo por otras columnas)
            // Hacemos update uno por uno o usamos una función RPC si son muchos.
            // Por simplicidad y seguridad:
            for (const update of updates) {
                await supabase
                    .from('assets')
                    .update({
                        status: update.status,
                        specifications: update.specifications
                    })
                    .eq('id', update.id)
            }
        }

        // 3. Registrar en Auditoría (Opcional, el trigger lo hará por el cambio de status)
        // El trigger registrará status: X -> destroyed.

        return NextResponse.json({ success: true, evidenceCount: uploadedUrls.length })

    } catch (error) {
        console.error('Error interno:', error)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}
