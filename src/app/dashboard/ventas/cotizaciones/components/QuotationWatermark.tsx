import Image from 'next/image'
import { TECHCORPS_LETTERHEAD } from '@/lib/ventas/techcorpsLetterhead'

export default function QuotationWatermark() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden"
      aria-hidden
    >
      <Image
        src={TECHCORPS_LETTERHEAD.logoSrc}
        alt=""
        width={320}
        height={128}
        className="w-[min(68%,20rem)] h-auto opacity-[0.05] dark:opacity-[0.04] select-none print:opacity-[0.08]"
      />
    </div>
  )
}
