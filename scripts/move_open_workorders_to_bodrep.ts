
import 'dotenv/config';
// Script para actualizar todos los activos que tienen orden de trabajo abierta en taller
// y moverlos a la bodega BOD-REP, registrando el movimiento en asset_history

import { createAdminClient } from './supabaseAdminClient';

async function main() {
  const supabase = createAdminClient();

  // 1. Buscar todos los activos con orden de trabajo abierta (status = 'open')
  const { data: workOrders, error: woError } = await supabase
    .from('work_orders')
    .select('asset_id')
    .eq('status', 'open');

  if (woError) {
    console.error('Error obteniendo órdenes de trabajo:', woError);
    process.exit(1);
  }

  const assetIds = workOrders?.map((wo: any) => wo.asset_id).filter(Boolean);
  if (!assetIds || assetIds.length === 0) {
    console.log('No hay activos con órdenes de trabajo abiertas.');
    return;
  }

  // 2. Actualizar la ubicación de los activos a BOD-REP
  const { error: updateError } = await supabase
    .from('assets')
    .update({ location: 'BOD-REP' })
    .in('id', assetIds);

  if (updateError) {
    console.error('Error actualizando ubicación de activos:', updateError);
    process.exit(1);
  }

  // 3. Registrar el movimiento en asset_history
  const historyRows = assetIds.map((id: string) => ({
    asset_id: id,
    action: 'MOVE',
    location: 'BOD-REP',
    description: 'Sincronización masiva: movimiento a BOD-REP para activos con orden de trabajo abierta',
  }));

  const { error: histError } = await supabase
    .from('asset_history')
    .insert(historyRows);

  if (histError) {
    console.error('Error registrando movimientos en asset_history:', histError);
    process.exit(1);
  }

  console.log('Actualización completada. Todos los activos con orden de trabajo abierta están en BOD-REP y el movimiento fue registrado.');
}

main();
