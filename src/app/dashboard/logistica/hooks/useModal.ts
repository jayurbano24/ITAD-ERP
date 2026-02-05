import { useState, useCallback } from 'react'

interface UseModalReturn<T = any> {
  isOpen: boolean
  data: T | null
  open: (data?: T) => void
  close: () => void
  toggle: () => void
}

export const useModal = <T = any>(): UseModalReturn<T> => {
  const [isOpen, setIsOpen] = useState(false)
  const [data, setData] = useState<T | null>(null)

  const open = useCallback((modalData?: T) => {
    if (modalData !== undefined) {
      setData(modalData)
    }
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    setData(null)
  }, [])

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  return {
    isOpen,
    data,
    open,
    close,
    toggle
  }
}

export default useModal
