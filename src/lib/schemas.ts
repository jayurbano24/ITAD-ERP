import { z } from 'zod'

/**
 * Esquema para el control de Sesión Única por Dispositivo
 */
export const SessionUsuarioSchema = z.object({
    userId: z.string().uuid({ message: "ID de usuario inválido" }),
    deviceId: z.string().min(1, { message: "ID de dispositivo requerido" }),
    lastActive: z.date(),
    sessionToken: z.string().min(1, { message: "Token de sesión requerido" }),
})

export type SessionUsuario = z.infer<typeof SessionUsuarioSchema>

/**
 * Esquema para la Configuración Visual de Documentos PDF
 */
export const ConfiguracionVisualSchema = z.object({
    logo_url: z.string().url({ message: "URL de logo inválida" }).optional().or(z.literal('')),
    primary_color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, { message: "Color primario debe ser HEX" }).default('#22c55e'),
    secondary_color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, { message: "Color secundario debe ser HEX" }).default('#16a34a'),
    typography: z.string().default('Inter'),

    // Visibilidad de campos en PDF
    show_nit: z.boolean().default(true),
    show_signatures: z.boolean().default(true),
    show_phones: z.boolean().default(true),
    show_addresses: z.boolean().default(true),

    // Textos dinámicos
    legal_texts: z.string().optional().or(z.literal('')),
    footer_notes: z.string().optional().or(z.literal('')),
})

export type ConfiguracionVisual = z.infer<typeof ConfiguracionVisualSchema>

/**
 * RBAC: Permisos y Roles
 */
export const AppPermissionSchema = z.enum([
    'view_total_costs',
    'edit_inventory',
    'generate_pdf',
    'manage_users',
    'view_dashboard',
    'process_logistics',
    'manage_workshop'
])

export type AppPermission = z.infer<typeof AppPermissionSchema>

export const AppRoleSchema = z.enum([
    'super_admin',
    'logistics',
    'tech_lead',
    'technician',
    'sales_agent',
    'warehouse'
])

export type AppRole = z.infer<typeof AppRoleSchema>

/**
 * Mapa de permisos por rol
 */
export const RolePermissions: Record<AppRole, AppPermission[]> = {
    super_admin: [
        'view_total_costs',
        'edit_inventory',
        'generate_pdf',
        'manage_users',
        'view_dashboard',
        'process_logistics',
        'manage_workshop'
    ],
    logistics: [
        'generate_pdf',
        'view_dashboard',
        'process_logistics'
    ],
    tech_lead: [
        'generate_pdf',
        'view_dashboard',
        'manage_workshop',
        'edit_inventory'
    ],
    technician: [
        'view_dashboard',
        'manage_workshop'
    ],
    sales_agent: [
        'generate_pdf',
        'view_dashboard'
    ],
    warehouse: [
        'edit_inventory',
        'view_dashboard'
    ]
}

/**
 * Esquema para Activos de Bodega con protección de campos sensibles
 */
export const WarehouseAssetZod = z.object({
    id: z.string(),
    serial_number: z.string().nullable(),
    internal_tag: z.string(),
    manufacturer: z.string().nullable(),
    model: z.string().nullable(),
    asset_type: z.string().nullable(),
    color: z.string().nullable(),
    status: z.string(),
    condition_grade: z.string().nullable(),
    sales_price: z.number().nullable().optional(), // Campo sensible
})

/**
 * Función para limpiar datos sensibles antes de enviarlos al cliente
 */
export function sanitizeAssetData(data: any, role: AppRole | string): any {
    const permissions = RolePermissions[role as AppRole] || []
    const hasCostPermission = permissions.includes('view_total_costs')

    if (!hasCostPermission) {
        const { sales_price, ...rest } = data
        return rest
    }
    return data
}
