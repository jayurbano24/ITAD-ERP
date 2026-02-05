/**
 * Configuración de Supabase
 * Las variables se cargan desde .env.local o se usan los valores por defecto
 */

export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lnuduhpsmdqjwyhhirba.supabase.co',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxudWR1aHBzbWRxand5aGhpcmJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MDY0MTEsImV4cCI6MjA4MDI4MjQxMX0.JHAB4y8_5v8dfzQ7HyVAULTq6kyvVH9WF2Gxhx6pSd4',
}

// Validar que tengamos configuración válida
if (!supabaseConfig.url || !supabaseConfig.anonKey) {
  console.error('⚠️ Supabase configuration is missing')
}

