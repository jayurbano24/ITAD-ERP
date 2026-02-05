import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { serial } = body;

    console.log('Test trigger request:', { serial });

    if (!serial) {
      return NextResponse.json(
        { error: 'serial parameter is required' },
        { status: 400 }
      );
    }

    // 1. Buscar la serie - usar ilike para case-insensitive
    const { data: assetData, error: assetError } = await supabase
      .from('assets')
      .select('id, serial_number, batch_id, status, location')
      .ilike('serial_number', `%${serial}%`)
      .limit(1);

    console.log('Asset search result:', { assetData, assetError });

    if (assetError) {
      return NextResponse.json(
        { error: `Error buscando serie: ${assetError.message}` },
        { status: 500 }
      );
    }

    if (!assetData || assetData.length === 0) {
      return NextResponse.json(
        { error: `Serie no encontrada: ${serial}` },
        { status: 404 }
      );
    }

    const asset = assetData[0];
    console.log('Found asset:', asset);

    // 2. Simular un cambio en el status para disparar el trigger
    const newStatus = asset.status === 'received' ? 'processing' : 'received';
    
    console.log('Updating asset status from', asset.status, 'to', newStatus);

    const { data: updateData, error: updateError } = await supabase
      .from('assets')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', asset.id)
      .select();

    console.log('Update result:', { updateData, updateError });

    if (updateError) {
      return NextResponse.json(
        { error: `Error actualizando serie: ${updateError.message}` },
        { status: 500 }
      );
    }

    // 3. Esperar un momento y luego verificar si se registró el log
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 4. Buscar el log que debería haberse creado
    const { data: logsData, error: logsError } = await supabase
      .from('audit_logs')
      .select('id, action, description, user_name, created_at')
      .ilike('entity_reference', `%${serial}%`)
      .order('created_at', { ascending: false })
      .limit(5);

    console.log('Audit logs search:', { logsData, logsError });

    return NextResponse.json({
      success: true,
      message: `Serie ${asset.serial_number} actualizada de ${asset.status} a ${newStatus}`,
      assetId: asset.id,
      serial: asset.serial_number,
      triggerWorked: logsData && logsData.length > 0,
      auditLogs: logsData || [],
      debugInfo: {
        searchedFor: serial,
        foundAsset: asset.serial_number,
        logsFound: logsData?.length || 0
      }
    });
  } catch (error: any) {
    console.error('Error in test-asset-trigger:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
