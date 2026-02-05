import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Establece las variables de sesión de PostgreSQL para que los triggers de auditoría
 * puedan capturar correctamente al usuario responsable de la acción.
 * 
 * Requiere que exista una función RPC en la base de datos:
 * 
 * create or replace function set_session_data(user_id text, user_email text, user_role text)
 * returns void as $$
 * begin
 *   perform set_config('app.current_user', user_id, false);
 *   perform set_config('app.current_email', user_email, false);
 *   perform set_config('app.current_role', user_role, false);
 * end;
 * $$ language plpgsql security definer;
 */
export async function setSession(supabase: SupabaseClient) {
    try {
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
            // Intentamos llamar a la función RPC si existe
            await supabase.rpc('set_session_data', {
                user_id: user.id,
                user_email: user.email || '',
                user_role: user.role || 'authenticated'
            })
        }
    } catch (error) {
        // Si la función no existe, fallamos silenciosamente para no detener la operación principal,
        // pero logueamos un warning en desarrollo.
        console.warn('Nota: No se pudieron establecer las variables de sesión (rpc/set_session_data). Los logs podrían salir como "sistema".', error)
    }
}
