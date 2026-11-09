import Image from 'next/image'
import {
  TECHCORPS_HEADER_CONTACT_LINES,
  TECHCORPS_LETTERHEAD,
} from '@/lib/ventas/techcorpsLetterhead'

type Props = {
  className?: string
}

export default function QuotationLetterhead({ className }: Props) {
  const h = TECHCORPS_LETTERHEAD

  return (
    <header
      className={`rounded-xl border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 overflow-hidden print:border-gray-300 ${className ?? ''}`}
    >
      <div className="flex items-start gap-3 p-3 sm:p-4">
        <div className="shrink-0 bg-transparent pt-0.5">
          <Image
            src={h.logoSrc}
            alt={`Logo ${h.tradeName}`}
            width={120}
            height={48}
            className="h-11 w-auto object-contain"
            priority
          />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-base sm:text-lg font-extrabold text-indigo-950 dark:text-white tracking-tight">
            {h.legalName}
          </p>

          <div className="mt-1.5 space-y-0.5 text-[11px] leading-snug text-gray-600 dark:text-surface-400">
            <p>{TECHCORPS_HEADER_CONTACT_LINES[0]}</p>
            <p>{TECHCORPS_HEADER_CONTACT_LINES[1]}</p>
            <p>
              <a
                href={`mailto:${h.email}`}
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              >
                {TECHCORPS_HEADER_CONTACT_LINES[2]}
              </a>
              <span className="text-gray-400 dark:text-surface-500 mx-1.5">·</span>
              <span className="text-gray-500 dark:text-surface-500">{h.hours}</span>
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}
