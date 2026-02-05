import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PackageCheck, ArrowLeft } from 'lucide-react'
import LogisticaModule from '../components/LogisticaModule'
import { getAllCatalogs, getCompanySettings } from '@/app/dashboard/configuracion/usuarios/actions'
import { createClient } from '@/lib/supabase/server'
import { mapTicket, ticketSelect } from '../utils'

interface Params {
  params: {
    id: string
  }
}

export default async function TicketDetail({ params }: Params) {
  const supabase = await createClient()

  const fetchTicketByColumn = (column: 'readable_id' | 'id') =>
    supabase
      .from('operations_tickets')
      .select(ticketSelect)
      .eq(column, params.id)
      .maybeSingle()

  const { data: primaryTicket, error } = await fetchTicketByColumn('readable_id')
  if (error) {
    console.error('Error fetching logística ticket by readable_id:', error)
  }

  let ticketRecord = primaryTicket

  if (!ticketRecord) {
    const { data: fallbackTicket, error: fallbackError } = await fetchTicketByColumn('id')
    if (fallbackError) {
      console.error('Error fetching logística ticket by id:', fallbackError)
    }
    ticketRecord = fallbackTicket
  }

  if (!ticketRecord) {
    notFound()
  }

  const ticket = mapTicket(ticketRecord)

  const calendars = await getAllCatalogs()
  const catalogs = calendars
  const companySettings = await getCompanySettings()

  const descriptionDisplay = ticket.description && ticket.description !== 'Sin descripción' ? ticket.description : 'n/a'

  return (
    <div className="min-h-screen bg-[#1A1A1A] dark:bg-surface-950 transition-colors duration-500">
      <div className="max-w-[1600px] mx-auto py-10 px-8 space-y-8">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-purple-500 dark:bg-purple-600 rounded-[1rem] shadow-lg">
              <PackageCheck className="text-white" size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-gray-400 dark:text-surface-500 mb-1.5">MÓDULO DE LOGÍSTICA - DETALLE DEL TICKET</p>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">{ticket.id}</h1>
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500 dark:bg-surface-600" />
                <p className="text-sm font-bold text-gray-400 dark:text-surface-400 truncate max-w-[400px]">{descriptionDisplay}</p>
              </div>
            </div>
          </div>
          <Link
            href="/dashboard/logistica"
            className="flex items-center gap-3 px-6 py-3 bg-black border border-white rounded-xl text-white hover:bg-gray-900 transition-all font-bold text-xs uppercase tracking-widest active:scale-95 group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span>Volver a Logística</span>
          </Link>
        </header>

        <LogisticaModule
          ticket={ticket}
          brands={catalogs.brands}
          models={catalogs.models}
          productTypes={catalogs.productTypes}
          companySettings={companySettings}
        />
      </div>
    </div>
  )
}

