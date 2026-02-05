import { redirect } from 'next/navigation'

export default function BodegaRecepcionPage() {
  redirect('/dashboard/inventario/bodega?warehouse=BOD-REC')
}
