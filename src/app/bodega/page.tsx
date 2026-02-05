import { redirect } from 'next/navigation'

export default function BodegaLanding() {
  redirect('/dashboard/inventario/bodega?warehouse=BOD-REC')
}
