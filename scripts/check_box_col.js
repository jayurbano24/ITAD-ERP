
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

async function checkColumn() {
    const { data, error } = await supabase
        .from('assets')
        .select('box_number') // Intentar seleccionar explícitamente box_number
        .limit(1);

    if (error) {
        console.log('Error seleccionando box_number de assets:', error.message);
    } else {
        console.log('Columna box_number existe en assets. Data:', data);
    }
}

checkColumn();
