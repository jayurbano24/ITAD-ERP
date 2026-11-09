export const CLASSIFICATION_F_OPTIONS = [
  { value: 'F1', label: 'F1: Equipos coleccionables o especializados' },
  { value: 'F2', label: 'F2: Equipos electrónicos especializados verificados' },
  { value: 'F3', label: 'F3: Funciones esenciales en funcionamiento' },
  { value: 'F4', label: 'F4: Hardware funcionando' },
  { value: 'F5', label: 'F5: Reacondicionados' },
  { value: 'F6', label: 'F6: Como nuevos' },
] as const

export const CLASSIFICATION_C_OPTIONS = [
  { value: 'C0', label: 'C0: No categorizado' },
  { value: 'C1', label: 'C1: Averiado (recuperación de materiales)' },
  { value: 'C2', label: 'C2: Usado deficiente' },
  { value: 'C3', label: 'C3: Usado razonable' },
  { value: 'C4', label: 'C4: Usado bueno' },
  { value: 'C5', label: 'C5: Usado muy bueno' },
  { value: 'C6', label: 'C6: Usado excelente' },
  { value: 'C7', label: 'C7: Reacondicionado certificado' },
  { value: 'C8', label: 'C8: Sin usar' },
  { value: 'C9', label: 'C9: Nuevo, caja abierta' },
] as const

export const F_VALUES = new Set(CLASSIFICATION_F_OPTIONS.map((o) => o.value))
export const C_VALUES = new Set(CLASSIFICATION_C_OPTIONS.map((o) => o.value))
