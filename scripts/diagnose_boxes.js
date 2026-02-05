
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

async function checkLink() {
    const ticketCode = process.argv[2] || 'TK-2026-00003';

    // 1. Obtener ticket id
    const { data: ticket } = await supabase.from('operations_tickets').select('id').eq('readable_id', ticketCode).single();

    if (!ticket) {
        console.log('Ticket no encontrado');
        return;
    }

    console.log('Ticket ID:', ticket.id);

    // 2. Ver items del ticket
    const { data: items } = await supabase
        .from('ticket_items')
        .select('id, asset_id, box_number, status, brand_id, model_id, product_type_id, brand_full, model_full, product_type, collected_serial')
        .eq('ticket_id', ticket.id);

    const result = {
        ticketId: ticket.id,
        ticketCode,
        items: items.map(i => ({
            id: i.id,
            asset_id: i.asset_id,
            box_number: i.box_number,
            status: i.status,
            brand_id: i.brand_id,
            model_id: i.model_id,
            product_type_id: i.product_type_id,
            brand_full: i.brand_full,
            model_full: i.model_full,
            product_type: i.product_type,
            collected_serial: i.collected_serial
        })),
        batches: [],
        assetsInBatch: []
    };

    const { data: batches } = await supabase.from('batches').select('id, status, created_at').eq('ticket_id', ticket.id);
    const batchIds = (batches || []).map(b => b.id);
    result.batches = batches || [];

    if (batchIds.length > 0) {
        const { data: assets } = await supabase
            .from('assets')
            .select('id, internal_tag, serial_number, status, current_warehouse_id, batch_id, manufacturer, model, asset_type')
            .in('batch_id', batchIds);
        result.assetsInBatch = assets || [];
    }

    fs.writeFileSync('diagnose_boxes.json', JSON.stringify(result, null, 2));
    console.log('Done');
}

checkLink();
