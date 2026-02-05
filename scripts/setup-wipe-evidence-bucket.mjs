#!/usr/bin/env node

// ESM-compatible setup script to create the 'wipe-evidence' bucket in Supabase Storage
// Usage (PowerShell on Windows):
//   Set-Location "C:\Users\Usuario01\ITAD-ERP-GUATEMALA"
//   $env:NEXT_PUBLIC_SUPABASE_URL = "https://<your-project>.supabase.co"
//   $env:SUPABASE_SERVICE_ROLE_KEY = "<your-service-role-key>"
//   node scripts\setup-wipe-evidence-bucket.mjs

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERROR: Variables de entorno no configuradas')
  console.error('Configura NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY antes de ejecutar.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  try {
    console.log('🔧 Creando bucket "wipe-evidence" (público)...')
    const { error: createError } = await supabase.storage.createBucket('wipe-evidence', {
      public: true,
      fileSizeLimit: 52428800 // 50MB
    })

    if (createError) {
      if (createError.message && /exists/i.test(createError.message)) {
        console.log('✓ El bucket ya existe')
      } else {
        console.error('❌ Error creando el bucket:', createError.message)
        process.exit(1)
      }
    } else {
      console.log('✓ Bucket creado exitosamente')
    }

    console.log('🔎 Verificando buckets...')
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    if (listError) {
      console.error('❌ Error listando buckets:', listError.message)
      process.exit(1)
    }
    const found = buckets?.find(b => b.name === 'wipe-evidence')
    if (!found) {
      console.error('❌ No se encontró el bucket wipe-evidence después de crearlo')
      process.exit(1)
    }
    console.log(`✓ Bucket encontrado. Public: ${found.public}`)

    console.log('\n✅ Setup completado. Ahora reinicia tu servidor y prueba la carga de fotos.')
  } catch (e) {
    console.error('❌ Error inesperado:', e?.message || e)
    process.exit(1)
  }
}

await main()
