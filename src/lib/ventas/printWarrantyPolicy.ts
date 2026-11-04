export type WarrantyPrintPayload = {
  customerName: string
  taxId: string
  phone?: string | null
  email?: string | null
  /** Consecutivo POL-GT-AAAA-NNNNN */
  policyNumber?: string | null
  /** Opcional: ya no se imprime FACT/SO consecutivos en la política */
  invoiceNumber?: string
  orderNumber?: string
  saleDate: string
  deliveryDate: string
  warrantyEnd: string
  /** Texto de reemplazos por garantía (para PDF) */
  replacementHistory?: string | null
  items: Array<{
    manufacturer: string
    model: string
    serialNumber: string
    grade?: string | null
    specs?: string | null
  }>
  /** Detalle específico del equipo (campo Nota en venta) */
  commentsDetail?: string | null
}

function splitCommentsForPdf(raw: string): { detail: string; recommendations: string } {
  const text = raw.trim()
  if (!text) return { detail: '', recommendations: '' }
  const marker = /Recomendaciones de uso\s*:/i
  const idx = text.search(marker)
  if (idx >= 0) {
    const detail = text.slice(0, idx).trim()
    const recommendations = text
      .slice(idx)
      .replace(/^Recomendaciones de uso\s*:\s*/i, '')
      .trim()
    return { detail, recommendations }
  }
  return { detail: text, recommendations: '' }
}

function formatGrade(grade?: string | null): string {
  if (!grade) return 'Grado B'
  const g = grade.trim()
  if (/^grade\s*b$/i.test(g) || g === 'B') return 'Grado B'
  if (/^grade\s*a$/i.test(g) || g === 'A') return 'Grado A'
  if (/^grade\s*c$/i.test(g) || g === 'C') return 'Grado C'
  if (/scrap|grade\s*d/i.test(g)) return 'Grado D / Scrap'
  return g.startsWith('Grado') ? g : g
}

/**
 * Descarga PDF: Política de garantía de equipos usados TECHCORPS
 * Diseño denso — una sola hoja carta.
 */
