import { cn } from '@/lib/utils'

export type BadgeVariant =
    | 'default'
    | 'completado'
    | 'en-proceso'
    | 'pendiente'
    | 'destruccion'
    | 'data-wipe'
    | 'auditoria'
    | 'itad-services'
    | 'cliente'
    | 'proveedor'
    | 'error'

interface BadgeProps {
    variant?: BadgeVariant
    children: React.ReactNode
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

export function Badge({ variant = 'default', children, size = 'md', className }: BadgeProps) {
    const variants: Record<BadgeVariant, string> = {
        'completado': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-300 dark:border-green-700/50',
        'en-proceso': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-300 dark:border-blue-700/50',
        'pendiente': 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 border-orange-300 dark:border-orange-700/50',
        'destruccion': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-300 dark:border-red-700/50',
        'data-wipe': 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-400 border-pink-300 dark:border-pink-700/50',
        'auditoria': 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 border-purple-300 dark:border-purple-700/50',
        'itad-services': 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-400 border-cyan-300 dark:border-cyan-700/50',
        'cliente': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-300 dark:border-blue-700/50',
        'proveedor': 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-700/50',
        'error': 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-400 border-rose-300 dark:border-rose-700/50',
        'default': 'bg-gray-100 dark:bg-surface-800 text-gray-800 dark:text-surface-200 border-gray-300 dark:border-surface-700'
    }

    const sizes = {
        'sm': 'px-2 py-0.5 text-[10px]',
        'md': 'px-2.5 py-1 text-xs',
        'lg': 'px-3 py-1.5 text-sm'
    }

    return (
        <span className={cn(
            "inline-flex items-center font-bold rounded-md border transition-colors",
            variants[variant],
            sizes[size],
            className
        )}>
            {children}
        </span>
    )
}
