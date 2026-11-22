import type { TicketItem } from '@/lib/supabase/types'
import {
  resolveReceiptCollectionAddress,
  resolveReceiptCompanyName,
  resolveReceiptOrderNumber,
  resolveReceiptPickupDateIso,
  resolveReceiptProjectId,
  type ReceiptHeaderSources,
} from './resolveEquipmentReceiptHeader'

export type EquipmentReceiptLine = {
  product: string
  make: string
  model: string
  serial: string
}

export type EquipmentReceiptPayload = {
  orderNumber: string
  customer: string
  companyName: string
  pickupDate: string
  projectId: string
  collectionAddress: string
  receptionNotes: string
  items: EquipmentReceiptLine[]
}

/** Etiqueta ITAD (intermediario) en el recibo XSi. */
export const DEFAULT_RECEIPT_CUSTOMER = 'Wisetek'

function formatPickupDateEn(iso: string | null | undefined, fallbackIso?: string | null): string {
  const raw = iso?.trim() || fallbackIso?.trim() || ''
  if (!raw) return ''
  const d = new Date(raw.includes('T') ? raw : `${raw}T12:00:00`)
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function mapAssetProduct(assetType: string | null | undefined, productType?: string | null): string {
  if (productType?.trim()) return productType.trim()
  const t = (assetType || '').toUpperCase()
  if (t.includes('LAP')) return 'Laptop'
  if (t.includes('DESK') || t.includes('PC')) return 'Desktop'
  if (t.includes('MON')) return 'Monitor'
  if (t.includes('TAB')) return 'Tablet'
  if (t.includes('PHONE') || t.includes('MOV')) return 'Phone'
  if (t.includes('SRV') || t.includes('SERVER')) return 'Server'
  return assetType?.trim() || 'Equipment'
}

type AssetRow = {
  asset_type?: string | null
  manufacturer?: string | null
  model?: string | null
  serial_number?: string | null
}

type TicketShape = {
  readable_id?: string | null
  title?: string | null
  description?: string | null
  xsi_order_number?: string | null
  epc_order_number?: string | null
  pickup_address?: string | null
  pickup_date?: string | null
  completed_at?: string | null
  created_at?: string | null
  equipment_receipt_notes?: string | null
  notes?: string | null
  client?: {
    commercial_name?: string | null
    legal_name?: string | null
    address?: string | null
  } | null
  ticket_items?: TicketItem[] | null
}

export type ReceiptPayloadEnrichment = Partial<ReceiptHeaderSources>

export function buildEquipmentReceiptPayload(
  ticket: TicketShape,
  assets: AssetRow[],
  overrides?: { receptionNotes?: string; customer?: string; enrichment?: ReceiptPayloadEnrichment }
): EquipmentReceiptPayload {
  const enrichment = overrides?.enrichment
  const sources: ReceiptHeaderSources = {
    readable_id: ticket.readable_id,
    title: ticket.title,
    description: ticket.description,
    notes: ticket.notes,
    xsi_order_number: ticket.xsi_order_number,
    epc_order_number: ticket.epc_order_number,
    pickup_address: ticket.pickup_address,
    pickup_date: ticket.pickup_date,
    completed_at: ticket.completed_at,
    created_at: ticket.created_at,
    client: {
      commercial_name: ticket.client?.commercial_name,
      legal_name: ticket.client?.legal_name,
      address: enrichment?.client?.address ?? ticket.client?.address,
    },
    batchOrdCodes: enrichment?.batchOrdCodes,
    batchReceptionDate: enrichment?.batchReceptionDate,
  }

  const companyName = resolveReceiptCompanyName(sources)
  const receptionNotes =
    (overrides?.receptionNotes ?? ticket.equipment_receipt_notes ?? ticket.notes ?? '').trim()

  let items: EquipmentReceiptLine[] = []

  if (assets.length > 0) {
    items = assets.map((a) => ({
      product: mapAssetProduct(a.asset_type, null),
      make: (a.manufacturer || '').trim() || '—',
      model: (a.model || '').trim() || '—',
      serial: (a.serial_number || '').trim() || '—',
    }))
  } else if (ticket.ticket_items?.length) {
    items = ticket.ticket_items.map((row) => ({
      product: mapAssetProduct(null, row.product_type),
      make: (row.brand || '').trim() || '—',
      model: (row.model || '').trim() || '—',
      serial: (row.expected_serial || row.collected_serial || '').trim() || '—',
    }))
  }

  const pickupIso = resolveReceiptPickupDateIso(sources)

  return {
    orderNumber: resolveReceiptOrderNumber(sources),
    customer: (overrides?.customer || DEFAULT_RECEIPT_CUSTOMER).trim(),
    companyName,
    pickupDate: formatPickupDateEn(pickupIso, ticket.created_at),
    projectId: resolveReceiptProjectId(sources),
    collectionAddress: resolveReceiptCollectionAddress(sources),
    receptionNotes,
    items,
  }
}