export async function printWarrantyPolicy(payload: WarrantyPrintPayload): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const pageW = doc.internal.pageSize.getWidth()
  const marginX = 10
  const contentW = pageW - marginX * 2
  let y = 7

  const writeWrapped = (text: string, fontSize = 6.6, leading = 2.55) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(fontSize)
    doc.setTextColor(25, 25, 25)
    const lines = doc.splitTextToSize(text, contentW)
    doc.text(lines, marginX, y)
    y += lines.length * leading + 0.8
  }

  const sectionTitle = (title: string) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(17, 17, 17)
    doc.text(title, marginX, y)
    y += 1.2
    doc.setDrawColor(150, 150, 150)
    doc.setLineWidth(0.25)
    doc.line(marginX, y, marginX + contentW, y)
    y += 3.2
  }

  /** Etiqueta + valor compactos en una sola línea de altura fija */
  const field = (label: string, value: string, x: number, w: number) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.8)
    doc.setTextColor(100, 100, 100)
    doc.text(label, x, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(17, 17, 17)
    const display = (value || '').trim() || '________________'
    const lines = doc.splitTextToSize(display, w)
    doc.text(lines[0], x, y + 3.2)
    doc.setDrawColor(60, 60, 60)
    doc.setLineWidth(0.2)
    doc.line(x, y + 4.2, x + w, y + 4.2)
  }

  // —— Encabezado compacto ——
  doc.setFillColor(30, 58, 95)
  doc.rect(0, 0, pageW, 11, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.text('TECHCORPS GUATEMALA', marginX, 5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text('Política de Garantía de equipos usados  ·  1 hoja', marginX, 9)
  if (payload.policyNumber) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.text(`No. ${payload.policyNumber}`, pageW - marginX, 9, { align: 'right' })
  }
  y = 14.5

  doc.setFillColor(232, 238, 245)
  doc.roundedRect(marginX, y - 2.2, contentW, 6.5, 0.8, 0.8, 'F')
  doc.setTextColor(30, 58, 95)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.text(
    'Garantía de 3 meses en piezas, servicios de reparación y accesorios  |  Equipo grado B',
    marginX + 1.5,
    y + 1.8
  )
  y += 7.5

  // —— Cliente (3 filas densas) ——
  sectionTitle('Datos del cliente y de la venta')
  const gap = 3
  const col3 = (contentW - gap * 2) / 3

  field('Nombre o razón social', payload.customerName, marginX, contentW)
  y += 7
  field('NIT o identificación', payload.taxId, marginX, col3)
  field('Teléfono', payload.phone || '', marginX + col3 + gap, col3)
  field('Correo', payload.email || '', marginX + (col3 + gap) * 2, col3)
  y += 7
  // Sin FACT / SO / consecutivos en la política de garantía
  field('No. política', payload.policyNumber || '—', marginX, col3)
  field('Fecha / entrega', `${payload.saleDate} / ${payload.deliveryDate}`, marginX + col3 + gap, col3)
  field('Vence garantía', payload.warrantyEnd, marginX + (col3 + gap) * 2, col3)
  y += 8

  if (payload.replacementHistory?.trim()) {
    sectionTitle('Historial de reemplazo (garantía)')
    writeWrapped(payload.replacementHistory.trim(), 6.5, 2.4)
    y += 1
  }

  // —— Equipo ——
  sectionTitle('Datos del equipo y accesorios')
  const itemsToShow = payload.items.slice(0, 2)
  for (const item of itemsToShow) {
    const modelLine = [item.model, item.specs].filter(Boolean).join(' | ')
    const sn = item.serialNumber || '__________'
    const grade = formatGrade(item.grade)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(17, 17, 17)
    const line1 = doc.splitTextToSize(
      `Marca: ${item.manufacturer || '—'}   ·   Modelo: ${modelLine || '—'}`,
      contentW
    )
    doc.text(line1[0], marginX, y)
    y += 3.2
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text(`Serie: ${sn}`, marginX, y)
    doc.text(`Condición estética: ${grade}`, marginX + contentW / 2, y)
    y += 4
  }
  if (payload.items.length > 2) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(6)
    doc.setTextColor(80, 80, 80)
    doc.text(`(+ ${payload.items.length - 2} equipo(s) adicional(es) en la factura)`, marginX, y)
    y += 3.5
  }

  // Accesorios en una línea
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(17, 17, 17)
  let accX = marginX
  const accHeader = 'Accesorio entregado |'
  doc.text(accHeader, accX, y)
  accX += doc.getTextWidth(accHeader) + 2.5
  const accessoryLabels = ['Cargador', 'Teclado', 'Mouses', 'Bateria', 'Mochila']
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setDrawColor(17, 17, 17)
  doc.setLineWidth(0.35)
  for (const label of accessoryLabels) {
    doc.text(label, accX, y)
    accX += doc.getTextWidth(label) + 1.5
    doc.rect(accX, y - 2.8, 3, 3)
    accX += 3 + 3.5
  }
  y += 5.5

  const { detail: commentDetail, recommendations } = splitCommentsForPdf(
    payload.commentsDetail || ''
  )

  const printCommentBlock = (title: string, body: string, blankLinesIfEmpty = 2) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(17, 17, 17)
    doc.text(title, marginX, y)
    y += 3.2
    const text = body.trim()
    if (text) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(25, 25, 25)
      const lines = doc.splitTextToSize(text, contentW)
      doc.text(lines, marginX, y)
      y += lines.length * 2.35 + 1.2
    } else {
      doc.setDrawColor(40, 40, 40)
      doc.setLineWidth(0.25)
      for (let i = 0; i < blankLinesIfEmpty; i++) {
        doc.line(marginX, y + 0.3, marginX + contentW, y + 0.3)
        y += 4
      }
    }
  }

  printCommentBlock('Detalle de comentarios sobre el equipo (venta)', commentDetail, 2)
  printCommentBlock('Recomendaciones de uso', recommendations, 0)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.text('Estado de batería externa y observaciones', marginX, y)
  doc.setDrawColor(40, 40, 40)
  doc.setLineWidth(0.25)
  doc.line(marginX + 56, y + 0.3, marginX + contentW, y + 0.3)
  y += 5.5

  // —— Cláusulas ——
  const clause = (title: string, body: string) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(17, 17, 17)
    doc.text(title, marginX, y)
    y += 2.8
    writeWrapped(body, 6.5, 2.45)
    y += 0.6
  }

  clause(
    '1. Cobertura y condición del equipo',
    'TECHCORPS otorga 3 meses calendario de garantía desde la entrega, con cobertura de piezas y servicios de reparación, incluida mano de obra, por fallas de funcionamiento bajo uso normal. Incluye diagnóstico y reparación o sustitución de componentes cubiertos sin costo: placa principal, procesador, RAM, SSD, pantalla, teclado, panel táctil, puertos y conectividad integrados. El grado B admite signos normales de uso informados al entregar, sin afectar la funcionalidad; estos detalles estéticos no constituyen una falla cubierta.'
  )
  clause(
    '2. Accesorios y batería',
    'El cargador entregado con el equipo y la batería externa cuentan con 3 meses calendario de garantía desde la entrega, por fallas de funcionamiento bajo uso normal. La batería interna no está cubierta por esta garantía comercial. El desgaste natural y la reducción de autonomía por uso no están cubiertos. Ante una falla del cargador o de la batería externa, deben ingresar al Centro de Servicios para diagnóstico y reparación o sustitución, según el resultado técnico.'
  )
  clause(
    '3. Exclusiones',
    'No cubre daños causados por golpes, caídas, líquidos, corrosión, sobrevoltaje, alimentación incompatible o uso inadecuado; daños atribuibles a reparaciones o modificaciones de terceros; desgaste normal; virus, configuración o instalación de programas, licencias ni recuperación de archivos. Toda exclusión deberá sustentarse en el diagnóstico y relacionarse con la falla reportada.'
  )
  clause(
    '4. Solicitud y atención',
    'Ante una falla, el equipo o accesorio debe ingresar al Centro de Servicios de TECHCORPS para diagnóstico y proceso de reparación. Reporte el caso dentro de la vigencia por el canal indicado abajo y presente comprobante de compra y número de serie cuando corresponda. Se emitirá una orden con la falla reportada, estado físico y accesorios recibidos. El Centro de Servicios determinará la cobertura, comunicará el diagnóstico y la fecha estimada de solución. La atención inicia con evaluación y reparación; cualquier sustitución o solución posterior se determinará según el resultado técnico. Todo trabajo fuera de cobertura requiere cotización y autorización previa. Respalde sus archivos antes de entregar el equipo cuando sea posible. El formateo o una intervención que pueda borrar datos requiere autorización previa. Los casos reportados a tiempo conservan su atención, aunque la solución sea posterior al vencimiento. Esta política no limita los derechos que correspondan al consumidor.'
  )

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(17, 17, 17)
  doc.text(
    'Atención al cliente:  WhatsApp +502 3576 8476  |  Teléfono 2254 0430',
    marginX,
    y
  )
  y += 8

  // —— Firmas ——
  const sigW = (contentW - 10) / 2
  doc.setDrawColor(17, 17, 17)
  doc.setLineWidth(0.35)
  doc.line(marginX, y, marginX + sigW, y)
  doc.line(marginX + sigW + 10, y, marginX + contentW, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.text('Firma del cliente', marginX, y + 3.5)
  doc.text('Firma y sello TECHCORPS', marginX + sigW + 10, y + 3.5)
  y += 7
  doc.setFontSize(5.8)
  doc.setTextColor(70, 70, 70)
  doc.text(
    'La firma acredita la recepción del equipo, los accesorios y esta política; no implica renuncia de derechos.',
    marginX,
    y
  )

  const safeName = (payload.customerName || 'cliente')
    .replace(/[^\w\-]+/g, '_')
    .slice(0, 40)
  const safeDate = (payload.saleDate || '').replace(/[^\d]+/g, '-')
  const pol = (payload.policyNumber || '').replace(/[^\w\-]+/g, '-')
  doc.save(
    `Politica-Garantia-${pol || 'Equipos-Usados'}-${safeName}-${safeDate || 'venta'}.pdf`
  )
}

