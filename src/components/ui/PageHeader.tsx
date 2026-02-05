import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
    icon?: LucideIcon
    title: string
    subtitle?: string
    actions?: React.ReactNode
    className?: string
    variant?: 'default' | 'blue' | 'green' | 'purple' | 'orange'
}

export function PageHeader({ icon: Icon, title, subtitle, actions, className, variant = 'default' }: PageHeaderProps) {
    const variantStyles = {
        default: {
            iconBg: 'bg-brand-50 dark:bg-brand-500/10',
            iconColor: 'text-brand-600 dark:text-brand-400'
        },
        blue: {
            iconBg: 'bg-blue-50 dark:bg-blue-500/10',
            iconColor: 'text-blue-600 dark:text-blue-400'
        },
        green: {
            iconBg: 'bg-green-50 dark:bg-green-500/10',
            iconColor: 'text-green-600 dark:text-green-400'
        },
        purple: {
            iconBg: 'bg-purple-50 dark:bg-purple-500/10',
            iconColor: 'text-purple-600 dark:text-purple-400'
        },
        orange: {
            iconBg: 'bg-orange-50 dark:bg-orange-500/10',
            iconColor: 'text-orange-600 dark:text-orange-400'
        }
    }

    const styles = variantStyles[variant]

    return (
        <div className={cn(
            "bg-white dark:bg-surface-900 border-b border-gray-200 dark:border-surface-800 px-8 py-6 transition-colors shadow-sm dark:shadow-none",
            className
        )}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    {Icon && (
                        <div className={cn("p-3 rounded-2xl transition-colors", styles.iconBg)}>
                            <Icon className={cn("w-6 h-6", styles.iconColor)} />
                        </div>
                    )}
                    <div className="flex flex-col gap-1">
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>
                {actions && <div className="flex items-center gap-3">{actions}</div>}
            </div>
        </div>
    )
}
