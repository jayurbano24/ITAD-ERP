'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

import { cookies } from 'next/headers'
import { SessionUsuarioSchema } from '@/lib/schemas'
import { randomUUID } from 'crypto'
import { resolveLoginEmail } from '@/lib/auth/resolveLoginEmail'

/**
 * Server Action para iniciar sesión
 * Autentica al usuario con email y password usando Supabase Auth
 */
export async function login(formData: FormData) {
  const supabase = await createClient()
  const cookieStore = await cookies()

  const identifier = (formData.get('email') as string) || ''
  const password = formData.get('password') as string
  const deviceId = String(formData.get('deviceId') || '').trim() || randomUUID()

  if (!identifier.trim() || !password) {
    redirect('/?error=MissingCredentials')
  }

  const resolved = await resolveLoginEmail(identifier)
  if ('error' in resolved) {
    redirect(
      `/?error=LoginFailed&message=${encodeURIComponent(resolved.error)}`
    )
  }

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: resolved.email,
    password,
  })

  if (error || !authData.user) {
    console.error('Login error:', error?.message)
    redirect(`/?error=LoginFailed&message=${encodeURIComponent(error?.message || 'Error desconocido')}`)
  }

  // Control de Sesión Única: Guardar deviceId en el perfil
  // Esto invalidará cualquier sesión previa en otro dispositivo
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      current_device_id: deviceId,
      last_active_at: new Date().toISOString()
    })
    .eq('id', authData.user.id)

  if (profileError) {
    console.error('Error updating profile session:', profileError)
  }

  // Establecer cookie de dispositivo para validación en middleware
  cookieStore.set('device-id', deviceId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7 // 1 semana
  })

  // Validar esquema de sesión (opcional pero solicitado)
  try {
    SessionUsuarioSchema.parse({
      userId: authData.user.id,
      deviceId,
      lastActive: new Date(),
      sessionToken: authData.session?.access_token || 'dummy'
    })
  } catch (zodError) {
    console.error('Zod session validation failed:', zodError)
  }

  // Login exitoso - refrescar cache y redirigir al dashboard
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

/**
 * Server Action para cerrar sesión
 */
export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}

