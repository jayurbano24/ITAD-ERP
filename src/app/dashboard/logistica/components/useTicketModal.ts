import { useCallback, useState } from 'react'
import type { TicketData } from '../types/modal'

export function useTicketModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [ticketData, setTicketData] = useState<TicketData | null>(null)

  const open = useCallback((ticket: TicketData) => {
    setTicketData(ticket)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    setTicketData(null)
  }, [])

  return { isOpen, ticketData, open, close }
}
