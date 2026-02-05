import { useEffect } from 'react';
import { saveAssetMovement } from '../utils/historyLogger';

/**
 * Hook para automatizar el registro de movimientos de activos.
 * @param {Object} params - Parámetros del movimiento
 * @param {boolean} trigger - Si es true, ejecuta el guardado
 */
export function useAssetTransition(params, trigger) {
  useEffect(() => {
    if (trigger) {
      saveAssetMovement(params);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);
}
