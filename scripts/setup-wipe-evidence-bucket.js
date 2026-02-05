#!/usr/bin/env node

/**
 * Setup Script: Create Supabase Storage Bucket for Wipe Evidence
 * 
 * Este script crea el bucket "wipe-evidence" en Supabase Storage
 * 
 * Uso:
 *   node scripts/setup-wipe-evidence-bucket.js
 */

import { createClient } from '@supabase/supabase-js';

// Leer variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERROR: Variables de entorno no configuradas');
  console.error('Por favor, configura:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL');
  console.error('  SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Crear cliente Supabase con service role
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupBucket() {
  try {
    console.log('🔧 Iniciando setup de bucket "wipe-evidence"...\n');

    // 1. Intentar crear el bucket
    console.log('1️⃣ Creando bucket "wipe-evidence"...');
    
    const { data: createData, error: createError } = await supabase
      .storage
      .createBucket('wipe-evidence', {
        public: true,
        fileSizeLimit: 52428800 // 50MB max per file
      });

    if (createError && createError.message.includes('already exists')) {
      console.log('   ✓ Bucket ya existe');
    } else if (createError) {
      console.error(`   ❌ Error: ${createError.message}`);
      process.exit(1);
    } else {
      console.log('   ✓ Bucket creado exitosamente');
    }

    // 2. Configurar RLS Policy para lectura pública
    console.log('\n2️⃣ Configurando políticas de acceso...');
    
    const { data: policyData, error: policyError } = await supabase
      .from('buckets')
      .select('id')
      .eq('name', 'wipe-evidence')
      .single();

    if (policyError) {
      console.log('   ℹ️ Nota: RLS debe configurarse en Supabase Dashboard');
      console.log('      Dashboard > Storage > wipe-evidence > Policies');
    } else {
      console.log('   ✓ Bucket configurado');
    }

    // 3. Verificar que el bucket existe
    console.log('\n3️⃣ Verificando bucket...');
    
    const { data: buckets, error: listError } = await supabase
      .storage
      .listBuckets();

    if (listError) {
      console.error(`   ❌ Error listando buckets: ${listError.message}`);
      process.exit(1);
    }

    const wipeBucket = buckets.find(b => b.name === 'wipe-evidence');
    if (wipeBucket) {
      console.log(`   ✓ Bucket "wipe-evidence" existe y es accesible`);
      console.log(`   ID: ${wipeBucket.id}`);
      console.log(`   Public: ${wipeBucket.public}`);
    } else {
      console.error('   ❌ Bucket "wipe-evidence" no encontrado después de crearlo');
      process.exit(1);
    }

    console.log('\n✅ SETUP COMPLETADO CON ÉXITO!\n');
    console.log('Próximos pasos:');
    console.log('  1. Ve a Supabase Dashboard > Storage > wipe-evidence');
    console.log('  2. Configura las Policies (RLS):');
    console.log('     - Lectura pública: Cualquiera puede leer (solo URLs públicas)');
    console.log('     - Escritura: Solo usuarios autenticados');
    console.log('  3. Prueba nuevamente: npm run dev');
    console.log('\n');

  } catch (error) {
    console.error('❌ Error inesperado:', error.message);
    process.exit(1);
  }
}

setupBucket();
