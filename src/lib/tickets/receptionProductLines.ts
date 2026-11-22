export type ReceptionLineUnit = {
  id: string
  serie: string
  marca: string
  marcaId: string
  modelo: string
  modeloId: string
  tipo: string
  tipoId: string
}

export type ReceptionProductLine = {
  key: string
  marca: string
  marcaId: string
  modelo: string
  modeloId: string
  tipo: string
  tipoId: string
  quantity: number
  withSerial: number
  templateItemId: string
  units: ReceptionLineUnit[]
}

const buildProductLineKey = (unit: Pick<ReceptionLineUnit, 'marcaId' | 'modeloId' | 'tipoId' | 'marca' | 'modelo' | 'tipo'>) =>
  [unit.marcaId || unit.marca || 'sin-marca', unit.modeloId || unit.modelo || 'sin-modelo', unit.tipoId || unit.tipo || 'sin-tipo']
    .join('|')
    .toLowerCase()

export const groupUnitsIntoLines = (units: ReceptionLineUnit[]): ReceptionProductLine[] => {
  const map = new Map<string, ReceptionProductLine>()
  for (const unit of units) {
    const key = buildProductLineKey(unit)
    const existing = map.get(key)
    if (existing) {
      existing.units.push(unit)
      existing.quantity += 1
      if (unit.serie) existing.withSerial += 1
    } else {
      map.set(key, {
        key,
        marca: unit.marca,
        marcaId: unit.marcaId,
        modelo: unit.modelo,
        modeloId: unit.modeloId,
        tipo: unit.tipo,
        tipoId: unit.tipoId,
        quantity: 1,
        withSerial: unit.serie ? 1 : 0,
        templateItemId: unit.id,
        units: [unit],
      })
    }
  }
  return Array.from(map.values())
}