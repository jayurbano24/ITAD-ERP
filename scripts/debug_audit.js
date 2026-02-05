
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

async function checkLogs() {
    console.log('Consultando últimos 10 logs de auditoría...');

    const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Encontrados ${data.length} logs recientes:`);
    data.forEach(log => {
        console.log(`[${log.created_at}] ${log.module} - ${log.action} | Ref: ${log.entity_reference} | Desc: ${log.description}`);
    });
}

checkLogs();
