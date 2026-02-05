import type { ReactNode } from 'react'
import DashboardLayout from '../dashboard/layout'

export const dynamic = 'force-dynamic'

export default function RecepcionLayout({ children }: { children: ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>
}
