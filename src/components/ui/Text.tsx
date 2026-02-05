import { cn } from '@/lib/utils'

type TextVariant =
    | 'h1'
    | 'h2'
    | 'h3'
    | 'body'
    | 'secondary'
    | 'tertiary'
    | 'label'
    | 'muted'

interface TextProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: TextVariant
    as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'label'
}

export function Text({
    variant = 'body',
    as: Component = 'span',
    className,
    children,
    ...props
}: TextProps) {
    const variants: Record<TextVariant, string> = {
        h1: 'text-2xl font-bold text-gray-900 dark:text-white',
        h2: 'text-xl font-semibold text-gray-900 dark:text-white',
        h3: 'text-lg font-semibold text-gray-900 dark:text-white',
        body: 'text-sm text-gray-900 dark:text-gray-200',
        secondary: 'text-sm text-gray-700 dark:text-gray-300',
        tertiary: 'text-sm text-gray-600 dark:text-gray-400',
        label: 'text-xs uppercase font-semibold tracking-wider text-gray-700 dark:text-gray-300',
        muted: 'text-xs text-gray-600 dark:text-gray-400'
    }

    return (
        <Component className={cn(variants[variant], className)} {...props}>
            {children}
        </Component>
    )
}
