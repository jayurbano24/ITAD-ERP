
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

async function checkColumns() {
    console.log('Probando consulta con columnas wipe_status y wiped_at...');
    const { data, error } = await supabase
        .from('assets')
        .select('id, wipe_status, wiped_at')
        .limit(1);

    if (error) {
        console.error('Error en la consulta:', error.message);

        console.log('Probando consulta SIN columnas wipe_status y wiped_at...');
        const { data: data2, error: error2 } = await supabase
            .from('assets')
            .select('id, status')
            .limit(1);

        if (error2) console.error('Error incluso sin columnas nuevas:', error2.message);
        else console.log('Consulta básica funciona ok.');

    } else {
        console.log('Consulta exitosa. Las columnas existen.');
    }
}

checkColumns();
