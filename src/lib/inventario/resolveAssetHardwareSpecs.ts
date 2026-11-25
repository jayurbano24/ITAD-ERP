export type ResolvedHardwareSpecs = {
  processor?: string
  processor_brand?: string
  processor_generation?: string
  processor_family?: string
  ram_capacity?: string
  ram_type?: string
  disk_capacity?: string
  disk_type?: string
  keyboard_type?: string
  keyboard_version?: string
  screen_size?: string
  bios_version?: string
}

function pickString(...values: unknown[]): string | undefined {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return undefined
}

/** Une hardware_specs del asset con claves sueltas en specifications (recepción / legacy). */
export function resolveAssetHardwareSpecs(specifications: unknown): ResolvedHardwareSpecs {
  if (!specifications || typeof specifications !== 'object') return {}
  const root = specifications as Record<string, unknown>
  const hw =
    root.hardware_specs && typeof root.hardware_specs === 'object'
      ? (root.hardware_specs as Record<string, unknown>)
      : {}

  const ram_capacity = pickString(hw.ram_capacity, root.ram_capacity, root.ram, root.memory_gb)
  let ram_type = pickString(hw.ram_type, root.ram_type, root.memory_type, root.ddr_type)

  if (ram_capacity && !ram_type) {
    const inCapacity = ram_capacity.match(/\bDDR\d\b/i)
    if (inCapacity) ram_type = inCapacity[0].toUpperCase()
  }

  return {
    processor: pickString(hw.processor, root.processor),
    processor_brand: pickString(hw.processor_brand, root.processor_brand),
    processor_generation: pickString(hw.processor_generation, root.processor_generation),
    processor_family: pickString(hw.processor_family, root.processor_family),
    ram_capacity,
    ram_type,
    disk_capacity: pickString(hw.disk_capacity, root.disk_capacity, root.disk),
    disk_type: pickString(hw.disk_type, root.disk_type),
    keyboard_type: pickString(hw.keyboard_type, root.keyboard_type),
    keyboard_version: pickString(hw.keyboard_version, root.keyboard_version),
    screen_size: pickString(hw.screen_size, root.screen_size),
    bios_version: pickString(hw.bios_version, root.bios_version),
  }
}

export function formatRamLabel(specs: ResolvedHardwareSpecs): string | null {
  const cap = specs.ram_capacity
  const typ = specs.ram_type
  if (!cap && !typ) return null
  if (cap && typ) return `${cap} ${typ}`.replace(/\s+/g, ' ').trim()
  return cap || typ || null
}

function normalizeDiskType(type: string | undefined): string | undefined {
  if (!type) return undefined
  const t = type.trim()
  if (/^nvm(e|m)?$/i.test(t) || /nvme/i.test(t)) return 'NVMe'
  return t
}

/** Capacidad + tipo de almacenamiento (prioriza etiqueta NVMe). */
export function formatDiskLabel(specs: ResolvedHardwareSpecs): string | null {
  const cap = specs.disk_capacity
  const typ = normalizeDiskType(specs.disk_type)
  if (cap && typ) return `${cap} ${typ}`.replace(/\s+/g, ' ').trim()
  if (cap) return cap
  if (typ) return typ
  return null
}

export function formatGenerationLabel(specs: ResolvedHardwareSpecs): string | null {
  const gen = specs.processor_generation?.trim()
  if (gen) return gen
  const proc = specs.processor || ''
  const m = proc.match(/\b(\d{1,2})(?:st|nd|rd|th)\s*gen\b/i)
  if (m) return m[0]
  return null
}