export type AuditActionType =
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'STATUS_CHANGE'
    | 'ASSIGN'
    | 'MOVE'
    | 'TRANSFER'
    | 'LIQUIDATE'
    | 'COMMENT'
    | 'APPROVE'
    | 'REJECT'
    | 'DISPATCH'
    | 'RECEIVE'
    | 'CLASSIFY'
    | 'REPAIR'
    | 'EXPORT';

export type AuditModuleType =
    | 'TICKETS'
    | 'LOGISTICS'
    | 'RECEPTION'
    | 'WAREHOUSE'
    | 'WORKSHOP'
    | 'SALES'
    | 'FINANCE'
    | 'ADMIN'
    | 'CATALOG'
    | 'REPORTS';

export type AuditEntityType =
    | 'TICKET'
    | 'BATCH'
    | 'ASSET'
    | 'WORK_ORDER'
    | 'SALE'
    | 'INVOICE'
    | 'PAYMENT'
    | 'USER'
    | 'CLIENT';

export interface AuditLog {
    id: string;
    action: AuditActionType;
    module: AuditModuleType;
    description: string;
    user_id: string | null;
    user_name: string | null;
    user_email: string | null;
    user_role: string | null;
    entity_type: AuditEntityType;
    entity_id: string;
    entity_reference: string | null;
    ticket_id: string | null;
    batch_id: string | null;
    asset_id: string | null;
    data_before: any | null;
    data_after: any | null;
    changes_summary: Record<string, { old: any; new: any }> | null;
    ip_address: string | null;
    user_agent: string | null;
    session_id: string | null;
    http_method: string | null;
    endpoint: string | null;
    additional_data: any | null;
    created_at: string;
}

export interface AuditLogDetailed extends AuditLog {
    profile_name: string | null;
    profile_email: string | null;
    profile_role: string | null;
}
