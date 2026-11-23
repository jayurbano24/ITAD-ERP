import type { SalesExcelRow } from '@/lib/ventas/exportSalesExcel'
import type { SalesAdvancedExcelRow } from '@/lib/ventas/exportSalesAdvancedExcel'

export type VentasExportSelection = {
  selectedCount: number
  excelRows: SalesExcelRow[]
  advancedRows: SalesAdvancedExcelRow[]
}