export const downloadWarrantyPolicyPdf = printWarrantyPolicy

function warrantyCommentsFromOrder(order: {
  customer_notes?: string | null
  internal_notes?: string | null
}): string {
  const direct = (order.customer_notes || '').trim()
  if (direct) return direct
  const legacy = (order.internal_notes || '').trim()
  if (!legacy) return ''
  return legacy.replace(/\s*·?\s*Visacuota:.*$/i, '').trim()
}

type SaleOrderForWarranty = {
  created_at: string
  invoice_number?: string | null
  order_number: string
  customer_notes?: string | null
  internal_notes?: string | null
  customer?: {
    commercial_name?: string | null
    tax_id_nit?: string | null
    phone?: string | null
    email?: string | null
  } | null
  items?: Array<{
    product_description?: string | null
    serial_number?: string | null
    condition_grade?: string | null
    warranty_end_date?: string | null
    asset?: {
      manufacturer?: string | null
      model?: string | null
      serial_number?: string | null
      internal_tag?: string | null
      condition?: string | null
      condition_grade?: string | null
      specifications?: Record<string, unknown> | null
    } | null
  }> | null
}

export type WarrantyExchangeLine = {
  from_serial: string | null
  to_serial: string | null
  reason: string | null
  created_at: string
  upgrade_total?: number | null
  upgrade_payment_method?: string | null
}

