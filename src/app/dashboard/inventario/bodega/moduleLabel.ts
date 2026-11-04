/** Resuelve en qué módulo/etapa está el equipo (bodega + status). */
export function resolveAssetModuleLabel(
  warehouseCode: string | null | undefined,
  status: string | null | undefined,
  warehouseName?: string | null
): string {
  const code = (warehouseCode || '').trim().toUpperCase()
  const st = (status || '').trim().toLowerCase()

  if (st === 'sold') return 'Vendido'
  if (st === 'destroyed' || st === 'scrapped') return 'Destruido / Scrap'
  if (st === 'wiped') return 'Wipe / Borrado'

  if (code === 'BOD-REP') {
    if (
      ['qc_pending', 'qc_failed', 'en control de calidad', 'qc pendiente', 'en qc', 'qc'].some(
        (x) => st.includes(x) || st === x
      )
    ) {
      return 'Taller · Control de calidad'
    }
    if (
      ['repairing', 'in_repair', 'reparacion', 'reparación', 'en reparacion', 'en reparación'].some(
        (x) => st === x || st.includes('repair')
      )
    ) {
      return 'Taller · Reparación'
    }
    if (['diagnosing', 'diagnosis', 'diagnostico', 'diagnóstico', 'open'].some((x) => st === x)) {
      return 'Taller · Diagnóstico'
    }
    return 'Por reparación'
  }

  if (code === 'BOD-REC') return 'Recepción'
  if (code === 'BOD-RPL') return 'Bodega de Remplazo · Reclamación'
  if (code === 'BOD-REM') {
    if (st === 'ready_for_sale') return 'Remarketing · Para venta'
    return 'Remarketing'
  }
  if (code === 'BOD-VAL') return 'Valorización'
  if (code === 'BOD-HARV') return 'Hardvesting'
  if (code === 'BOD-DES') return 'Destrucción'

  if (st === 'ready_for_sale') return 'Para venta'
  if (st === 'diagnosing') return 'Diagnóstico'
  if (warehouseName) return warehouseName
  if (code) return code
  return 'Sin módulo'
}
