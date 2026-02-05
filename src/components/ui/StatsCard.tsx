import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StatsColor = 'blue' | 'orange' | 'purple' | 'green' | 'amber' | 'rose' | 'cyan'

interface StatsCardProps {
    icon: LucideIcon
    label: string
    value: string | number
    color?: StatsColor
    className?: string
}

const colorClasses: Record<StatsColor, { iconBg: string; iconColor: string }> = {
    blue: {
        iconBg: 'bg-blue-50 dark:bg-blue-500/10',
        iconColor: 'text-blue-600 dark:text-blue-400'
    },
    orange: {
        iconBg: 'bg-orange-50 dark:bg-orange-500/10',
        iconColor: 'text-orange-600 dark:text-orange-400'
    },
    purple: {
        iconBg: 'bg-purple-50 dark:bg-purple-500/10',
        iconColor: 'text-purple-600 dark:text-purple-400'
    },
    green: {
        iconBg: 'bg-emerald-50 dark:bg-emerald-500/10',
        iconColor: 'text-emerald-600 dark:text-emerald-400'
    },
    amber: {
        iconBg: 'bg-amber-50 dark:bg-amber-500/10',
        iconColor: 'text-amber-600 dark:text-amber-400'
    },
    rose: {
        iconBg: 'bg-rose-50 dark:bg-rose-500/10',
        iconColor: 'text-rose-600 dark:text-rose-400'
    },
    cyan: {
        iconBg: 'bg-cyan-50 dark:bg-cyan-500/10',
        iconColor: 'text-cyan-600 dark:text-cyan-400'
    }
}

export function StatsCard({ icon: Icon, label, value, color = 'blue', className }: StatsCardProps) {
    const colors = colorClasses[color]

    return (
        <div className={cn(
            "bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 transition-all shadow-sm dark:shadow-none hover:shadow-md dark:hover:border-gray-700",
            className
        )}>
            <div className="flex items-center gap-5">
                <div className={cn("p-4 rounded-2xl transition-colors", colors.iconBg)}>
                    <Icon className={cn("w-6 h-6", colors.iconColor)} />
                </div>
                <div>
                    <p className="text-[11px] uppercase tracking-[0.3em] font-bold text-gray-700 dark:text-gray-300 mb-1">
                        {label}
                    </p>
                    <p className="text-3xl font-black text-gray-900 dark:text-white leading-none">
                        {value}
                    </p>
                </div>
            </div>
        </div>
    )
}
