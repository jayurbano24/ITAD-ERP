import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Configuración de Supabase para middleware (no puede importar desde ./lib)
const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lnuduhpsmdqjwyhhirba.supabase.co',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxudWR1aHBzbWRxand5aGhpcmJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MDY0MTEsImV4cCI6MjA4MDI4MjQxMX0.JHAB4y8_5v8dfzQ7HyVAULTq6kyvVH9WF2Gxhx6pSd4',
}

/**
 * Middleware para manejar la autenticación de Supabase
 * Refresca tokens expirados automáticamente
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    supabaseConfig.url,
    supabaseConfig.anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refrescar sesión si existe
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Rutas protegidas - redirigir a login si no hay usuario
  const protectedRoutes = ['/dashboard', '/inventory', '/tickets', '/admin']
  const isProtectedRoute = protectedRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  if (user && isProtectedRoute) {
    // 1. CONTROL DE SESIÓN ÚNICA (PC vs PC)
    const deviceId = request.cookies.get('device-id')?.value

    // Obtener perfil para verificar deviceId y rol
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_device_id, role')
      .eq('id', user.id)
      .single()

    if (profile) {
      // Si el deviceId en la sesión actual no coincide con el de la DB, invalidar
      if (profile.current_device_id && profile.current_device_id !== deviceId) {
        console.warn(`Sesión invalidada para el usuario ${user.id}: ID de dispositivo no coincide.`)

        // Forzar logout
        await supabase.auth.signOut()

        const url = request.nextUrl.clone()
        url.pathname = '/'
        url.searchParams.set('error', 'SessionInvalidated')
        url.searchParams.set('message', 'Tu cuenta ha iniciado sesión en otro dispositivo.')
        const response = NextResponse.redirect(url)
        response.cookies.delete('device-id')
        return response
      }

      // 2. PROTECCIÓN POR ROLES (RBAC)
      // Ejemplo: Solo super_admin y logistics pueden entrar a /dashboard/configuracion
      if (request.nextUrl.pathname.startsWith('/dashboard/configuracion') &&
        profile.role !== 'super_admin') {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }
  }

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match solo rutas de la aplicación, no archivos estáticos
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

