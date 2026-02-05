import React from 'react'
import { X, Package } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = '2xl'
}) => {
  if (!isOpen) return null

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl'
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Overlay con blur */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleBackdropClick}
      />

      {/* Contenido del modal */}
      <div className={`relative w-full mx-4 ${maxWidthClasses[maxWidth]} bg-[#0a0e1a] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200`}>
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-gray-800">
            {title && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <Package className="w-5 h-5 text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold text-white">{title}</h2>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

export default Modal
