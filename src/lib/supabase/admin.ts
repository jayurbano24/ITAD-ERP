import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { supabaseConfig } from './config'

/**
 * Cliente de Supabase con Service Role (solo en servidor)
 * Usa la clave `SUPABASE_SERVICE_ROLE_KEY` para operaciones privilegiadas
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurada en el entorno')
  }
  return createSupabaseClient(supabaseConfig.url, serviceRoleKey, {
    auth: { persistSession: false },
  })
}
