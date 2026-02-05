
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

// Usar Service Role Key para asegurar escritura administrativa
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function forceInsertAudit() {
    console.log('Insertando log de auditoría manual para OS-109...');

    // Buscar UUID de la OS-109 si es posible, o hardcodear si es necesario.
    // Primero buscamos la orden.
    const { data: wo, error: woError } = await supabase
        .from('work_orders')
        .select('id, work_order_number')
        .ilike('work_order_number', '%109%')
        .limit(1)
        .single();

    if (woError || !wo) {
        console.error('No se encontró la OS-109:', woError);
        return;
    }

    const logData = {
        action: 'STATUS_CHANGE',
        module: 'WORKSHOP',
        entity_type: 'WORK_ORDER',
        entity_id: wo.id,
        entity_reference: wo.work_order_number,
        description: `OS #${wo.work_order_number}: Enviada a Control de Calidad (Software - Actualización de Softwares) [Recuperado]`,
        user_name: 'System Admin (Recovered)', // Indicamos que fue recuperado
        created_at: new Date().toISOString(),
        changes_summary: {
            status: { old: 'in_progress', new: 'qc_pending' },
            repair_mode: { old: null, new: 'Software' }
        }
    };

    const { error } = await supabase.from('audit_logs').insert(logData);

    if (error) {
        console.error('Error insertando log:', error);
    } else {
        console.log('¡Log insertado exitosamente! Verifica en el dashboard.');
    }
}

forceInsertAudit();
