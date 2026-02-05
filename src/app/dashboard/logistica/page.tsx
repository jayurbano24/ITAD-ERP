import { createClient } from '@/lib/supabase/server'
import LogisticsDashboard from './components/LogisticsDashboard'
import { mapTicket, ticketSelect } from './utils'

export default async function Page() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('operations_tickets')
    .select(ticketSelect)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching tickets for logística:', error)
  }

  const tickets = (data || []).map(mapTicket)
  return <LogisticsDashboard tickets={tickets} />
}