function formatReplacementHistory(exchanges: WarrantyExchangeLine[]): string {
  if (!exchanges.length) return ''
  return exchanges
    .map((ex) => {
      const when = new Date(ex.created_at).toLocaleString('es-GT')
      const diff =
        ex.upgrade_total && Number(ex.upgrade_total) > 0
          ? ` Diferencia Q${Number(ex.upgrade_total).toFixed(2)} (${ex.upgrade_payment_method || 'pago'}).`
          : ''
      return `${when}: serie ${ex.from_serial || '—'} devuelta (BOD-RPL) → entrega ${ex.to_serial || '—'}.${diff} ${ex.reason || ''}`.trim()
    })
    .join('\n')
}

/** Construye el payload del PDF a partir de una orden de venta (historial / detalle). */
export function buildWarrantyPayloadFromSaleOrder(
  order: SaleOrderForWarranty,
  options?: {
    policyNumber?: string | null
    exchanges?: WarrantyExchangeLine[]
  }
): WarrantyPrintPayload {
  const customer = order.customer
  const items = order.items || []
  const soldAt = new Date(order.created_at)
  const warrantyEnd = items[0]?.warranty_end_date
    ? new Date(items[0].warranty_end_date)
    : new Date(soldAt.getTime() + 90 * 86400000)

  return {
    customerName: customer?.commercial_name || '—',
    taxId: customer?.tax_id_nit || 'CF',
    phone: customer?.phone || null,
    email: customer?.email || null,
    invoiceNumber: undefined,
    orderNumber: undefined,
    saleDate: soldAt.toLocaleDateString('es-GT'),
    deliveryDate: soldAt.toLocaleDateString('es-GT'),
    warrantyEnd: warrantyEnd.toLocaleDateString('es-GT'),
    items: items.map((item) => ({
      manufacturer: item.asset?.manufacturer || '—',
      model: item.asset?.model || item.product_description || '—',
      serialNumber:
        item.serial_number || item.asset?.serial_number || item.asset?.internal_tag || '—',
      grade: item.condition_grade || item.asset?.condition_grade || item.asset?.condition || 'Grade B',
      specs: formatAssetSpecsLine(item.asset?.specifications) || item.product_description || '',
    })),
    commentsDetail: warrantyCommentsFromOrder(order),
    policyNumber: options?.policyNumber ?? null,
    replacementHistory: options?.exchanges?.length
      ? formatReplacementHistory(options.exchanges)
      : null,
  }
}

/** Arma texto de specs a partir de hardware_specs del asset */
export function formatAssetSpecsLine(specs: unknown): string {
  if (!specs || typeof specs !== 'object') return ''
  const root = specs as Record<string, unknown>
  const hw =
    root.hardware_specs && typeof root.hardware_specs === 'object'
      ? (root.hardware_specs as Record<string, unknown>)
      : root
  const parts: string[] = []
  if (typeof hw.processor === 'string' && hw.processor.trim()) parts.push(hw.processor.trim())
  const ram = [hw.ram_capacity, hw.ram_type].filter((v) => typeof v === 'string' && String(v).trim()).join(' ')
  if (ram) parts.push(`RAM ${ram}`)
  const disk = [hw.disk_capacity, hw.disk_type].filter((v) => typeof v === 'string' && String(v).trim()).join(' ')
  if (disk) parts.push(disk.includes('SSD') || disk.includes('HDD') ? disk : `SSD ${disk}`)
  if (typeof hw.screen_size === 'string' && hw.screen_size.trim()) parts.push(hw.screen_size.trim())
  return parts.join(' | ')
}
