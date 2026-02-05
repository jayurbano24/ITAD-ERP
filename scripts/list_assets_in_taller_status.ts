import 'dotenv/config';
import { createAdminClient } from './supabaseAdminClient.ts';

async function main() {
  const supabase = createAdminClient();

  // 1. Buscar todas las órdenes de trabajo en estados activos de taller
  // Estados válidos: open, in_progress, waiting_parts, waiting_quote, quote_approved, waiting_seedstock, qc_pending
  const activeStatuses = [
    'open',
    'in_progress',
    'waiting_parts',
    'waiting_quote',
    'quote_approved',
    'waiting_seedstock',
    'qc_pending'
  ];
  const { data: workOrders, error: woError } = await supabase
    .from('work_orders')
    .select('id, asset_id, status')
    .in('status', activeStatuses)
    .order('created_at', { ascending: false });

  if (woError) {
    console.error('Error obteniendo órdenes de trabajo:', woError);
    process.exit(1);
  }

  if (!workOrders || workOrders.length === 0) {
    console.log('No hay órdenes de trabajo abiertas o en reparación.');
    return;
  }

  // 2. Buscar los activos relacionados y mostrar su status y bodega
  const assetIds = workOrders.map((wo: any) => wo.asset_id).filter(Boolean);
  if (assetIds.length === 0) {
    console.log('No hay activos asociados a las órdenes de trabajo.');
    return;
  }

  const { data: assets, error: assetsError } = await supabase
    .from('assets')
    .select('id, serial_number, internal_tag, status, location, current_warehouse_id')
    .in('id', assetIds);

  if (assetsError) {
    console.error('Error obteniendo activos:', assetsError);
    process.exit(1);
  }

  // 3. Buscar los nombres de las bodegas
  const warehouseIds = Array.from(new Set(assets.map((a: any) => a.current_warehouse_id).filter(Boolean)));
  let warehouseMap: Record<string, string> = {};
  if (warehouseIds.length > 0) {
    const { data: warehouses } = await supabase
      .from('warehouses')
      .select('id, code, name')
      .in('id', warehouseIds);
    warehouses?.forEach((w: any) => {
      warehouseMap[w.id] = `${w.code} - ${w.name}`;
    });
  }

  // 4. Mostrar resumen
  for (const wo of workOrders) {
    const asset = assets.find((a: any) => a.id === wo.asset_id);
    if (!asset) continue;
    const bodega = warehouseMap[asset.current_warehouse_id] || 'N/A';
    console.log(`OS: ${wo.id} | Serie: ${asset.serial_number || asset.internal_tag} | Status: ${asset.status} | Bodega: ${bodega}`);
  }
}

main();
