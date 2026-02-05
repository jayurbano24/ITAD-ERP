import { supabase } from '../supabaseClient'; // Asegúrate de que la ruta sea correcta

/**
 * Registra un movimiento o acción en la bitácora inmutable del activo.
 * @param {Object} data - Datos del movimiento
 */
export const saveAssetMovement = async ({
  asset_id,
  module,
  action,
  details = {},
  previous_status = null,
  new_status = null,
  location = null,
  comments = ''
}) => {
  try {
    // 1. Obtener el usuario actual de la sesión de Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) throw new Error("No hay una sesión activa para registrar el historial.");

    // 2. Insertar el registro en asset_history
    const { error } = await supabase
      .from('asset_history')
      .insert([
        {
          asset_id,
          module,
          action,
          details,
          previous_status,
          new_status,
          user_id: user.id,
          location,
          comments
        }
      ]);

    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error("Error en Bitácora ITAD:", error.message);
    // No bloqueamos el proceso principal, solo notificamos
    return { success: false, error: error.message };
  }
};
