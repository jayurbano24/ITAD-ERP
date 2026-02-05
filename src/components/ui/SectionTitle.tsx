import { cn } from '@/lib/utils'

interface SectionTitleProps {
    title: string
    subtitle?: string
    className?: string
}

export function SectionTitle({ title, subtitle, className }: SectionTitleProps) {
    return (
        <div className={cn("mb-6", className)}>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {title}
            </h2>
            {subtitle && (
                <p className="text-sm text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    {subtitle}
                </p>
            )}
        </div>
    )
}
