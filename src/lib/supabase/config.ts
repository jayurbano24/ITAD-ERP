/**
 * Configuración de Supabase
 * Las variables se cargan desde .env.local o se usan los valores por defecto
 */

export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lgtpleuvpaohrrgdkkkx.supabase.co',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxndHBsZXV2cGFvaHJyZ2Rra2t4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0MTg0NDcsImV4cCI6MjEwODk5NDQ0N30.8HmA9amCcfLnNoxlllamkD-tHAFJVZ8OwIe92f3ycc0',
}

// Validar que tengamos configuración válida
if (!supabaseConfig.url || !supabaseConfig.anonKey) {
  console.error('⚠️ Supabase configuration is missing')
}

