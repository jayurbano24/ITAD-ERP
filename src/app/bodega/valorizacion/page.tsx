import { redirect } from 'next/navigation'

export default function BodegaValorizacionPage() {
  redirect('/dashboard/inventario/bodega?warehouse=BOD-VAL')
}
