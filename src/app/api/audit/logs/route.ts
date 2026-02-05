import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    // Parámetros de filtrado
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const moduleName = searchParams.get('module');
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    let allLogs: any[] = [];
    let count = 0;

    // Si hay búsqueda por referencia (serial, lote, ticket), hacer búsqueda relacional
    if (search && !entityType && !entityId) {
      // 1. Buscar la serie directamente
      const { data: assetLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .ilike('entity_reference', `%${search}%`)
        .eq('entity_type', 'ASSET')
        .order('created_at', { ascending: false });

      // 2. Si encontramos una serie, buscar el lote asociado
      if (assetLogs && assetLogs.length > 0) {
        const batchIds = Array.from(new Set(assetLogs.map(log => log.batch_id).filter(Boolean)));

        if (batchIds.length > 0) {
          const { data: batchLogs } = await supabase
            .from('audit_logs')
            .select('*')
            .in('batch_id', batchIds)
            .order('created_at', { ascending: false });

          if (batchLogs) allLogs.push(...batchLogs);
        }
      }

      // 3. Buscar por lote directamente
      const { data: batchRefLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .ilike('entity_reference', `%${search}%`)
        .eq('entity_type', 'BATCH')
        .order('created_at', { ascending: false });

      if (batchRefLogs && batchRefLogs.length > 0) {
        const ticketIds = Array.from(new Set(batchRefLogs.map(log => log.ticket_id).filter(Boolean)));

        // Agregar logs del ticket
        if (ticketIds.length > 0) {
          const { data: ticketLogs } = await supabase
            .from('audit_logs')
            .select('*')
            .in('ticket_id', ticketIds)
            .order('created_at', { ascending: false });

          if (ticketLogs) allLogs.push(...ticketLogs);
        }

        allLogs.push(...batchRefLogs);
      }

      // 4. Buscar por ticket directamente
      const { data: ticketLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .ilike('entity_reference', `%${search}%`)
        .eq('entity_type', 'TICKET')
        .order('created_at', { ascending: false });

      if (ticketLogs) allLogs.push(...ticketLogs);

      // 5. Buscar por WORK_ORDER directamente (Taller)
      const { data: woLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .ilike('entity_reference', `%${search}%`)
        .eq('entity_type', 'WORK_ORDER')
        .order('created_at', { ascending: false });

      if (woLogs) allLogs.push(...woLogs);

      // Agregar los logs directos de serie, ticket, etc.
      if (assetLogs) allLogs.push(...assetLogs);
      if (ticketLogs) allLogs.push(...ticketLogs);
      if (batchRefLogs) allLogs.push(...batchRefLogs);

      // Eliminar duplicados y ordenar
      const uniqueLogs = Array.from(
        new Map(allLogs.map(log => [log.id, log])).values()
      ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      count = uniqueLogs.length;

      // Paginación
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      const paginatedLogs = uniqueLogs.slice(from, to + 1);

      return NextResponse.json({
        data: paginatedLogs,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
        },
        metadata: {
          searchType: 'RELATIONAL',
          searchQuery: search,
        },
      });
    }

    // Búsqueda normal con filtros
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Aplicar filtros
    if (entityType) query = query.eq('entity_type', entityType);
    if (entityId) query = query.eq('entity_id', entityId);
    if (moduleName) query = query.eq('module', moduleName);
    if (action) query = query.eq('action', action);
    if (userId) query = query.eq('user_id', userId);
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    if (search) {
      query = query.or(
        `entity_reference.ilike.%${search}%,` +
        `description.ilike.%${search}%`
      );
    }

    // Paginación
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: rawData, error, count: totalCount } = await query;

    if (error) {
      console.error('Error fetching audit logs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // ENRIQUECIMIENTO DE DATOS: Obtener detalles del activo (Marca, Modelo, Tipo)
    // Recolectar IDs de assets de los logs (prioridad: asset_id directo o buscar en work_orders)
    // Nota: audit_logs tiene asset_id (si se llenó) o work_order_id.

    let enrichedData = rawData || [];

    // Recolectar IDs de assets a buscar
    const assetIdsToFetch = new Set<string>();
    const workOrderIdsToFetch = new Set<string>();

    enrichedData.forEach(log => {
      if (log.asset_id) assetIdsToFetch.add(log.asset_id);
      if (log.work_order_id) workOrderIdsToFetch.add(log.work_order_id);
    });

    // Si tenemos work_orders sin asset_id explícito en el log, buscamos la OS para obtener el asset_id
    if (workOrderIdsToFetch.size > 0) {
      const { data: woData } = await supabase
        .from('work_orders')
        .select('id, asset_id')
        .in('id', Array.from(workOrderIdsToFetch));

      if (woData) {
        woData.forEach(wo => {
          if (wo.asset_id) assetIdsToFetch.add(wo.asset_id);
          // Mapear logs de este WO para que sepan su asset_id si les falta
          enrichedData.forEach(log => {
            if (log.work_order_id === wo.id && !log.asset_id) {
              log.asset_id = wo.asset_id;
            }
          });
        });
      }
    }

    // Ahora traer la info de los assets
    let assetsMap: Record<string, any> = {};
    if (assetIdsToFetch.size > 0) {
      const { data: assetsData } = await supabase
        .from('assets')
        .select('id, manufacturer, model, asset_type, serial_number')
        .in('id', Array.from(assetIdsToFetch));

      if (assetsData) {
        assetsMap = assetsData.reduce((acc, asset) => {
          acc[asset.id] = asset;
          return acc;
        }, {} as Record<string, any>);
      }
    }

    // ENRIQUECIMIENTO DE BODEGAS (UUID -> Nombre)
    let warehousesMap: Record<string, string> = {};
    const { data: warehousesData } = await supabase
      .from('warehouses')
      .select('id, name');

    if (warehousesData) {
      warehousesMap = warehousesData.reduce((acc, wh) => {
        acc[wh.id] = wh.name;
        return acc;
      }, {} as Record<string, string>);
    }

    const getWhName = (id: string | null | undefined) => {
      if (!id) return 'N/A';
      return warehousesMap[id] || id; // Return ID if name not found
    };

    // Pegar la info del activo a cada log
    enrichedData = enrichedData.map(log => {
      const asset = log.asset_id ? assetsMap[log.asset_id] : null;

      // ENRIQUECIMIENTO DE BODEGAS (UUID -> Nombre)
      let description = log.description;
      const changes = log.changes_summary ? { ...log.changes_summary } : null;

      if (changes?.current_warehouse_id) {
        const oldId = changes.current_warehouse_id.old;
        const newId = changes.current_warehouse_id.new;

        const oldName = getWhName(oldId);
        const newName = getWhName(newId);

        changes.current_warehouse_id = {
          old: oldName,
          new: newName
        };

        // Enrich Description if it's a warehouse movement
        if (log.module === 'ASSET' || log.module === 'WAREHOUSE') {
          if (description.includes('Movimiento de Bodega')) {
            description = `${description}: ${oldName || 'N/A'} -> ${newName || 'N/A'}`;
          }
        }
      }

      return {
        ...log,
        description,
        changes_summary: changes,
        asset_snapshot: asset ? {
          manufacturer: asset.manufacturer,
          model: asset.model,
          type: asset.asset_type,
          serial: asset.serial_number
        } : null
      };
    });


    return NextResponse.json({
      data: enrichedData,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
      },
      metadata: {
        searchType: 'STANDARD',
      },
    });
  } catch (error: any) {
    console.error('Error in audit logs API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
