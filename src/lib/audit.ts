import { createClient } from '@/lib/supabase/server';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'COMMENT' | 'MOVE' | 'LOGIN' | 'LOGOUT';
export type AuditModule = 'AUTH' | 'TICKETS' | 'LOGISTICS' | 'RECEPTION' | 'WAREHOUSE' | 'WORKSHOP' | 'FINANCE' | 'SYSTEM';
export type EntityType = 'TICKET' | 'BATCH' | 'ASSET' | 'USER' | 'SETTLEMENT' | 'WORK_ORDER';

interface CreateAuditLogParams {
    action: AuditAction;
    module: AuditModule;
    description: string;
    entityType?: EntityType;
    entityId?: string;
    entityReference?: string;
    changes_summary?: Record<string, { old: any; new: any }>;
    batchId?: string;
    ticketId?: string;
    assetId?: string;
    workOrderId?: string;
    userInfo?: {
        id: string;
        email?: string;
        fullName?: string;
        role?: string;
    };
}

export async function createAuditLog(params: CreateAuditLogParams) {
    try {
        const supabase = await createClient();

        let userId = params.userInfo?.id;
        let userEmail = params.userInfo?.email;
        let userName = params.userInfo?.fullName;
        let userRole = params.userInfo?.role || 'user';

        // Si no se proporcionó info de usuario, intentamos obtenerla de la sesión actual
        if (!userId) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                userId = user.id;
                userEmail = user.email;
                userName = user.user_metadata?.full_name || user.email;
                userRole = user.user_metadata?.role || 'user';
            } else {
                console.warn('Intento de crear log de auditoría sin usuario autenticado');
            }
        }

        const logData = {
            action: params.action,
            module: params.module,
            description: params.description,
            entity_type: params.entityType,
            entity_id: params.entityId,
            entity_reference: params.entityReference,
            user_id: userId,
            user_email: userEmail,
            user_name: userName,
            user_role: userRole,
            changes_summary: params.changes_summary,
            batch_id: params.batchId,
            ticket_id: params.ticketId,
            asset_id: params.assetId,
            work_order_id: params.workOrderId
        };

        const { error } = await supabase.from('audit_logs').insert(logData);

        if (error) {
            console.error('CRITICAL AUDIT ERROR:', error);
            console.error('Failed Log Data:', JSON.stringify(logData, null, 2));
        }
    } catch (err) {
        console.error('Excepción al crear log de auditoría:', err);
    }
}
