
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Cargar variables de entorno manualmente
try {
    const envPath = path.resolve(__dirname, '../.env.local');
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim();
            if (key && !key.startsWith('#')) {
                process.env[key] = value;
            }
        }
    });
} catch (e) {
    console.error('Error loading .env.local:', e.message);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Faltan variables de entorno (NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY)');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    const ticketCode = 'TK-2026-00003';
    console.log(`Diagnosticando ticket ${ticketCode}...`);

    // 1. Obtener el ticket
    const { data: ticket, error: ticketError } = await supabase
        .from('operations_tickets')
        .select('*')
        .eq('readable_id', ticketCode)
        .single();

    if (ticketError) {
        console.error('Error buscando ticket:', ticketError);
        return;
    }

    if (!ticket) {
        console.error('Ticket no encontrado');
        return;
    }

    // 2. Obtener items del ticket
    const { data: items, error: itemsError } = await supabase
        .from('ticket_items')
        .select('*')
        .eq('ticket_id', ticket.id);

    if (itemsError) {
        console.error('Error buscando items:', itemsError);
    }

    const summary = {
        ticket: {
            id: ticket.id,
            readable_id: ticket.readable_id,
            expected_units: ticket.expected_units,
            received_units: ticket.received_units,
            status: ticket.status
        },
        items: {
            count: items?.length || 0,
            totalQuantity: items?.reduce((sum, item) => sum + (item.expected_quantity || 0), 0) || 0,
            list: items?.map(i => ({ qty: i.expected_quantity, received: i.received_quantity, status: i.status })) || []
        },
        assets: {
            count: 0,
            list: []
        }
    };

    const { data: batches } = await supabase.from('batches').select('id').eq('ticket_id', ticket.id);
    const batchIds = batches?.map(b => b.id) || [];

    if (batchIds.length > 0) {
        const { data: assets } = await supabase.from('assets').select('internal_tag, status').in('batch_id', batchIds);
        summary.assets.count = assets?.length || 0;
        summary.assets.list = assets || [];
    }

    fs.writeFileSync('diagnose_summary.json', JSON.stringify(summary, null, 2));
    console.log('Resumen guardado en diagnose_summary.json');
}

diagnose();
