import { notFound, redirect } from 'next/navigation'
import { getQuotationById } from '../../actions'
import EditQuotationClient from './EditQuotationClient'

export const dynamic = 'force-dynamic'

export default async function EditarCotizacionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { data: quotation, error } = await getQuotationById(id)
  if (!quotation || error) notFound()

  if (quotation.status !== 'pendiente_aprobacion') {
    redirect(`/dashboard/ventas/cotizaciones/${id}`)
  }

  return <EditQuotationClient quotation={quotation} />
}