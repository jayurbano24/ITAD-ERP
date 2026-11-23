'use client'

import { useEffect, useMemo, useState } from 'react'
import DateYmdPicker, { isValidYmd } from '@/components/ui/DateYmdPicker'

type Props = {
  month?: string
  currentMonthValue: string
  q?: string
  status?: string
}

export default function VentasMonthFilterForm({ month, currentMonthValue, q, status }: Props) {
  const initialYmd = useMemo(() => {
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      return `${month}-01`
    }
    return `${currentMonthValue}-01`
  }, [month, currentMonthValue])

  const [pickedDate, setPickedDate] = useState(initialYmd)

  useEffect(() => {
    setPickedDate(initialYmd)
  }, [initialYmd])
  const monthParam = isValidYmd(pickedDate) ? pickedDate.slice(0, 7) : currentMonthValue

  return (
    <form action="/dashboard/ventas" method="get" className="flex items-center gap-1.5 sm:ml-auto">
      {q ? <input type="hidden" name="q" value={q} /> : null}
      {status ? <input type="hidden" name="status" value={status} /> : null}
      <input type="hidden" name="month" value={monthParam} />
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-surface-500">
        Mes
      </span>
      <DateYmdPicker
        value={pickedDate}
        onChange={setPickedDate}
        aria-label="Elegir mes para ingresos"
      />
      <button
        type="submit"
        className="h-8 px-2.5 rounded-md bg-surface-800 hover:bg-surface-700 text-white text-xs font-bold"
      >
        Ver
      </button>
    </form>
  )
}