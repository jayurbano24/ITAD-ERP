/** Campos editables del reporte ITAD (evidencias / Excel). */
export type EvidenceReportPatch = {
  make?: string | null
  model?: string | null
  device?: string | null
  serialNumber?: string | null
  customerAssetTag?: string | null
  mainBoardPart?: string | null
  cpu?: string | null
  ramCapacityGb?: string | null
  ramType?: string | null
  screenSize?: string | null
  weightLbs?: string | null
  hddCount?: string | null
  battery?: string | null
  charger?: string | null
  memory?: string | null
  rec?: string | null
  c?: string | null
  f?: string | null
  r2Applicability?: string | null
  dataSanitization?: string | null
  hdd1Serial?: string | null
  hdd1Size?: string | null
  hdd1Wipe?: string | null
  hdd1Destruction?: string | null
  hdd2Serial?: string | null
  hdd2Size?: string | null
  hdd2Wipe?: string | null
  hdd2Destruction?: string | null
  technicianName?: string | null
  testDate?: string | null
  comments?: string | null
  additionalNotes?: string | null
  remarketPrice?: string | null
  serviceFee?: string | null
}

export type EvidenceReportFormState = Record<keyof EvidenceReportPatch, string>

export function emptyEvidenceReportForm(): EvidenceReportFormState {
  return {
    make: '',
    model: '',
    device: '',
    serialNumber: '',
    customerAssetTag: '',
    mainBoardPart: '',
    cpu: '',
    ramCapacityGb: '',
    ramType: '',
    screenSize: '',
    weightLbs: '',
    hddCount: '',
    battery: '',
    charger: '',
    memory: '',
    rec: '',
    c: '',
    f: '',
    r2Applicability: '',
    dataSanitization: '',
    hdd1Serial: '',
    hdd1Size: '',
    hdd1Wipe: '',
    hdd1Destruction: '',
    hdd2Serial: '',
    hdd2Size: '',
    hdd2Wipe: '',
    hdd2Destruction: '',
    technicianName: '',
    testDate: '',
    comments: '',
    additionalNotes: '',
    remarketPrice: '',
    serviceFee: '',
  }
}

/** Convierte fila de tabla a formulario (edición individual). */
export function rowToEvidenceForm(row: {
  make?: string | null
  model?: string | null
  device?: string | null
  serialNumber?: string | null
  customerAssetTag?: string | null
  mainBoardPart?: string | null
  cpu?: string | null
  ramCapacityGb?: string | null
  ramType?: string | null
  screenSize?: string | null
  weightLbs?: string | null
  hddCount?: number | null
  battery?: string | null
  charger?: string | null
  memory?: string | null
  classificationRec?: string | null
  cosmeticConditions?: string | null
  classificationC?: string | null
  functionalConditions?: string | null
  classificationF?: string | null
  r2Applicability?: string | null
  dataSanitization?: string | null
  hdd1Serial?: string | null
  hdd1Size?: string | null
  hdd1Wipe?: string | null
  hdd1Destruction?: string | null
  hdd2Serial?: string | null
  hdd2Size?: string | null
  hdd2Wipe?: string | null
  hdd2Destruction?: string | null
  technicianName?: string | null
  testDate?: string | null
  processedTime?: string | null
  comments?: string | null
  additionalNotes?: string | null
  remarketPrice?: number | null
  serviceFee?: number | null
}): EvidenceReportFormState {
  const f = emptyEvidenceReportForm()
  f.make = row.make || ''
  f.model = row.model || ''
  f.device = row.device || ''
  f.serialNumber = row.serialNumber || ''
  f.customerAssetTag = row.customerAssetTag || ''
  f.mainBoardPart = row.mainBoardPart || ''
  f.cpu = row.cpu || ''
  f.ramCapacityGb = row.ramCapacityGb || ''
  f.ramType = row.ramType || ''
  f.screenSize = row.screenSize || ''
  f.weightLbs = row.weightLbs || ''
  f.hddCount = row.hddCount != null ? String(row.hddCount) : ''
  f.battery = row.battery || ''
  f.charger = row.charger || ''
  f.memory = row.memory || ''
  f.rec = row.classificationRec || ''
  f.c = row.cosmeticConditions || row.classificationC || ''
  f.f = row.functionalConditions || row.classificationF || ''
  f.r2Applicability = row.r2Applicability || ''
  f.dataSanitization = row.dataSanitization || ''
  f.hdd1Serial = row.hdd1Serial || ''
  f.hdd1Size = row.hdd1Size || ''
  f.hdd1Wipe = row.hdd1Wipe || ''
  f.hdd1Destruction = row.hdd1Destruction || ''
  f.hdd2Serial = row.hdd2Serial || ''
  f.hdd2Size = row.hdd2Size || ''
  f.hdd2Wipe = row.hdd2Wipe || ''
  f.hdd2Destruction = row.hdd2Destruction || ''
  f.technicianName = row.technicianName || ''
  f.testDate = row.testDate || row.processedTime || ''
  f.comments = row.comments || ''
  f.additionalNotes = row.additionalNotes || ''
  f.remarketPrice = row.remarketPrice != null ? String(row.remarketPrice) : ''
  f.serviceFee = row.serviceFee != null ? String(row.serviceFee) : ''
  return f
}

/** Patch para API: individual guarda toda la fila; masivo solo campos con texto. */
export function formToPatch(
  form: EvidenceReportFormState,
  mode: 'single' | 'bulk'
): EvidenceReportPatch {
  const patch: EvidenceReportPatch = {}
  for (const key of Object.keys(form) as (keyof EvidenceReportFormState)[]) {
    const value = form[key].trim()
    if (mode === 'bulk' && !value) continue
    ;(patch as Record<string, string | null>)[key] = value || null
  }
  return patch
}