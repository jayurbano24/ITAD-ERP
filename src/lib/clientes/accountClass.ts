import type { CrmEntity } from '@/app/dashboard/clientes/actions'

export type CrmAccountClass = 'empresa' | 'cliente_final'

export const CRM_ACCOUNT_CLASS_LABELS: Record<CrmAccountClass, string> = {
  empresa: 'Empresa',
  cliente_final: 'Cliente final',
}

export function resolveCrmAccountClass(entity: {
  account_class?: CrmAccountClass | null
  tax_id_nit?: string | null
}): CrmAccountClass {
  if (entity.account_class === 'empresa' || entity.account_class === 'cliente_final') {
    return entity.account_class
  }
  if ((entity.tax_id_nit || '').trim().toUpperCase() === 'CF') {
    return 'cliente_final'
  }
  return 'empresa'
}

export function formatCrmAccountClass(entity: CrmEntity | Parameters<typeof resolveCrmAccountClass>[0]): string {
  return CRM_ACCOUNT_CLASS_LABELS[resolveCrmAccountClass(entity)]
}
