import { AlertCircle, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InfoMessageProps {
    children: React.ReactNode
    icon?: LucideIcon
    className?: string
}

export function InfoMessage({ children, icon: Icon = AlertCircle, className }: InfoMessageProps) {
    return (
        <div className={cn("flex items-start gap-3 p-4 bg-gray-50 dark:bg-surface-900 border border-gray-200 dark:border-surface-800 rounded-2xl", className)}>
            <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                {children}
            </p>
        </div>
    )
}
