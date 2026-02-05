'use client'

import { useEffect, useState, useCallback } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading'

export interface ToastProps {
    id: string
    type?: ToastType
    title: string
    message?: string
    duration?: number
    onClose: (id: string) => void
    action?: {
        label: string
        onClick: () => void
    }
}

const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
    loading: Loader2
}

const styles = {
    success: 'bg-[#1a1b2e] border-emerald-500/50 text-emerald-50',
    error: 'bg-[#1a1b2e] border-rose-500/50 text-rose-50',
    warning: 'bg-[#1a1b2e] border-amber-500/50 text-amber-50',
    info: 'bg-[#1a1b2e] border-blue-500/50 text-blue-50',
    loading: 'bg-[#1a1b2e] border-indigo-500/50 text-indigo-50'
}

const iconStyles = {
    success: 'text-emerald-400',
    error: 'text-rose-400',
    warning: 'text-amber-400',
    info: 'text-blue-400',
    loading: 'text-indigo-400 animate-spin'
}

export function Toast({ id, type = 'info', title, message, duration = 4000, onClose, action }: ToastProps) {
    const [isVisible, setIsVisible] = useState(false)
    const [isRemoving, setIsRemoving] = useState(false)

    const Icon = icons[type]


    const handleClose = useCallback(() => {
        setIsVisible(false)
        setIsRemoving(true)
        setTimeout(() => {
            onClose(id)
        }, 300) // Match transition duration
    }, [id, onClose])

    useEffect(() => {
        // Animation In
        requestAnimationFrame(() => setIsVisible(true))

        // Auto Dismiss
        if (duration > 0 && type !== 'loading') {
            const timer = setTimeout(() => {
                handleClose()
            }, duration)
            return () => clearTimeout(timer)
        }
    }, [duration, type, handleClose])

    return (
        <div
            className={cn(
                'relative flex items-start gap-3 w-full max-w-sm rounded-xl border p-4 shadow-xl shadow-black/20 backdrop-blur-md transition-all duration-300 ease-out transform translate-x-0',
                styles[type],
                isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95',
                isRemoving && 'opacity-0 translate-x-full'
            )}
            role="alert"
        >
            <div className="shrink-0 pt-0.5">
                <Icon className={cn('w-5 h-5', iconStyles[type])} />
            </div>

            <div className="flex-1 space-y-1">
                <h3 className="font-semibold text-sm leading-none tracking-tight">{title}</h3>
                {message && <p className="text-xs opacity-90 leading-relaxed font-light">{message}</p>}

                {action && (
                    <button
                        onClick={action.onClick}
                        className="mt-2 text-xs font-bold underline underline-offset-2 hover:opacity-80 transition-opacity"
                    >
                        {action.label}
                    </button>
                )}
            </div>

            <button
                onClick={handleClose}
                className="shrink-0 text-white/40 hover:text-white transition-colors"
            >
                <X className="w-4 h-4" />
            </button>

            {/* Progress Bar for Auto Dismiss */}
            {duration > 0 && type !== 'loading' && (
                <div className="absolute bottom-0 left-0 h-1 bg-white/10 w-full overflow-hidden rounded-b-xl">
                    <div
                        className="h-full bg-white/20 origin-left animate-progress"
                        style={{ animationDuration: `${duration}ms` }}
                    />
                </div>
            )}
        </div>
    )
}
