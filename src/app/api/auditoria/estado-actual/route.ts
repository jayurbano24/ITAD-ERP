import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let serie = searchParams.get('serie');
  if (!serie) {
    return NextResponse.json({}, { status: 200 });
  }
  // Normalizar serie
  serie = serie.toUpperCase().replace(/\s+/g, '');
  const supabase = await createClient();

  // Buscar en assets primero
  let { data, error } = await supabase
    .from('assets')
    .select('id, current_warehouse_id, status, serial_number, internal_tag, location, updated_at, batch_id')
    .or(`serial_number.eq.${serie},internal_tag.eq.${serie}`)
    .maybeSingle();

  let bodega = '';
  let ubicacion = '';
  let fechaUltimoMovimiento = '';
  let fechaEnBodega = '';
  let caja: number | null = null;
  let numeroLote = '';
  let ticket = '';
  let assetId: string | null = null;

  if (data) {
    assetId = data.id;
    if (data.current_warehouse_id) {
      const { data: warehouse } = await supabase
        .from('warehouses')
        .select('name')
        .eq('id', data.current_warehouse_id)
        .maybeSingle();
      bodega = warehouse?.name || '';
    }
    ubicacion = data.location || '';
    fechaUltimoMovimiento = data.updated_at || '';

    console.log(`[API/estado-actual] Asset location from assets table: ${ubicacion || 'null/empty'}`);

    // Si no hay ubicación en assets, buscar en batches
    if (!ubicacion && data.batch_id) {
      const { data: batch } = await supabase
        .from('batches')
        .select('location')
        .eq('id', data.batch_id)
        .maybeSingle();

      if (batch?.location) {
        ubicacion = batch.location;
        console.log(`[API/estado-actual] Found location in batches: ${ubicacion}`);
      }
    }

    console.log(`[API/estado-actual] Final ubicacion value: ${ubicacion || 'No disponible'}`);

    // Obtener fecha en bodega desde inventory_movements
    if (assetId && data.current_warehouse_id) {
      const { data: movement } = await supabase
        .from('inventory_movements')
        .select('created_at')
        .eq('asset_id', assetId)
        .eq('to_warehouse_id', data.current_warehouse_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (movement?.created_at) {
        fechaEnBodega = movement.created_at;
      } else {
        // Fallback: usar created_at del asset
        fechaEnBodega = data.updated_at || '';
      }
    } else {
      fechaEnBodega = data.updated_at || '';
    }

    // Obtener box_number desde ticket_items
    if (assetId) {
      const { data: ticketItem } = await supabase
        .from('ticket_items')
        .select('box_number, ticket_id')
        .eq('asset_id', assetId)
        .maybeSingle();

      if (ticketItem?.box_number) {
        caja = ticketItem.box_number;
      }
    }

    // Obtener batch code y ticket code
    if (data.batch_id) {
      const { data: batch } = await supabase
        .from('batches')
        .select('internal_batch_id, ticket_id')
        .eq('id', data.batch_id)
        .maybeSingle();

      if (batch) {
        numeroLote = batch.internal_batch_id || '';

        // Obtener ticket code
        if (batch.ticket_id) {
          const { data: ticketData } = await supabase
            .from('operations_tickets')
            .select('readable_id')
            .eq('id', batch.ticket_id)
            .maybeSingle();

          if (ticketData?.readable_id) {
            ticket = ticketData.readable_id;
          }
        }
      }
    }
  } else {
    // Buscar en ticket_items si no está en assets
    const { data: ticketData } = await supabase
      .from('ticket_items')
      .select('warehouse_id, status, collected_serial, location, updated_at, box_number, ticket_id, asset_id')
      .eq('collected_serial', serie)
      .maybeSingle();

    if (ticketData) {
      assetId = ticketData.asset_id;
      if (ticketData.warehouse_id) {
        const { data: warehouse } = await supabase
          .from('warehouses')
          .select('name')
          .eq('id', ticketData.warehouse_id)
          .maybeSingle();
        bodega = warehouse?.name || '';
      }
      ubicacion = ticketData.location || '';
      fechaUltimoMovimiento = ticketData.updated_at || '';
      fechaEnBodega = ticketData.updated_at || '';
      caja = ticketData.box_number || null;

      // Si no hay ubicación en ticket_items y hay asset_id, buscar en assets o batches
      if (!ubicacion && assetId) {
        const { data: asset } = await supabase
          .from('assets')
          .select('location, batch_id')
          .eq('id', assetId)
          .maybeSingle();

        if (asset?.location) {
          ubicacion = asset.location;
        } else if (asset?.batch_id) {
          // Buscar en batches si no está en assets
          const { data: batch } = await supabase
            .from('batches')
            .select('location')
            .eq('id', asset.batch_id)
            .maybeSingle();

          if (batch?.location) {
            ubicacion = batch.location;
          }
        }
      }

      // Si hay asset_id, obtener fecha en bodega desde inventory_movements
      if (assetId && ticketData.warehouse_id) {
        const { data: movement } = await supabase
          .from('inventory_movements')
          .select('created_at')
          .eq('asset_id', assetId)
          .eq('to_warehouse_id', ticketData.warehouse_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (movement?.created_at) {
          fechaEnBodega = movement.created_at;
        }
      }

      data = {
        status: ticketData.status,
        serial_number: ticketData.collected_serial,
        batch_id: null,
      } as any;

      // Obtener batch_id desde asset si existe
      if (assetId) {
        const { data: asset } = await supabase
          .from('assets')
          .select('batch_id')
          .eq('id', assetId)
          .maybeSingle();

        if (asset?.batch_id) {
          (data as any).batch_id = asset.batch_id;
        }
      }

      // Obtener batch code y ticket code
      if ((data as any).batch_id) {
        const { data: batch } = await supabase
          .from('batches')
          .select('internal_batch_id, ticket_id')
          .eq('id', (data as any).batch_id)
          .maybeSingle();

        if (batch) {
          numeroLote = batch.internal_batch_id || '';

          // Obtener ticket code
          if (batch.ticket_id) {
            const { data: ticketInfo } = await supabase
              .from('operations_tickets')
              .select('readable_id')
              .eq('id', batch.ticket_id)
              .maybeSingle();

            if (ticketInfo?.readable_id) {
              ticket = ticketInfo.readable_id;
            }
          }
        }
      } else if (ticketData.ticket_id) {
        // Si no hay batch_id, intentar obtener ticket directamente
        const { data: ticketInfo } = await supabase
          .from('operations_tickets')
          .select('readable_id')
          .eq('id', ticketData.ticket_id)
          .maybeSingle();

        if (ticketInfo?.readable_id) {
          ticket = ticketInfo.readable_id;
        }
      }
    }
  }

  if (data) {
    // Si el estatus es "diagnosing" y la bodega es de recepción, mostrar "Bodega_Recepcion"
    let estatusDisplay = data.status || '';
    if (estatusDisplay === 'diagnosing' && (bodega.includes('Recepcion') || bodega.includes('Recepción'))) {
      estatusDisplay = 'Bodega_Recepcion';
    }

    return NextResponse.json({
      serie: data.serial_number || '',
      estatus: estatusDisplay,
      bodega,
      ubicacion,
      fechaUltimoMovimiento,
      fechaEnBodega: fechaEnBodega,
      caja: caja,
      numeroLote: numeroLote,
      ticket: ticket,
    }, { status: 200 });
  }

  return NextResponse.json({}, { status: 200 });
}
