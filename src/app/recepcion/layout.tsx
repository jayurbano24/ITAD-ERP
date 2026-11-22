import type { ReactNode } from 'react'

export const dynamic = 'force-dynamic'

/** Layout raíz: los hijos definen si usan escritorio (sidebar) o móvil. */
export default function RecepcionRootLayout({ children }: { children: ReactNode }) {
  return children
}