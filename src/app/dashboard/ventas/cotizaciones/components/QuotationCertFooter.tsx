import Image from 'next/image'
import { TECHCORPS_LETTERHEAD } from '@/lib/ventas/techcorpsLetterhead'
import { cn } from '@/lib/utils'

type Props = {
  className?: string
  /** Ancla al borde inferior de la hoja de cotización (ancho completo). */
  sheetBottom?: boolean
}

export default function QuotationCertFooter({ className, sheetBottom = true }: Props) {
  return (
    <footer
      className={cn(
        sheetBottom && 'mt-auto shrink-0 w-full',
        'border-t border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 print:bg-white',
        sheetBottom ? 'pt-2 pb-1 px-0' : 'pt-3',
        className
      )}
    >
      <Image
        src={TECHCORPS_LETTERHEAD.certFooterSrc}
        alt={TECHCORPS_LETTERHEAD.certFooterAlt}
        width={1600}
        height={96}
        className="w-full h-auto min-h-[3rem] sm:min-h-[3.25rem] object-contain object-center print:min-h-[1.05in] print:w-full print:object-left"
        sizes="(max-width: 896px) 100vw, 896px"
        priority={false}
      />
    </footer>
  )
}