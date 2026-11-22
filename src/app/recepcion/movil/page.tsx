'use client'

import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import ReceptionMobileCapture from '../components/ReceptionMobileCapture'

export default function ReceptionMobilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20 text-cyan-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      }
    >
      <ReceptionMobileCapture />
    </Suspense>
  )
}