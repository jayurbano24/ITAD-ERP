
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Mockear variables de entorno
try {
    const envPath = path.resolve(__dirname, '../.env.local');
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) process.env[parts[0].trim()] = parts.slice(1).join('=').trim();
    });
} catch (e) { }

// Es difícil importar actions.ts directamente porque usa 'use server' y módulos de Next.js
// Así que voy a replicar la consulta específica que me interesa
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testQuery() {
    // 1. Obtener algunos assets (los mismos que mostré en el diagnóstico anterior)
    const { data: assets } = await supabase
        .from('assets')
        .select('id')
        .in('status', ['received', 'wiped', 'wiping', 'diagnosing', 'ready_for_sale'])
        .limit(20);

    const assetIds = assets.map(a => a.id);
    console.log('Asset IDs:', assetIds.length);

    // 2. Ejecutar la consulta de cajas
    if (assetIds.length > 0) {
        const { data: ticketItems, error: tiError } = await supabase
            .from('ticket_items')
            .select('asset_id, box_number')
            .in('asset_id', assetIds)

        console.log('Error:', tiError);
        console.log('Ticket Items:', ticketItems);
    }
}

testQuery();
