#!/usr/bin/env node

/**
 * Validation Script: Certification System Integration
 * Verifica que todos los componentes de certificación estén correctamente configurados
 */

import fs from 'fs';
import path from 'path';

const checkResults = [];

function check(name, passed, details = '') {
  const status = passed ? '✅' : '❌';
  console.log(`${status} ${name}`);
  if (details) console.log(`   └─ ${details}`);
  checkResults.push({ name, passed, details });
}

function checkFileExists(filePath, description) {
  const exists = fs.existsSync(filePath);
  check(`${description} exists`, exists, filePath);
  return exists;
}

function checkFileContains(filePath, pattern, description) {
  if (!fs.existsSync(filePath)) {
    check(description, false, `File not found: ${filePath}`);
    return false;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const found = content.includes(pattern);
  check(description, found, `Pattern: "${pattern.substring(0, 50)}..."`);
  return found;
}

function checkFileNotContains(filePath, pattern, description) {
  if (!fs.existsSync(filePath)) {
    check(description, false, `File not found: ${filePath}`);
    return false;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const notFound = !content.includes(pattern);
  check(description, notFound, `Pattern should not exist: "${pattern.substring(0, 50)}..."`);
  return notFound;
}

console.log('\n🔍 VALIDACIÓN: Sistema de Certificación de Borrado\n');
console.log('═'.repeat(60));

// 1. Verificar que el componente CertificationModal existe
console.log('\n📋 Componentes React:');
checkFileExists(
  'src/app/dashboard/borrado/components/CertificationModal.tsx',
  'CertificationModal component'
);

// 2. Verificar que CertificationModal no importa uploadWipeEvidence
console.log('\n🔄 Importaciones (Server Actions removidas):');
checkFileNotContains(
  'src/app/dashboard/borrado/components/CertificationModal.tsx',
  'uploadWipeEvidence',
  'uploadWipeEvidence import removed'
);

// 3. Verificar que CertificationModal usa fetch con FormData
console.log('\n📡 API Calls (migracion completada):');
checkFileContains(
  'src/app/dashboard/borrado/components/CertificationModal.tsx',
  "fetch('/api/wipe/upload-evidence'",
  'Using fetch to /api/wipe/upload-evidence endpoint'
);

checkFileContains(
  'src/app/dashboard/borrado/components/CertificationModal.tsx',
  'formData.append',
  'Using FormData for file uploads'
);

// 4. Verificar que el endpoint API existe
console.log('\n🛣️ Endpoints API:');
checkFileExists(
  'src/app/api/wipe/upload-evidence/route.ts',
  'Upload evidence API route'
);

// 5. Verificar contenido del endpoint
console.log('\n🔧 Validaciones del Endpoint:');
checkFileContains(
  'src/app/api/wipe/upload-evidence/route.ts',
  'supabase.storage.from(bucket).upload',
  'Endpoint uploads to Supabase Storage'
);

checkFileContains(
  'src/app/api/wipe/upload-evidence/route.ts',
  'asset_wipe_evidence',
  'Endpoint stores metadata in database'
);

checkFileContains(
  'src/app/api/wipe/upload-evidence/route.ts',
  "maxPhotoSize = 6 * 1024 * 1024",
  'Photo size limit validation (6 MB)'
);

// 6. Verificar otras rutas API existentes
console.log('\n🛣️ Rutas API Relacionadas:');
checkFileExists(
  'src/app/api/wipe/certify/route.ts',
  'Certify asset endpoint'
);

checkFileExists(
  'src/app/api/wipe/evidence/route.ts',
  'Evidence retrieval endpoint'
);

// 7. Verificar componentes de evidencia
console.log('\n📸 Componentes de Evidencia:');
checkFileExists(
  'src/app/dashboard/borrado/components/EvidenceViewer.tsx',
  'Evidence Viewer component'
);

checkFileExists(
  'src/app/dashboard/borrado/evidencias/page.tsx',
  'Evidence gallery page'
);

// 8. Verificar base de datos
console.log('\n🗄️ Estructura de Base de Datos:');
const migrationDir = 'supabase/migrations';
const hasEvidenceTable = fs.readdirSync(migrationDir).some(file => 
  file.includes('wipe') || file.includes('evidence')
);
check('Wipe/Evidence migrations exist', hasEvidenceTable, migrationDir);

// 9. Verificar documentación
console.log('\n📚 Documentación:');
checkFileExists(
  'docs/certification-test-guide.md',
  'Certification testing guide'
);

checkFileExists(
  'docs/migration-server-actions-to-api.md',
  'Migration documentation'
);

// 10. Resumen
console.log('\n' + '═'.repeat(60));
console.log('\n📊 RESUMEN:');

const passed = checkResults.filter(r => r.passed).length;
const total = checkResults.length;
const percentage = Math.round((passed / total) * 100);

console.log(`   Verificaciones pasadas: ${passed}/${total} (${percentage}%)`);

if (percentage === 100) {
  console.log('\n✅ ¡VALIDACIÓN EXITOSA! Todos los componentes están correctamente integrados.');
  console.log('\n📝 Próximos pasos:');
  console.log('   1. Ejecuta la aplicación: npm run dev');
  console.log('   2. Abre http://localhost:3000/dashboard/borrado');
  console.log('   3. Selecciona un activo y haz clic en "Certificar"');
  console.log('   4. Sube 2-3 fotos y completa la certificación');
  console.log('   5. Verifica las fotos en /dashboard/borrado/evidencias');
} else if (percentage >= 80) {
  console.log('\n⚠️ VALIDACIÓN PARCIAL: Algunos componentes podrían necesitar revisión.');
} else {
  console.log('\n❌ VALIDACIÓN FALLIDA: Por favor revisa los items marcados con ❌');
  process.exit(1);
}

console.log('\n');
