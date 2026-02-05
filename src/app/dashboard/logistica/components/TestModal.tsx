'use client'

import React from 'react'

interface TestModalProps {
  isOpen: boolean
  onClose: () => void
}

export const TestModal: React.FC<TestModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-2xl max-w-md">
        <h2 className="text-2xl font-bold mb-4">Test Modal</h2>
        <p className="mb-6 text-gray-700 dark:text-gray-300">Si ves esto, el modal está funcionando correctamente.</p>
        <button
          onClick={onClose}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}
