import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export type TicketHistoryAction =
  | 'TICKET_CREATED'
  | 'TICKET_STATUS_CHANGED'
  | 'TICKET_UPDATED'

export interface TicketHistoryEntry {
  id: string
  ticket_id: string
  action: TicketHistoryAction
  description: string | null
  details: Record<string, unknown> | null
  performed_by: string | null
  performed_by_user?: {
    id: string
    full_name: string | null
    email: string | null
  }
  created_at: string
}

export interface LogTicketHistoryParams {
  ticketId: string
  action: TicketHistoryAction
  description?: string | null
  details?: Record<string, unknown> | null
  performedBy?: string | null
}

export async function logTicketHistory(
  supabase: SupabaseClient,
  { ticketId, action, description = null, details = null, performedBy = null }: LogTicketHistoryParams
): Promise<void> {
  const { error } = await supabase
    .from('operations_ticket_history')
    .insert([{
      ticket_id: ticketId,
      action,
      description,
      details,
      performed_by: performedBy
    }])

  if (error) {
    console.error('Error recording ticket history event:', error)
  }
}

export async function getTicketHistory(ticketId: string): Promise<TicketHistoryEntry[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('operations_ticket_history')
    .select(`
      *,
      performed_by_user:profiles!operations_ticket_history_performed_by_fkey (
        id,
        full_name,
        email
      )
    `)
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching ticket history:', error)
    return []
  }

  return (data as TicketHistoryEntry[]) ?? []
}
