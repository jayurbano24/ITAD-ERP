// Fallas tabuladas estándar
export const FAILURE_TYPES = [
  { value: 'no_power', label: 'No enciende', category: 'power' },
  { value: 'battery_issue', label: 'Problema de batería', category: 'power' },
  { value: 'screen_damage', label: 'Pantalla dañada', category: 'display' },
  { value: 'screen_flickering', label: 'Pantalla parpadea', category: 'display' },
  { value: 'touch_not_working', label: 'Touch no funciona', category: 'display' },
  { value: 'keyboard_issue', label: 'Problema de teclado', category: 'input' },
  { value: 'trackpad_issue', label: 'Problema de trackpad', category: 'input' },
  { value: 'camera_issue', label: 'Cámara no funciona', category: 'hardware' },
  { value: 'speaker_issue', label: 'Problema de audio', category: 'hardware' },
  { value: 'mic_issue', label: 'Micrófono no funciona', category: 'hardware' },
  { value: 'wifi_issue', label: 'Problema de WiFi', category: 'connectivity' },
  { value: 'bluetooth_issue', label: 'Problema de Bluetooth', category: 'connectivity' },
  { value: 'charging_port', label: 'Puerto de carga dañado', category: 'hardware' },
  { value: 'overheating', label: 'Sobrecalentamiento', category: 'thermal' },
  { value: 'software_issue', label: 'Problema de software', category: 'software' },
  { value: 'water_damage', label: 'Daño por líquidos', category: 'physical' },
  { value: 'physical_damage', label: 'Daño físico', category: 'physical' },
  { value: 'other', label: 'Otro', category: 'other' },
]

export const OS_NUMBER_PREFIX = 'OS-'

// Tipos TypeScript
export interface WorkOrder {
  id: string
  work_order_number: string
  status: string
  priority: string
  reported_issue: string | null
  diagnosis: string | null
  resolution: string | null

  // Garantía
  warranty_status: string | null
  warranty_end_date: string | null

  // Falla
  failure_type: string | null
  failure_category: string | null

  // Cotización
  quote_amount: number | null
  quote_status: string | null
  quote_notes: string | null
  quote_approved_at: string | null

  // Irreparable
  is_irreparable: boolean
  irreparable_reason: string | null
  irreparable_marked_at: string | null

  // Seedstock
  seedstock_exchange: boolean
  original_imei: string | null
  new_imei: string | null
  original_serial: string | null
  new_serial: string | null
  seedstock_date: string | null
  seedstock_notes: string | null

  // QC
  mmi_test_in: Record<string, boolean> | null
  mmi_test_out: Record<string, boolean> | null
  qc_passed: boolean | null
  qc_performed_at: string | null

  // Timestamps
  created_at: string
  updated_at: string
  started_at: string | null
  completed_at: string | null

  // Joins
  asset?: {
    id: string
    internal_tag: string
    serial_number: string | null
    manufacturer: string | null
    model: string | null
    asset_type: string
    color: string | null
    batch_id?: string | null
    batch_code?: string | null
    specifications?: Record<string, unknown> | null
  }
  ticket?: {
    id: string
    ticket_number: string
    client?: {
      id: string
      name: string
    }
  }
  part_dispatch_completed?: boolean
  technician?: {
    id: string
    full_name: string
  }
  human_id?: number | null
}

