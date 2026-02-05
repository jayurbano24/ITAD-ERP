import 'dotenv/config';
import { createAdminClient } from './supabaseAdminClient';

async function main() {
  const supabase = createAdminClient();

  // 1. Obtener el ID de la bodega BOD-REP
  const { data: repWarehouse, error: repWarehouseError } = await supabase
    .from('warehouses')
    .select('id')
    .eq('code', 'BOD-REP')
    .maybeSingle();

  if (repWarehouseError || !repWarehouse?.id) {
    console.error('No se pudo obtener el ID de la bodega BOD-REP:', repWarehouseError);
    process.exit(1);
  }

  // 2. Buscar todos los activos con orden de trabajo abierta y location = 'BOD-REP', pero current_warehouse_id incorrecto
  const { data: assets, error: assetsError } = await supabase
    .from('assets')
    .select('id, current_warehouse_id, location')
    .eq('location', 'BOD-REP')
    .neq('current_warehouse_id', repWarehouse.id);

  if (assetsError) {
    console.error('Error obteniendo activos en taller:', assetsError);
    process.exit(1);
  }

  if (!assets || assets.length === 0) {
    console.log('No hay activos en taller con current_warehouse_id desactualizado.');
    return;
  }

  const assetIds = assets.map((a: any) => a.id);

  // 3. Actualizar current_warehouse_id para todos esos activos
  const { error: updateError } = await supabase
    .from('assets')
    .update({ current_warehouse_id: repWarehouse.id })
    .in('id', assetIds);

  if (updateError) {
    console.error('Error actualizando current_warehouse_id:', updateError);
    process.exit(1);
  }

  console.log(`Actualización completada. ${assetIds.length} activos en taller ahora tienen el current_warehouse_id correcto para BOD-REP.`);
}

main();
