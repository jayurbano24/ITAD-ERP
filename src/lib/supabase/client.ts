import { createBrowserClient } from '@supabase/ssr'
import { supabaseConfig } from './config'

/**
 * Cliente de Supabase para el navegador (Client Components)
 * Usa cookies para manejar la sesión automáticamente
 */
export function createClient() {
  return createBrowserClient(supabaseConfig.url, supabaseConfig.anonKey)
}

