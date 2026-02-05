
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

try {
    const envPath = path.resolve(__dirname, '../.env.local');
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) process.env[parts[0].trim()] = parts.slice(1).join('=').trim();
    });
} catch (e) { }

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testAuditInsert() {
    console.log('Intentando insertar log de auditoría de prueba...');

    const payload = {
        action: 'TEST',
        module: 'SYSTEM',
        description: 'Prueba manual de inserción de auditoría desde script',
        entity_type: 'SYSTEM',
        changes_summary: { test: { old: null, new: 'ok' } },
        created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('audit_logs')
        .insert(payload)
        .select();

    if (error) {
        console.error('ERROR al insertar:', error);
    } else {
        console.log('Inserción exitosa:', data);
    }
}

testAuditInsert();
