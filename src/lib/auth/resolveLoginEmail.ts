import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/** Dominio corporativo por defecto (sobrescribir con AUTH_LOGIN_EMAIL_DOMAIN). */
const DEFAULT_LOGIN_EMAIL_DOMAIN = 'techcommwireless.com'

/**
 * Convierte usuario corto (sin @) al correo de Auth:
 * 1) perfil activo (prefijo de email o nombre)
 * 2) usuario@AUTH_LOGIN_EMAIL_DOMAIN o dominio por defecto
 */
export async function resolveLoginEmail(
  identifier: string
): Promise<{ email: string } | { error: string }> {
  const trimmed = identifier.trim()
  if (!trimmed) {
    return { error: 'Ingresa tu usuario o correo.' }
  }

  if (trimmed.includes('@')) {
    return { email: trimmed.toLowerCase() }
  }

  const login = trimmed.toLowerCase()
  const resolvedFromDb = await lookupProfileEmail(login)
  if (resolvedFromDb) {
    return resolvedFromDb
  }

  const domain = (
    process.env.AUTH_LOGIN_EMAIL_DOMAIN?.trim() || DEFAULT_LOGIN_EMAIL_DOMAIN
  ).toLowerCase()
  return { email: `${login}@${domain}` }
}

async function lookupProfileEmail(
  login: string
): Promise<{ email: string } | { error: string } | null> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  if (!serviceKey || !supabaseUrl) {
    return null
  }

  const admin = createSupabaseClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  const emails = new Set<string>()

  const { data: byPrefix, error: prefixErr } = await admin
    .from('profiles')
    .select('email')
    .eq('is_active', true)
    .ilike('email', `${escapeIlike(login)}@%`)

  if (!prefixErr && byPrefix?.length) {
    for (const row of byPrefix) {
      const e = row.email?.trim().toLowerCase()
      if (e) emails.add(e)
    }
  }

  const { data: byName, error: nameErr } = await admin
    .from('profiles')
    .select('email')
    .eq('is_active', true)
    .ilike('full_name', escapeIlike(login))

  if (!nameErr && byName?.length) {
    for (const row of byName) {
      const e = row.email?.trim().toLowerCase()
      if (e) emails.add(e)
    }
  }

  if (emails.size === 0) {
    return null
  }
  if (emails.size === 1) {
    return { email: Array.from(emails)[0]! }
  }
  return {
    error:
      'Varios usuarios coinciden con ese nombre. Ingresa el correo completo.',
  }
}

function escapeIlike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}