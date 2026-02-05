import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> { }

export function SearchInput({ className, ...props }: SearchInputProps) {
    return (
        <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" />
            <input
                {...props}
                className={cn(
                    "w-full pl-10 pr-4 py-2.5 rounded-xl transition-all outline-none",
                    "bg-white dark:bg-surface-900",
                    "border border-gray-200 dark:border-surface-800",
                    "text-gray-900 dark:text-white",
                    "placeholder-gray-500 dark:placeholder-gray-500",
                    "focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500",
                    className
                )}
            />
        </div>
    )
}
