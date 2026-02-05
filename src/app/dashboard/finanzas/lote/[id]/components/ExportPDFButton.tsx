'use client'

import { Download } from 'lucide-react'
import { PnLResult } from '../../../actions'

interface ExportPDFButtonProps {
  pnl: PnLResult
}

export function ExportPDFButton({ pnl }: ExportPDFButtonProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ',
      minimumFractionDigits: 2
    }).format(value || 0)
  }

  const handleExport = async () => {
    try {
      // Dynamic import for jsPDF to avoid bundle issues
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()

      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 15
      let yPos = 20

      // Header
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text(`RENTABILIDAD DEL LOTE ${pnl.batch_number}`, margin, yPos)

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      yPos += 8
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-GT')}`, margin, yPos)

      yPos += 12

      // KPIs Section
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('INDICADORES CLAVE', margin, yPos)
      yPos += 8

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      const kpis = [
        `Total de Unidades: ${pnl.total_units}`,
        `Unidades Vendidas: ${pnl.units_sold} (${pnl.sell_through_pct}%)`,
        `Unidades Desechadas: ${pnl.units_scrapped}`,
        `Unidades Pendientes: ${pnl.units_pending}`,
        `Precio Promedio de Venta: ${formatCurrency(pnl.avg_sale_price)}`,
        `Costo Promedio por Unidad: ${formatCurrency(pnl.avg_cost_per_unit)}`
      ]

      kpis.forEach(kpi => {
        doc.text(kpi, margin + 5, yPos)
        yPos += 6
      })

      yPos += 8

      // P&L Section
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('ESTADO DE RESULTADOS', margin, yPos)
      yPos += 8

      doc.setFontSize(9)

      // Table data
      const tableData = [
        ['Concepto', 'Monto'],
        ['VENTAS TOTALES', formatCurrency(pnl.gross_revenue)],
        ['', ''],
        ['Costo de Adquisición', `-${formatCurrency(pnl.acquisition_cost)}`],
        ['Logística / Flete', `-${formatCurrency(pnl.logistics_cost)}`],
        ['Costo Repuestos', `-${formatCurrency(pnl.parts_cost)}`],
        ['Mano de Obra', `-${formatCurrency(pnl.labor_cost)}`],
        ['Borrado de Datos', `-${formatCurrency(pnl.data_wipe_cost)}`],
        ['Inversión en Marketing', `-${formatCurrency(pnl.marketing_cost)}`],
        ...(pnl.other_costs > 0 ? [['Otros Gastos', `-${formatCurrency(pnl.other_costs)}`]] : []),
        ['', ''],
        ['GANANCIA NETA', formatCurrency(pnl.operating_profit)],
        ['MARGEN DE GANANCIA', `${pnl.profit_margin_pct}%`]
      ]

      // Auto table
      const { autoTable } = await import('jspdf-autotable')
      autoTable(doc, {
        head: [tableData[0]],
        body: tableData.slice(1),
        startY: yPos,
        margin: { left: margin, right: margin },
        headStyles: {
          fillColor: [100, 100, 100],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [0, 0, 0]
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        columnStyles: {
          1: { halign: 'right' }
        },
        didDrawPage: (data) => {
          // Footer
          const pageCount = doc.getNumberOfPages()
          doc.setFontSize(8)
          doc.text(
            `Página ${data.pageNumber} de ${pageCount}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
          )
        }
      })

      // Save PDF
      const filename = `P&L_Lote_${pnl.batch_number}_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(filename)
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert('Error al exportar PDF. Intenta nuevamente.')
    }
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 px-4 py-2 bg-surface-800 hover:bg-surface-700 text-white rounded-lg transition-colors border border-surface-700"
    >
      <Download className="w-4 h-4" />
      Exportar
    </button>
  )
}
