import { cn } from '@/lib/utils'

interface FormLabelProps {
    children: React.ReactNode
    required?: boolean
    className?: string
}

export function FormLabel({ children, required, className }: FormLabelProps) {
    return (
        <label className={cn("block text-xs uppercase font-semibold text-gray-700 dark:text-gray-300 tracking-wider mb-2", className)}>
            {children}
            {required && <span className="text-red-600 ml-1">*</span>}
        </label>
    )
}
