import { cn } from '@/lib/utils'

import { AppPermission, AppRole } from '@/lib/schemas'
import { hasPermission } from '@/lib/auth'

interface Column<T> {
    header: string
    key: string
    render?: (row: T) => React.ReactNode
    className?: string
    permission?: AppPermission // Permiso requerido para ver esta columna
}

interface DataTableProps<T> {
    columns: Column<T>[]
    data: T[]
    onRowClick?: (row: T) => void
    className?: string
    userRole?: AppRole | string // Rol del usuario actual
}

export function DataTable<T extends { id?: string | number }>({
    columns,
    data,
    onRowClick,
    className,
    userRole
}: DataTableProps<T>) {
    // Filtrar columnas por permiso
    const visibleColumns = columns.filter(col => {
        if (!col.permission) return true
        if (!userRole) return false
        return hasPermission(userRole as any, col.permission)
    })

    return (
        <div className={cn(
            "bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-800 rounded-[2.5rem] overflow-hidden transition-all shadow-sm dark:shadow-none",
            className
        )}>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800">
                            {visibleColumns.map((column, idx) => (
                                <th
                                    key={idx}
                                    className={cn(
                                        "px-6 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-gray-700 dark:text-gray-300",
                                        column.className
                                    )}
                                >
                                    {column.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {data.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={visibleColumns.length}
                                    className="px-6 py-12 text-center text-sm text-gray-700 dark:text-gray-300 italic"
                                >
                                    No se encontraron resultados.
                                </td>
                            </tr>
                        ) : (
                            data.map((row, rowIdx) => (
                                <tr
                                    key={row.id || rowIdx}
                                    onClick={() => onRowClick?.(row)}
                                    className={cn(
                                        "group transition-colors",
                                        onRowClick ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50" : ""
                                    )}
                                >
                                    {visibleColumns.map((column, colIdx) => (
                                        <td
                                            key={colIdx}
                                            className={cn(
                                                "px-6 py-4 text-sm text-gray-900 dark:text-gray-200",
                                                column.className
                                            )}
                                        >
                                            {column.render ? column.render(row) : (row as any)[column.key]}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
