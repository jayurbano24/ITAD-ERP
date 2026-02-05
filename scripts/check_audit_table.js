
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

async function checkTable() {
    console.log('Verificando tabla audit_logs...');

    // Intentar seleccionar 1 registro
    const { data, error, count } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .limit(1);

    if (error) {
        console.error('Error al consultar audit_logs:', error.message);
        if (error.code === '42P01') {
            console.log('CONCLUSIÓN: La tabla audit_logs NO existe.');
        }
    } else {
        console.log('La tabla audit_logs EXISTE.');
        console.log(`Registros encontrados: ${count}`);
        if (data && data.length > 0) {
            console.log('Ejemplo de registro:', data[0]);
        } else {
            console.log('La tabla está vacía.');
        }
    }
}

checkTable();
