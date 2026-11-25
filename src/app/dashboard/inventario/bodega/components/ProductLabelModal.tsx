/* eslint-disable @next/next/no-img-element */
'use client'

import { X, Printer, Info } from 'lucide-react'
import { useState, useEffect } from 'react'
import { TECHCORPS_LETTERHEAD } from '@/lib/ventas/techcorpsLetterhead'
import {
  PRODUCT_LABEL_PRINTERS,
  buildProductLabelPrintDocument,
  getProductLabelPrinterProfile,
  labelPreviewWidthPx,
  loadProductLabelPrinterPreference,
  saveProductLabelPrinterPreference,
  type ProductLabelAsset,
  type ProductLabelPrinterId,
} from '@/lib/inventario/productLabelPrint'
import {
  formatDiskLabel,
  formatRamLabel,
  resolveAssetHardwareSpecs,
} from '@/lib/inventario/resolveAssetHardwareSpecs'

type ProductLabelModalProps = {
  asset: ProductLabelAsset & {
    id: string
    specifications?: Record<string, unknown> | null
  }
  onClose: () => void
}

export default function ProductLabelModal({ asset, onClose }: ProductLabelModalProps) {
  const [barcodeUrl, setBarcodeUrl] = useState<string>('')
  const [printerId, setPrinterId] = useState<ProductLabelPrinterId>('dymo-30256')

  useEffect(() => {
    setPrinterId(loadProductLabelPrinterPreference())
  }, [])

  useEffect(() => {
    if (asset.serial_number) {
      const url = `/api/utils/generate-barcode?value=${encodeURIComponent(asset.serial_number)}&text=0`
      setBarcodeUrl(url)
    }
  }, [asset.serial_number])

  const classifications = asset.inputClassifications || {}
  const specs = {
    ...resolveAssetHardwareSpecs(asset.specifications ?? null),
    ...(asset.hardwareSpecs || {}),
  }
  const ramLabel = formatRamLabel(specs)
  const diskLabel = formatDiskLabel(specs)
  const profile = getProductLabelPrinterProfile(printerId)
  const previewWidth = labelPreviewWidthPx(profile)

  const handlePrinterChange = (id: ProductLabelPrinterId) => {
    setPrinterId(id)
    saveProductLabelPrinterPreference(id)
  }

  const handlePrint = () => {
    if (!barcodeUrl) return

    const origin = window.location.origin
    const brandLogoSrc = `${origin}${TECHCORPS_LETTERHEAD.logoPrintSrc}`
    const barcodeAbsoluteUrl = barcodeUrl.startsWith('http') ? barcodeUrl : `${origin}${barcodeUrl}`

    const html = buildProductLabelPrintDocument({
      asset: { ...asset, hardwareSpecs: specs },
      barcodeAbsoluteUrl,
      brandLogoSrc,
      printerId,
    })

    const printWindow = window.open('', '_blank', 'width=480,height=640')
    if (!printWindow) {
      alert('Permita ventanas emergentes para imprimir la etiqueta.')
      return
    }
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    window.setTimeout(() => {
      printWindow.print()
    }, 450)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-surface-800 bg-surface-950/95 p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Etiqueta de Producto</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-surface-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-surface-400" />
          </button>
        </div>

        <label className="block space-y-1.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-surface-400">
            Impresora / tamaño de etiqueta
          </span>
          <select
            value={printerId}
            onChange={(e) => handlePrinterChange(e.target.value as ProductLabelPrinterId)}
            className="w-full rounded-xl border border-surface-700 bg-surface-900 text-white text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            {PRODUCT_LABEL_PRINTERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-[11px] text-sky-100 leading-snug">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-sky-400" />
          <p>{profile.driverHint}</p>
        </div>

        <div
          id="label-print-content"
          className="mx-auto border-2 border-surface-700 rounded-2xl p-3 bg-white text-black"
          style={{ width: previewWidth, maxWidth: '100%', fontSize: profile.compact ? '9px' : '11px' }}
        >
          <div className="flex justify-center pb-2 mb-2 border-b border-gray-300">
            <img
              src={TECHCORPS_LETTERHEAD.logoPrintSrc}
              alt="Techcorp TC"
              className={profile.compact ? 'h-5 max-w-[100px] object-contain' : 'h-7 w-auto max-w-[130px] object-contain'}
            />
          </div>
          <div className="text-center mb-2 pb-2 border-b border-gray-300">
            <p className="text-[9px] text-gray-600 font-bold">TICKET</p>
            <p className="text-xs font-bold text-slate-900 truncate">{asset.ticket_code || 'N/A'}</p>
          </div>

          <div className="text-center mb-2">
            <p className="text-[9px] font-bold mb-0.5">S/N</p>
            {barcodeUrl ? (
              <img
                src={barcodeUrl}
                alt="Barcode"
                style={{
                  display: 'block',
                  margin: '0 auto',
                  maxWidth: '100%',
                  height: profile.compact ? 28 : 40,
                }}
              />
            ) : null}
            <p className="font-mono text-[9px] font-bold mt-0.5">{asset.serial_number || '—'}</p>
          </div>

          <div className={profile.compact ? 'space-y-1' : 'grid grid-cols-2 gap-1.5'}>
            <div>
              <p className="text-[9px] font-bold text-slate-600">MARCA</p>
              <p className="text-[10px] font-semibold text-slate-900 truncate">{asset.manufacturer || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-600">{profile.compact ? 'MODELO · TIPO' : 'MODELO'}</p>
              <p className="text-[10px] font-semibold text-slate-900 truncate">
                {profile.compact
                  ? `${asset.model || 'N/A'} · ${asset.asset_type || 'N/A'}`
                  : asset.model || 'N/A'}
              </p>
            </div>
            {!profile.compact ? (
              <div>
                <p className="text-[9px] font-bold text-slate-600">TIPO</p>
                <p className="text-[10px] font-semibold text-slate-900 truncate">{asset.asset_type || 'N/A'}</p>
              </div>
            ) : null}
            {(classifications.rec || classifications.f || classifications.c) && (
              <div>
                <p className="text-[9px] font-bold text-slate-600">CLASIFICACIÓN</p>
                <div className="flex flex-wrap gap-0.5">
                  {classifications.rec && (
                    <span className="bg-blue-100 text-blue-900 px-1 py-0.5 rounded text-[8px] font-bold">
                      REC: {classifications.rec}
                    </span>
                  )}
                  {classifications.f && (
                    <span className="bg-purple-100 text-purple-900 px-1 py-0.5 rounded text-[8px] font-bold">
                      F: {classifications.f}
                    </span>
                  )}
                  {classifications.c && (
                    <span className="bg-amber-100 text-amber-900 px-1 py-0.5 rounded text-[8px] font-bold">
                      C: {classifications.c}
                    </span>
                  )}
                </div>
              </div>
            )}
            <div className={profile.compact ? '' : 'col-span-2'}>
              <p className="text-[9px] font-bold text-slate-600">ESPECIFICACIONES</p>
              <div className="flex flex-col gap-0.5">
                <span className="bg-indigo-100 text-indigo-900 px-1 py-0.5 rounded text-[8px] font-bold">
                  RAM: {ramLabel || '—'}
                </span>
                <span className="bg-indigo-100 text-indigo-900 px-1 py-0.5 rounded text-[8px] font-bold">
                  Disco NVM: {diskLabel || '—'}
                </span>
                {specs.processor ? (
                  <span className="bg-indigo-100 text-indigo-900 px-1 py-0.5 rounded text-[8px] font-bold truncate">
                    CPU: {specs.processor}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handlePrint}
            disabled={!barcodeUrl}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors"
          >
            <Printer size={18} />
            Imprimir
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-surface-800 hover:bg-surface-700 text-white rounded-xl font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}