import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { serial, action = 'MOVE', description = 'Movimiento de serie' } = body;

    if (!serial) {
      return NextResponse.json({ error: 'serial is required' }, { status: 400 });
    }

    // Buscar la serie para obtener sus IDs
    const { data: assetData } = await supabase
      .from('assets')
      .select('id, batch_id')
      .ilike('serial_number', `%${serial}%`)
      .limit(1);

    if (!assetData || assetData.length === 0) {
      return NextResponse.json(
        { error: `Serie no encontrada: ${serial}` },
        { status: 404 }
      );
    }

    const asset = assetData[0];

    // Obtener batch info para ticket_id
    const { data: batchData } = await supabase
      .from('batches')
      .select('ticket_id')
      .eq('id', asset.batch_id)
      .limit(1);

    const ticket_id = batchData?.[0]?.ticket_id || null;

    // Insertar registro de auditoría directamente
    const { data: logData, error: logError } = await supabase
      .from('audit_logs')
      .insert({
        action: action,
        module: 'WAREHOUSE',
        description: description || `Movimiento registrado para serie ${serial}`,
        entity_type: 'ASSET',
        entity_id: asset.id,
        entity_reference: serial,
        ticket_id: ticket_id,
        batch_id: asset.batch_id,
        asset_id: asset.id,
        user_name: 'Sistema',
        user_email: 'sistema@itad.gt',
        user_role: 'system',
        data_after: { serial_number: serial, action: action },
        changes_summary: { movement: true },
        created_at: new Date().toISOString()
      });

    if (logError) {
      console.error('Insert error:', logError);
      return NextResponse.json(
        { error: `Error registrando auditoría: ${logError.message}` },
        { status: 500 }
      );
    }

    // Verificar que se insertó
    const { data: verifyData } = await supabase
      .from('audit_logs')
      .select('id, entity_reference, action, created_at')
      .eq('entity_reference', serial)
      .order('created_at', { ascending: false })
      .limit(1);

    return NextResponse.json({
      success: true,
      message: `Registro de auditoría creado para serie ${serial}`,
      verified: verifyData && verifyData.length > 0,
      lastLog: verifyData?.[0] || null,
      assetId: asset.id
    });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
