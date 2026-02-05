import { AppPermission, AppRole, RolePermissions } from './schemas'

/**
 * Verifica si un rol tiene un permiso específico
 */
export function hasPermission(role: AppRole | string, permission: AppPermission): boolean {
    const permissions = RolePermissions[role as AppRole] || []
    return permissions.includes(permission)
}

/**
 * Filtra un objeto basado en permisos (para restringir celdas/totales)
 * Si el usuario no tiene el permiso, el valor se reemplaza por un placeholder
 */
export function filterdataByPermission<T>(
    data: T,
    permission: AppPermission,
    userRole: AppRole | string,
    fallbackValue: any = '***'
): T | any {
    if (hasPermission(userRole, permission)) {
        return data
    }
    return fallbackValue
}
