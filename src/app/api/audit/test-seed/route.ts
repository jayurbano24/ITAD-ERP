import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Datos de prueba sin foreign keys
    const testLogs = [
      {
        action: 'CREATE',
        module: 'TICKETS',
        description: 'Ticket creado: TK-2026-00001 - Laptop HP',
        entity_type: 'TICKET',
        entity_id: '550e8400-e29b-41d4-a716-446655440001',
        entity_reference: 'TK-2026-00001',
        user_name: 'Admin User',
        user_email: 'admin@example.com',
        user_role: 'admin',
        data_after: { ticket_type: 'repair', status: 'pending' },
        changes_summary: { status: 'pending' },
        created_at: new Date(Date.now() - 4 * 3600000).toISOString()
      },
      {
        action: 'CREATE',
        module: 'LOGISTICS',
        description: 'Lote creado: AUTO-001 para ticket TK-2026-00001',
        entity_type: 'BATCH',
        entity_id: '550e8400-e29b-41d4-a716-446655440002',
        entity_reference: 'AUTO-001',
        user_name: 'Admin User',
        user_email: 'admin@example.com',
        user_role: 'admin',
        data_after: { status: 'active', location: 'warehouse-a' },
        changes_summary: { status: 'active' },
        created_at: new Date(Date.now() - 3 * 3600000).toISOString()
      },
      {
        action: 'CREATE',
        module: 'RECEPTION',
        description: 'Activo creado: HP Pavilion 15 S/N: 7B9B7987987',
        entity_type: 'ASSET',
        entity_id: '550e8400-e29b-41d4-a716-446655440003',
        entity_reference: '7B9B7987987',
        user_name: 'Admin User',
        user_email: 'admin@example.com',
        user_role: 'admin',
        data_after: { serial_number: '7B9B7987987', status: 'received' },
        changes_summary: { status: 'received' },
        created_at: new Date(Date.now() - 2 * 3600000).toISOString()
      },
      {
        action: 'STATUS_CHANGE',
        module: 'RECEPTION',
        description: 'Activo 7B9B7987987: Estado recibido → evaluating',
        entity_type: 'ASSET',
        entity_id: '550e8400-e29b-41d4-a716-446655440003',
        entity_reference: '7B9B7987987',
        user_name: 'Technician User',
        user_email: 'tech@example.com',
        user_role: 'technician',
        data_after: { status: 'evaluating' },
        changes_summary: { status: { old: 'received', new: 'evaluating' } },
        created_at: new Date(Date.now() - 1 * 3600000).toISOString()
      },
      {
        action: 'MOVE',
        module: 'LOGISTICS',
        description: 'Lote AUTO-001: Ubicación actualizada',
        entity_type: 'BATCH',
        entity_id: '550e8400-e29b-41d4-a716-446655440002',
        entity_reference: 'AUTO-001',
        user_name: 'Warehouse User',
        user_email: 'warehouse@example.com',
        user_role: 'warehouse_manager',
        data_after: { location: 'workshop-b' },
        changes_summary: { location: { old: 'warehouse-a', new: 'workshop-b' } },
        created_at: new Date(Date.now() - 30 * 60000).toISOString()
      }
    ];

    // Insertar directamente sin usar RPC
    const { data, error } = await supabase
      .from('audit_logs')
      .insert(testLogs)
      .select('id');

    console.log('Insert Response:', { count: data?.length, error });

    if (error) {
      console.error('Insert Error:', error);
      return NextResponse.json(
        { 
          error: error.message,
          details: error.details || error.hint
        },
        { status: 500 }
      );
    }

    // Verificar cuántos registros hay en la tabla después
    const { count } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      message: `✓ ${data?.length || 0} registros insertados exitosamente`,
      count: count || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Catch Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
