import type { TicketType } from '@/app/dashboard/tickets/actions'

export type ReceptionServiceKind = 'itad' | 'post_venta' | 'cliente_final'

export const RECEPTION_SERVICE_OPTIONS: {
  kind: ReceptionServiceKind
  label: string
  ticketType: TicketType
  titlePrefix: string
}[] = [
  { kind: 'itad', label: 'ITAD', ticketType: 'itad', titlePrefix: 'Recepción ITAD' },
  { kind: 'post_venta', label: 'Post-Venta', ticketType: 'garantia', titlePrefix: 'Recepción Post-Venta' },
  {
    kind: 'cliente_final',
    label: 'Cliente Final',
    ticketType: 'recoleccion',
    titlePrefix: 'Recepción Cliente Final',
  },
]

export function receptionKindToTicketType(kind: ReceptionServiceKind): TicketType {
  const found = RECEPTION_SERVICE_OPTIONS.find((o) => o.kind === kind)
  return found?.ticketType ?? 'recoleccion'
}

export function buildReceptionTicketTitle(
  kind: ReceptionServiceKind,
  clientName: string
): string {
  const opt = RECEPTION_SERVICE_OPTIONS.find((o) => o.kind === kind)
  const prefix = opt?.titlePrefix ?? 'Recepción'
  return `${prefix} · ${clientName}`
}
