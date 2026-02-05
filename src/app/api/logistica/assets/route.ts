import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const ticketId = url.searchParams.get('ticketId')?.trim()

    console.log('API Assets: Request received for ticketId:', ticketId)

    if (!ticketId) {
      console.log('API Assets: Missing ticketId parameter')
      return NextResponse.json({ error: 'Falta el identificador del ticket' }, { status: 400 })
    }

    const supabase = await createClient()

    // Primero obtener el UUID del ticket usando readable_id
    console.log('API Assets: Looking up ticket with readable_id:', ticketId)
    const { data: ticketRecord, error: ticketError } = await supabase
      .from('operations_tickets')
      .select('id')
      .ilike('readable_id', ticketId)
      .maybeSingle()

    console.log('API Assets: Ticket lookup result:', { ticketRecord, ticketError })

    if (ticketError) {
      console.error('API Assets: Database error when looking up ticket:', ticketError)
      return NextResponse.json({ error: `Error en base de datos: ${ticketError.message}` }, { status: 500 })
    }

    if (!ticketRecord) {
      console.log('API Assets: Ticket not found for readable_id:', ticketId)
      return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })
    }

    // Obtener los assets asociados a este ticket
    console.log('API Assets: Looking up assets for ticket UUID:', ticketRecord.id)
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select(`
        id,
        internal_tag,
        serial_number,
        brand,
        model,
        product_type,
        status,
        created_at,
        updated_at
      `)
      .eq('ticket_id', ticketRecord.id)
      .order('created_at', { ascending: true })

    console.log('API Assets: Assets lookup result:', { assets, assetsError })

    // Si la tabla no existe o hay un error de permisos, devolver datos vacíos
    if (assetsError) {
      console.error('API Assets: Database error when looking up assets:', assetsError)

      // Verificar si es un error de tabla no encontrada
      if (assetsError.message?.includes('relation') || assetsError.message?.includes('does not exist')) {
        console.log('API Assets: Assets table does not exist, returning empty result')
        return NextResponse.json({
          assets: [],
          totalAssets: 0,
          message: 'Tabla assets no encontrada, usando datos vacíos'
        })
      }

      return NextResponse.json({ error: `Error en base de datos: ${assetsError.message}` }, { status: 500 })
    }

    // Agrupar assets por marca, modelo y tipo de producto
    const groupedAssets = new Map()

    assets?.forEach(asset => {
      const key = `${asset.brand || 'Sin marca'}|${asset.model || 'Sin modelo'}|${asset.product_type || 'Sin tipo'}`

      if (!groupedAssets.has(key)) {
        groupedAssets.set(key, {
          brand: asset.brand || 'Sin marca',
          model: asset.model || 'Sin modelo',
          productType: asset.product_type || 'Sin tipo',
          expectedQuantity: 0,
          receivedQuantity: 0,
          assets: []
        })
      }

      const group = groupedAssets.get(key)
      group.expectedQuantity++
      group.receivedQuantity++ // Todos los assets están recibidos
      group.assets.push(asset)
    })

    const result = Array.from(groupedAssets.values())
    console.log('API Assets: Final result:', { totalGroups: result.length, totalAssets: assets?.length || 0 })

    return NextResponse.json({
      assets: result,
      totalAssets: assets?.length || 0
    })

  } catch (error) {
    console.error('API Assets: Unexpected error:', error)
    const message = error instanceof Error ? error.message : 'Error al cargar los assets'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
