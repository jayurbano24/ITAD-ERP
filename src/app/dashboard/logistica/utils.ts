import type { TicketStatus } from '@/lib/supabase/types'
import type { LogisticsTicket } from './types'

export const ticketSelect = `
  id,
  readable_id,
  status,
  expected_units,
  received_units,
  created_at,
  completed_at,
  pickup_address,
  description,
  title,
  ticket_type,
  assigned_to,
  completed_by,
  completed_by_profile:profiles!operations_tickets_completed_by_fkey (
    full_name
  ),
  collector_name,
  collector_phone,
  vehicle_model,
  vehicle_plate,
  ram_capacity,
  ram_type,
  disk_capacity,
  disk_type,
  keyboard_type,
  keyboard_version,
  client:crm_entities (
    commercial_name
  ),
  ticket_items (
    id,
    expected_quantity,
    received_quantity,
    status,
    catalog_brand:catalog_brands (
      id,
      name
    ),
    catalog_model:catalog_models (
      id,
      name
    ),
    catalog_product_type:catalog_product_types (
      id,
      name
    )
  )
`

const statusLabel = (status: TicketStatus, received: number, expected: number) => {
  if (status === 'completed') return 'Completado'
  if (status === 'in_progress') {
    if (received > 0 && expected > received) return 'Recibido Parcial'
    return 'En Proceso'
  }
  return 'Pendiente'
}

const formatDate = (value: string | null) => {
  if (!value) return 'Sin fecha'
  return new Date(value).toLocaleDateString('es-GT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

export const mapTicket = (ticket: any): LogisticsTicket => {
  const totalUnits = ticket.expected_units ?? 0;
  const receivedUnits = ticket.received_units ?? 0;
  const clientName = ticket.client?.commercial_name || 'Cliente desconocido';
  const readableId = ticket.readable_id || ticket.id;

  const items = (ticket.ticket_items || []).map((item: any) => ({
    id: item.id,
    brandName: item.catalog_brand?.name,
    modelName: item.catalog_model?.name,
    productTypeName: item.catalog_product_type?.name,
    expectedQuantity: item.expected_quantity ?? 1,
    receivedQuantity: item.received_quantity ?? 0,
    status: item.status || 'PENDIENTE'
  }));

  return {
    id: readableId,
    client: clientName,
    status: statusLabel(ticket.status, receivedUnits, totalUnits),
    totalUnits,
    receivedUnits,
    date: formatDate(ticket.created_at || null),
    location: ticket.pickup_address || 'Sin ubicación',
    description: ticket.description || ticket.title || 'Sin descripción',
    type: ticket.ticket_type || undefined,
    staffLabel: ticket.assigned_to || undefined,
    completedBy: ticket.completed_by_profile?.full_name || undefined,
    collectorName: ticket.collector_name || undefined,
    collectorPhone: ticket.collector_phone || undefined,
    vehicleModel: ticket.vehicle_model || undefined,
    vehiclePlate: ticket.vehicle_plate || undefined,
    ramCapacity: ticket.ram_capacity || undefined,
    ramType: ticket.ram_type || undefined,
    diskCapacity: ticket.disk_capacity || undefined,
    diskType: ticket.disk_type || undefined,
    keyboardType: ticket.keyboard_type || undefined,
    keyboardVersion: ticket.keyboard_version || undefined,
    items: items.length > 0 ? items : undefined,
    completedAt: ticket.completed_at || null,
  };
};
