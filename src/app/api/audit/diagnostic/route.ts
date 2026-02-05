import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const serialNumber = searchParams.get('serial');

    const response: any = {
      timestamp: new Date().toISOString(),
      diagnostic: {}
    };

    // Primero, obtener todas las columnas de assets
    const { data: sampleAsset } = await supabase
      .from('assets')
      .select('*')
      .limit(1);

    response.diagnostic.assetsTableColumns = sampleAsset ? Object.keys(sampleAsset[0]) : [];

    if (serialNumber) {
      // 1. Buscar si la serie existe en assets - sin especificar columnas
      const { data: assetData, error: assetError } = await supabase
        .from('assets')
        .select('*')
        .ilike('serial_number', `%${serialNumber}%`)
        .limit(1);

      response.diagnostic.asset = {
        found: !assetError && assetData && assetData.length > 0,
        data: assetData?.[0] || null,
        error: assetError?.message
      };

      // 2. Buscar logs de esa serie
      const { data: logsData, error: logsError } = await supabase
        .from('audit_logs')
        .select('id, action, module, description, user_name, created_at, data_before, data_after')
        .ilike('entity_reference', `%${serialNumber}%`)
        .order('created_at', { ascending: false })
        .limit(10);

      response.diagnostic.auditLogs = {
        count: logsData?.length || 0,
        data: logsData || [],
        error: logsError?.message
      };

      // 3. También buscar por entity_id en case-insensitive
      const { data: assetsBySerialId, error: assetIdError } = await supabase
        .from('audit_logs')
        .select('entity_id, asset_id')
        .ilike('entity_reference', `%${serialNumber}%`)
        .eq('entity_type', 'ASSET')
        .limit(1);

      response.diagnostic.assetIdentifiers = {
        data: assetsBySerialId,
        error: assetIdError?.message
      };
    }

    // 4. Contar total de registros en audit_logs
    const { count } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true });

    response.diagnostic.totalAuditLogs = count;

    // 5. Últimos 10 registros de cualquier tipo
    const { data: recentLogs } = await supabase
      .from('audit_logs')
      .select('id, action, module, entity_type, entity_reference, user_name, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    response.diagnostic.recentLogs = recentLogs || [];

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
