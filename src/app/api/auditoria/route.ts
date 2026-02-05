import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const serie = searchParams.get('serie');
  const isGlobal = searchParams.get('global') === '1';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
  const supabase = await createClient();

  if (isGlobal) {
    // Consulta global con paginación y búsqueda desde audit_logs
    const search = searchParams.get('search') || '';
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('audit_logs')
      .select(`
        id,
        action,
        module,
        description,
        user_name,
        user_email,
        user_role,
        entity_type,
        entity_reference,
        entity_id,
        data_before,
        data_after,
        changes_summary,
        created_at,
        asset_id,
        ticket_id,
        batch_id
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    // Aplicar filtro de búsqueda si existe
    if (search) {
      query = query.or(`
        entity_reference.ilike.%${search}%,
        user_name.ilike.%${search}%,
        user_email.ilike.%${search}%,
        description.ilike.%${search}%,
        module.ilike.%${search}%
      `);
    }

    const { data: auditLogs, error, count } = await query;

    if (error) {
      console.error('Error fetching audit logs:', error);
      return NextResponse.json({ data: [], total: 0 }, { status: 500 });
    }

    // Transformar los logs al formato esperado por el componente
    const transformedData = (auditLogs || []).map((log: any) => {
      // Extraer estatus anterior y nuevo
      let estatusAnterior = '-';
      let estatusNuevo = '-';

      if (log.changes_summary && typeof log.changes_summary === 'object') {
        if (log.changes_summary.status) {
          estatusAnterior = log.changes_summary.status.old || '-';
          estatusNuevo = log.changes_summary.status.new || '-';
        }
      } else if (log.data_before && log.data_after) {
        estatusAnterior = log.data_before.status || '-';
        estatusNuevo = log.data_after.status || '-';
      }

      // Determinar origen basado en el módulo
      const origenMap: Record<string, string> = {
        'TICKETS': 'Tickets',
        'LOGISTICS': 'Logística',
        'RECEPTION': 'Recepción',
        'WAREHOUSE': 'Bodega',
        'WORKSHOP': 'Taller',
        'SALES': 'Ventas',
        'INVENTORY': 'Inventario'
      };
      const origen = origenMap[log.module] || log.module || 'Sistema';

      return {
        fecha_hora: log.created_at,
        usuario_nombre: log.user_name || log.user_email || 'Sistema',
        estatus_anterior: estatusAnterior,
        estatus_nuevo: estatusNuevo,
        origen: origen,
        descripcion: log.description || log.action || 'Sin descripción',
        serie: log.entity_reference || '',
        reference: log.entity_reference || '',
        user: log.user_name || log.user_email || 'Sistema',
        source: origen,
        description: log.description || log.action || 'Sin descripción',
        new_value: estatusNuevo
      };
    });

    return NextResponse.json({ data: transformedData, total: count || 0 }, { status: 200 });
  }

  if (!serie) {
    return NextResponse.json([], { status: 200 });
  }

  // Normalizar serie
  const normalizedSerie = serie.toUpperCase().replace(/\s+/g, '');

  // Primero buscar el asset por serial_number o internal_tag
  let { data: assets, error: assetError } = await supabase
    .from('assets')
    .select('id, serial_number, internal_tag')
    .or(`serial_number.eq.${normalizedSerie},internal_tag.eq.${normalizedSerie}`)
    .limit(1);

  if (assetError) {
    console.error('Error searching asset:', assetError);
    return NextResponse.json([], { status: 500 });
  }

  let assetId: string | null = null;
  let serialNumber: string = normalizedSerie;
  let ticketId: string | null = null;

  if (assets && assets.length > 0) {
    assetId = assets[0].id;
    serialNumber = assets[0].serial_number || assets[0].internal_tag || normalizedSerie;
  } else {
    // Si no se encuentra en assets, buscar en ticket_items
    const { data: ticketItems, error: ticketError } = await supabase
      .from('ticket_items')
      .select('id, collected_serial, ticket_id, asset_id')
      .eq('collected_serial', normalizedSerie)
      .limit(1);

    if (ticketError) {
      console.error('Error searching ticket_items:', ticketError);
    } else if (ticketItems && ticketItems.length > 0) {
      const ticketItem = ticketItems[0];
      serialNumber = ticketItem.collected_serial || normalizedSerie;
      ticketId = ticketItem.ticket_id;

      if (ticketItem.asset_id) {
        assetId = ticketItem.asset_id;
      }
    } else {
      return NextResponse.json([], { status: 200 });
    }
  }

  // Buscar logs de auditoría
  let auditLogs: any[] = [];
  let logsError: any = null;

  // Si tenemos asset_id, buscar por asset_id
  if (assetId) {
    const { data: logsByAsset, error: assetLogsError } = await supabase
      .from('audit_logs')
      .select(`
        id,
        action,
        module,
        description,
        user_name,
        user_email,
        user_role,
        entity_type,
        entity_reference,
        data_before,
        data_after,
        changes_summary,
        created_at
      `)
      .eq('asset_id', assetId)
      .eq('entity_type', 'ASSET')
      .order('created_at', { ascending: true });

    if (assetLogsError) {
      console.error('Error fetching logs by asset_id:', assetLogsError);
      logsError = assetLogsError;
    } else if (logsByAsset) {
      auditLogs = logsByAsset;
    }
  }

  // Si no hay logs por asset_id pero tenemos ticket_id, buscar por ticket_id
  if (auditLogs.length === 0 && ticketId && !logsError) {
    const { data: logsByTicket, error: ticketLogsError } = await supabase
      .from('audit_logs')
      .select(`
        id,
        action,
        module,
        description,
        user_name,
        user_email,
        user_role,
        entity_type,
        entity_reference,
        data_before,
        data_after,
        changes_summary,
        created_at
      `)
      .eq('ticket_id', ticketId)
      .or(`entity_reference.eq.${serialNumber},entity_reference.ilike.%${serialNumber}%`)
      .order('created_at', { ascending: true });

    if (!ticketLogsError && logsByTicket && logsByTicket.length > 0) {
      auditLogs = logsByTicket;
    }
  }

  // Si aún no hay logs, intentar por entity_reference
  if (auditLogs.length === 0 && !logsError) {
    const { data: logsByRef, error: refError } = await supabase
      .from('audit_logs')
      .select(`
        id,
        action,
        module,
        description,
        user_name,
        user_email,
        user_role,
        entity_type,
        entity_reference,
        data_before,
        data_after,
        changes_summary,
        created_at
      `)
      .eq('entity_reference', serialNumber)
      .order('created_at', { ascending: true });

    if (!refError && logsByRef && logsByRef.length > 0) {
      auditLogs = logsByRef;
    }
  }

  if (logsError) {
    console.error('Error fetching audit logs:', logsError);
    return NextResponse.json([], { status: 200 });
  }

  // Transformar los logs al formato esperado por el componente
  const historial = (auditLogs || []).map((log: any) => {
    // Extraer estatus anterior y nuevo de changes_summary o data_before/data_after
    let estatusAnterior = '-';
    let estatusNuevo = '-';
    if (log.changes_summary && typeof log.changes_summary === 'object') {
      if (log.changes_summary.status) {
        estatusAnterior = log.changes_summary.status.old || '-';
        estatusNuevo = log.changes_summary.status.new || '-';
      }
    } else if (log.data_before && log.data_after) {
      // Si son objetos, usa .status; si son strings, usa el valor directo
      if (typeof log.data_before === 'object' && log.data_before !== null) {
        estatusAnterior = log.data_before.status || '-';
      } else if (typeof log.data_before === 'string') {
        estatusAnterior = log.data_before;
      }
      if (typeof log.data_after === 'object' && log.data_after !== null) {
        estatusNuevo = log.data_after.status || '-';
      } else if (typeof log.data_after === 'string') {
        estatusNuevo = log.data_after;
      }
    }

    // Determinar origen basado en el módulo
    const origenMap: Record<string, string> = {
      'TICKETS': 'Tickets',
      'LOGISTICS': 'Logística',
      'RECEPTION': 'Recepción',
      'WAREHOUSE': 'Bodega',
      'WORKSHOP': 'Taller',
      'SALES': 'Ventas',
      'INVENTORY': 'Inventario'
    };
    const origen = origenMap[log.module] || log.module || 'Sistema';

    // Extraer campos adicionales para la tabla
    const diagnosis = log.changes_summary?.diagnosis?.new || log.diagnosis || '';
    const repair = log.changes_summary?.repair?.new || log.repair || '';
    const branch = log.changes_summary?.branch?.new || log.branch || '';
    const comment = log.changes_summary?.comment?.new || log.comment || log.comments || '';
    const bodega = log.changes_summary?.bodega?.new || log.bodega || log.location || log.ubicacion || '';

    // Usuarios involucrados: buscar en changes_summary.usuarios (array) o usar user_name/email
    let usuarios = [];
    if (Array.isArray(log.changes_summary?.usuarios) && log.changes_summary.usuarios.length > 0) {
      usuarios = log.changes_summary.usuarios;
    } else if (log.user_name || log.user_email) {
      usuarios = [log.user_name || log.user_email];
    } else {
      usuarios = ['Sistema'];
    }

    // Para compatibilidad, mantener technician como primer usuario si existe
    const technician = log.changes_summary?.technician?.new || log.technician || '';
    if (technician && !usuarios.includes(technician)) {
      usuarios.unshift(technician);
    }

    return {
      timestamp: log.created_at || null,
      status: estatusNuevo,
      diagnosis,
      repair,
      technician,
      usuarios, // <-- array de usuarios involucrados
      branch,
      comment,
      bodega,
      action: log.description || log.action || 'Sin descripción',
      module: origen,
      location: log.location || log.ubicacion || '',
      comments: log.comments || log.comentarios || '',
      user_name: log.user_name || log.user_email || 'Sistema',
    };
  });

  return NextResponse.json(historial, { status: 200 });
}
