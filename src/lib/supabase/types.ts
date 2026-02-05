/**
 * Tipos generados para la base de datos de Supabase
 * ITAD ERP Guatemala
 */

export type UserRole =
  | 'super_admin'
  | 'account_manager'
  | 'logistics'
  | 'tech_lead'
  | 'sales_agent'
  | 'client_b2b'

export type AssetStatus =
  | 'pending_reception'
  | 'received'
  | 'diagnosing'
  | 'ready_for_sale'
  | 'sold'
  | 'scrapped'

export type ConditionGrade =
  | 'Grade A'
  | 'Grade B'
  | 'Grade C'
  | 'Scrap'

export type CrmEntityType =
  | 'client'
  | 'supplier'
  | 'partner'

export type TicketStatus =
  | 'draft'
  | 'open'
  | 'pending'
  | 'assigned'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'closed'
  | 'cancelled'

export type TicketValidationStatus =
  | 'PENDIENTE_VALIDACION'
  | 'VALIDADO'
  | 'EXTRA'
  | 'FALTANTE'
  | 'ILEGIBLE'

export type BatchStatus =
  | 'pending'
  | 'received'
  | 'processing'
  | 'completed'

// Interfaces de las tablas principales
export interface Profile {
  id: string
  full_name: string
  role: UserRole
  crm_entity_id: string | null
  email: string | null
  phone: string | null
  avatar_url: string | null
  is_active: boolean
  last_login_at: string | null
  current_device_id: string | null // Para control de sesión única
  last_active_at: string | null    // Para monitoreo de actividad
  allowed_modules: string[] | null // Módulos permitidos explícitamente
  module_permissions: Record<string, string[]> | null // Permisos granulares por módulo
  created_at: string
  updated_at: string
}

export interface CompanySettings {
  id: string
  name: string
  nit: string | null
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  logo_url: string | null
  primary_color: string | null
  secondary_color: string | null
  typography: string | null
  // Configuraciones de PDF
  show_nit: boolean
  show_signatures: boolean
  show_phones: boolean
  show_addresses: boolean
  legal_texts: string | null
  footer_notes: string | null
  ticket_prefix: string
  batch_prefix: string
  warranty_days: number
  currency: string
  updated_at: string
}

export interface CrmEntity {
  id: string
  tax_id_nit: string
  commercial_name: string
  legal_name: string | null
  entity_type: CrmEntityType
  email: string | null
  phone: string | null
  address: string | null
  city: string
  country: string
  contact_person: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface OperationsTicket {
  id: string
  readable_id: string
  client_id: string
  status: TicketStatus
  title: string
  description: string | null
  expected_units: number
  received_units: number
  pickup_address: string | null
  pickup_date: string | null
  priority: number
  assigned_to: string | null
  collector_name: string | null
  collector_phone: string | null
  vehicle_model: string | null
  vehicle_plate: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface TicketItem {
  id: string
  ticket_id: string
  brand: string | null
  model: string | null
  color: string | null
  product_type: string | null
  box_number: number
  box_sku: string | null
  box_seal: string | null
  box_reception_code: string | null
  expected_serial: string | null
  collected_serial: string | null
  validation_status: TicketValidationStatus
  created_at: string
  updated_at: string
}

export interface Batch {
  id: string
  internal_batch_id: string
  ticket_id: string
  status: BatchStatus
  description: string | null
  expected_units: number
  received_units: number
  reception_date: string | null
  received_by: string | null
  location: string | null
  weight_kg: number | null
  pallet_count: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Asset {
  id: string
  serial_number: string | null
  internal_tag: string
  batch_id: string
  asset_type: string
  manufacturer: string | null
  model: string | null
  status: AssetStatus
  condition: ConditionGrade | null
  location: string | null
  specifications: Record<string, unknown>
  data_wipe_status: string
  data_wipe_method: string | null
  data_wipe_certificate_url: string | null
  data_wipe_completed_at: string | null
  data_wipe_by: string | null
  cost_amount: number
  sales_price: number | null
  currency: string
  sold_to: string | null
  sold_at: string | null
  sold_by: string | null
  invoice_number: string | null
  photos: string[]
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Dispatch {
  id: string
  dispatch_code: string
  origin_warehouse: string
  movement_type: 'TRANSFER' | 'DESTRUCTION'
  status: 'DISPATCHED'
  dispatched_at: string
  dispatched_by: string | null
  client_id: string | null
  driver_name: string | null
  vehicle_plate: string | null
  total_weight_lb: number | null
  description: string | null
  created_at: string
  updated_at: string
}

export interface DispatchItem {
  id: string
  dispatch_id: string
  asset_id: string
  product_summary: string | null
  weight_lb: number | null
  created_at: string
}

export interface AuditLog {
  id: string
  record_id: string
  table_name: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  changed_fields: string[] | null
  changed_by: string | null
  changed_at: string
  ip_address: string | null
  user_agent: string | null
  session_id: string | null
}

// Tipo para la base de datos completa
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      crm_entities: {
        Row: CrmEntity
        Insert: Omit<CrmEntity, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<CrmEntity, 'id' | 'created_at'>>
      }
      operations_tickets: {
        Row: OperationsTicket
        Insert: Omit<OperationsTicket, 'id' | 'readable_id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<OperationsTicket, 'id' | 'readable_id' | 'created_at'>>
      }
      ticket_items: {
        Row: TicketItem
        Insert: Omit<TicketItem, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<TicketItem, 'id' | 'created_at'>>
      }
      batches: {
        Row: Batch
        Insert: Omit<Batch, 'id' | 'internal_batch_id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Batch, 'id' | 'internal_batch_id' | 'created_at'>>
      }
      assets: {
        Row: Asset
        Insert: Omit<Asset, 'id' | 'internal_tag' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Asset, 'id' | 'internal_tag' | 'created_at'>>
      }
      audit_logs: {
        Row: AuditLog
        Insert: never // Solo el trigger puede insertar
        Update: never // Inmutable
      }
    }
    Enums: {
      user_role: UserRole
      asset_status: AssetStatus
      condition_grade: ConditionGrade
      crm_entity_type: CrmEntityType
      ticket_status: TicketStatus
      ticket_validation_status: TicketValidationStatus
      batch_status: BatchStatus
    }
  }
}

