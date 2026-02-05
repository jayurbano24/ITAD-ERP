import { createClient } from '@/lib/supabase/server'
import { AuditActionType, AuditModuleType, AuditEntityType } from '@/lib/types/audit'

export interface AuditConfig {
    module: string;
    entityType: string;
    entityId: string;
    entityReference?: string;
    userId?: string;
}

export class AuditService {
    /**
     * Registers a general action in the audit log.
     */
    static async registrar(datos: {
        action: string;
        module: string;
        description: string;
        entityType: string;
        entityId: string;
        entityReference?: string;
        dataBefore?: any;
        dataAfter?: any;
        changesSummary?: any;
        additionalData?: any;
    }, request?: Request) {
        try {
            const supabase = await createClient()

            // Extract metadata from request if provided
            let ipAddress = null
            let userAgent = null

            if (request) {
                userAgent = request.headers.get('user-agent')
                // Basic IP extraction
                ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
            }

            const { data, error } = await supabase.rpc('log_audit_event', {
                p_action: datos.action,
                p_module: datos.module,
                p_description: datos.description,
                p_entity_type: datos.entityType,
                p_entity_id: datos.entityId,
                p_entity_reference: datos.entityReference,
                p_data_before: datos.dataBefore,
                p_data_after: datos.dataAfter,
                p_changes_summary: datos.changesSummary,
                p_ip_address: ipAddress,
                p_user_agent: userAgent,
                p_additional_data: datos.additionalData,
                p_http_method: request?.method,
                p_endpoint: request?.url
            })

            if (error) console.error('Audit Log Error:', error)
            return data
        } catch (error) {
            console.error('AuditService Error:', error)
        }
    }

    /**
     * Automatically compares two objects and logs renamed/changed fields.
     */
    static async registrarCambios(
        objetoAnterior: any,
        objetoNuevo: any,
        config: AuditConfig,
        request?: Request
    ) {
        const changes: Record<string, { old: any; new: any }> = {}
        let description = `Actualización de ${config.entityType}`

        // Simple diffing logic
        const keys = new Set([...Object.keys(objetoAnterior), ...Object.keys(objetoNuevo)])

        for (const key of Array.from(keys)) {
            if (key === 'updated_at' || key === 'created_at') continue

            if (JSON.stringify(objetoAnterior[key]) !== JSON.stringify(objetoNuevo[key])) {
                changes[key] = {
                    old: objetoAnterior[key],
                    new: objetoNuevo[key]
                }
            }
        }

        if (Object.keys(changes).length === 0) return

        return this.registrar({
            action: 'UPDATE',
            module: config.module,
            description,
            entityType: config.entityType,
            entityId: config.entityId,
            entityReference: config.entityReference,
            dataBefore: objetoAnterior,
            dataAfter: objetoNuevo,
            changesSummary: changes
        }, request)
    }
}
