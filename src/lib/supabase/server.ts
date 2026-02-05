import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseConfig } from './config'

/**
 * Cliente de Supabase para el servidor (Server Components, Route Handlers, Server Actions)
 * Maneja cookies de forma segura en el servidor
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    supabaseConfig.url,
    supabaseConfig.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // El método `setAll` es llamado desde un Server Component.
            // Esto puede ser ignorado si tienes middleware que refresca
            // las sesiones de usuario.
          }
        },
      },
    }
  )
}

