'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { Toast, ToastType } from '@/components/ui/Toast'

type ToastMessage = {
    id: string
    type: ToastType
    title: string
    message?: string
    duration?: number
    action?: {
        label: string
        onClick: () => void
    }
}

interface ToastContextType {
    toast: {
        success: (title: string, message?: string, options?: Partial<ToastMessage>) => void
        error: (title: string, message?: string, options?: Partial<ToastMessage>) => void
        warning: (title: string, message?: string, options?: Partial<ToastMessage>) => void
        info: (title: string, message?: string, options?: Partial<ToastMessage>) => void
        loading: (title: string, message?: string, options?: Partial<ToastMessage>) => string
        dismiss: (id: string) => void
    }
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastMessage[]>([])

    const addToast = useCallback((type: ToastType, title: string, message?: string, options?: Partial<ToastMessage>) => {
        const id = Math.random().toString(36).substring(2, 9)
        const newToast: ToastMessage = {
            id,
            type,
            title,
            message,
            duration: type === 'error' ? 5000 : 3000, // Errors stay longer
            ...options
        }

        setToasts((prev) => [...prev, newToast])
        return id
    }, [])

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    // Helper functions exposed to hook
    const toastHelpers = {
        success: (title: string, message?: string, options?: Partial<ToastMessage>) => addToast('success', title, message, options),
        error: (title: string, message?: string, options?: Partial<ToastMessage>) => addToast('error', title, message, options),
        warning: (title: string, message?: string, options?: Partial<ToastMessage>) => addToast('warning', title, message, options),
        info: (title: string, message?: string, options?: Partial<ToastMessage>) => addToast('info', title, message, options),
        loading: (title: string, message?: string, options?: Partial<ToastMessage>) => addToast('loading', title, message, { duration: 0, ...options }),
        dismiss: removeToast
    }

    return (
        <ToastContext.Provider value={{ toast: toastHelpers }}>
            {children}

            {/* Toast Container */}
            <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
                <div className="flex flex-col gap-2 items-end pointer-events-auto">
                    {toasts.map((t) => (
                        <Toast
                            key={t.id}
                            {...t}
                            onClose={removeToast}
                        />
                    ))}
                </div>
            </div>
        </ToastContext.Provider>
    )
}

export function useToast() {
    const context = useContext(ToastContext)
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}
