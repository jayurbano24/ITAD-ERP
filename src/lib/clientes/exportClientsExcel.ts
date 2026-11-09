import type { CrmEntity, CrmEntityType } from '@/app/dashboard/clientes/actions'
import { formatCrmAccountClass } from '@/lib/clientes/accountClass'

export type ClientExcelRow = {
  commercial_name: string
  legal_name: string
  tax_id_nit: string
  entity_type: string
  account_class: string
  parent_company: string
  email: string
  phone: string
  address: string
  city: string
  contact_person: string
  created_at: string
}

const TYPE_LABELS: Record<CrmEntityType, string> = {
  client: 'Cliente',
  supplier: 'Proveedor',
  partner: 'Partner',
}

export function crmEntityToExcelRow(
  entity: CrmEntity,
  parentCompanyName?: string
): ClientExcelRow {
  return {
    commercial_name: entity.commercial_name,
    legal_name: entity.legal_name?.trim() || '',
    tax_id_nit: entity.tax_id_nit,
    entity_type: TYPE_LABELS[entity.entity_type],
    account_class: formatCrmAccountClass(entity),
    parent_company: parentCompanyName?.trim() || '',
    email: entity.email?.trim() || '',
    phone: entity.phone?.trim() || '',
    address: entity.address?.trim() || '',
    city: entity.city?.trim() || '',
    contact_person: entity.contact_person?.trim() || '',
    created_at: new Date(entity.created_at).toLocaleString('es-GT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
  }
}

export async function downloadClientsExcel(rows: ClientExcelRow[], fileName?: string) {
  const mod = await import('exceljs')
  const ExcelJS = (mod as unknown as { default?: typeof mod }).default ?? mod
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Clientes', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  const headers = [
    'Nombre',
    'Razón social',
    'NIT',
    'Tipo',
    'Clasificación',
    'Empresa asociada',
    'Email',
    'Teléfono',
    'Dirección',
    'Ciudad',
    'Contacto',
    'Fecha registro',
  ]
  ws.addRow(headers)
  const headerRow = ws.getRow(1)
  headerRow.font = { bold: true, size: 11 }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE8EEF7' },
  }

  for (const r of rows) {
    ws.addRow([
      r.commercial_name,
      r.legal_name,
      r.tax_id_nit,
      r.entity_type,
      r.account_class,
      r.parent_company,
      r.email,
      r.phone,
      r.address,
      r.city,
      r.contact_person,
      r.created_at,
    ])
  }

  ws.columns = [
    { width: 28 },
    { width: 24 },
    { width: 14 },
    { width: 12 },
    { width: 14 },
    { width: 22 },
    { width: 26 },
    { width: 14 },
    { width: 32 },
    { width: 16 },
    { width: 20 },
    { width: 16 },
  ]

  const buffer = await wb.xlsx.writeBuffer()
  const stamp = new Date().toISOString().slice(0, 10)
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName || `Clientes-${stamp}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
