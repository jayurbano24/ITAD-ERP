/* eslint-disable @next/next/no-img-element */
'use client'

import { X, Printer } from 'lucide-react'
import { useState, useEffect } from 'react'

type WorkshopClassifications = { rec?: string; f?: string; c?: string }

type HardwareSpecs = {
  processor?: string | null
  ram_capacity?: string | null
  ram_type?: string | null
  disk_capacity?: string | null
  disk_type?: string | null
  keyboard_type?: string | null
  keyboard_version?: string | null
  bios_version?: string | null
}

type LabelAsset = {
  id: string
  serial_number: string | null
  manufacturer: string | null
  model: string | null
  asset_type: string | null
  ticket_code?: string | null
  batch_code?: string | null
  inputClassifications?: WorkshopClassifications
  hardwareSpecs?: HardwareSpecs
}

type ProductLabelModalProps = {
  asset: LabelAsset
  onClose: () => void
}

export default function ProductLabelModal({ asset, onClose }: ProductLabelModalProps) {
  const [barcodeUrl, setBarcodeUrl] = useState<string>('')

  useEffect(() => {
    if (asset.serial_number) {
      const url = `/api/utils/generate-barcode?value=${encodeURIComponent(asset.serial_number)}`
      setBarcodeUrl(url)
    }
  }, [asset.serial_number])

  // Extrae las clasificaciones e specs del asset
  const classifications = asset.inputClassifications || {}
  const specs = asset.hardwareSpecs || {}

  const handlePrint = () => {
    const printContent = document.getElementById('label-print-content')
    if (!printContent) return

    const printWindow = window.open('', '', 'width=400,height=300')
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <title>Etiqueta de Producto</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 3px;
              background: white;
            }
            .label {
              border: 1px solid #000;
              padding: 6px;
              width: 100%;
              box-sizing: border-box;
              font-size: 10px;
              max-width: 350px;
            }
            .header-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
              font-size: 8px;
              border-bottom: 0.5px solid #ccc;
              padding-bottom: 2px;
            }
            .header-item {
              flex: 1;
              text-align: center;
            }
            .barcode-row {
              margin-bottom: 4px;
              text-align: center;
            }
            .barcode-row div {
              font-weight: bold;
              font-size: 7px;
              margin-bottom: 1px;
              text-transform: uppercase;
            }
            .barcode-row img {
              max-width: 100%;
              height: 40px;
            }
            .data-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 4px;
              margin-bottom: 3px;
            }
            .data-item {
              padding: 0;
            }
            .label-title {
              font-weight: bold;
              font-size: 8px;
              text-transform: uppercase;
              color: #333;
              margin-bottom: 1px;
            }
            .label-value {
              font-size: 9px;
              font-weight: bold;
              color: #000;
              word-break: break-word;
            }
            .classifications {
              display: flex;
              flex-wrap: wrap;
              gap: 2px;
            }
            .classification {
              display: inline-block;
              background-color: #e3f2fd;
              padding: 1px 3px;
              border-radius: 2px;
              font-size: 7px;
              font-weight: bold;
              border: 0.5px solid #1976d2;
            }
            .specifications-list {
              display: flex;
              flex-direction: column;
              gap: 1px;
            }
            .spec {
              display: block;
              background-color: #f3e5f5;
              padding: 1px 3px;
              border-radius: 2px;
              font-size: 7px;
              font-weight: bold;
              border: 0.5px solid #7b1fa2;
            }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="header-info">
              <div class="header-item">
                <div style="color: #666;">Ticket</div>
                <div style="font-weight: bold;">${asset.ticket_code || 'N/A'}</div>
              </div>
              <div class="header-item">
                <div style="color: #666;">Lote</div>
                <div style="font-weight: bold;">${asset.batch_code || 'N/A'}</div>
              </div>
            </div>
            
            <div class="barcode-row">
              <div>S/N</div>
              <img src="${barcodeUrl}" alt="Barcode" style="display:block; margin:0 auto; max-width:200px; height:auto;" />
            </div>
            
            <div class="data-grid">
              <div class="data-item">
                <div class="label-title">Marca</div>
                <div class="label-value">${asset.manufacturer || 'N/A'}</div>
              </div>

              <div class="data-item">
                <div class="label-title">Modelo</div>
                <div class="label-value">${asset.model || 'N/A'}</div>
              </div>

              <div class="data-item">
                <div class="label-title">Tipo</div>
                <div class="label-value">${asset.asset_type || 'N/A'}</div>
              </div>

              <div class="data-item">
                <div class="label-title">Clasificación</div>
                <div class="classifications">
                  ${classifications?.rec ? `<span class="classification">REC: ${classifications.rec}</span>` : ''}
                  ${classifications?.f ? `<span class="classification">F: ${classifications.f}</span>` : ''}
                  ${classifications?.c ? `<span class="classification">C: ${classifications.c}</span>` : ''}
                </div>
              </div>

              <div class="data-item">
                <div class="label-title">Especificaciones</div>
                <div class="specifications-list">
                  ${specs?.ram_capacity ? `<span class="spec">RAM: ${specs.ram_capacity}${specs.ram_type ? ' ' + specs.ram_type : ''}</span>` : ''}
                  ${specs?.disk_capacity ? `<span class="spec">Disco: ${specs.disk_capacity}${specs.disk_type ? ' ' + specs.disk_type : ''}</span>` : ''}
                  ${specs?.processor ? `<span class="spec">CPU: ${specs.processor}</span>` : ''}
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-surface-800 bg-surface-950/95 p-6 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Etiqueta de Producto</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-surface-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-surface-400" />
          </button>
        </div>

        {/* Preview de la etiqueta */}
        <div
          id="label-print-content"
          className="border-2 border-surface-700 rounded-2xl p-3 bg-white text-black"
          style={{ width: '400px', fontSize: '11px' }}
        >
          {/* Header con Ticket y Lote */}
          <div className="flex justify-between text-center mb-2 pb-2 border-b border-gray-300">
            <div className="flex-1">
              <p className="text-[10px] text-gray-600 font-bold">TICKET</p>
              <p className="text-xs font-bold text-slate-900">{asset.ticket_code || 'N/A'}</p>
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-gray-600 font-bold">LOTE</p>
              <p className="text-xs font-bold text-slate-900">{asset.batch_code || 'N/A'}</p>
            </div>
          </div>

          {/* Barcode compacto */}
          <div className="text-center mb-2">
            <p className="text-[9px] font-bold text-center mb-0.5">S/N</p>
            {barcodeUrl && (
              <img src={barcodeUrl} alt="Barcode" style={{ display: 'block', margin: '0 auto', maxWidth: '200px', height: 'auto' }} />
            )}
          </div>

          {/* Grid de datos en 2 columnas */}
          <div className="grid grid-cols-2 gap-1.5 mb-2">
            <div>
              <p className="text-[9px] font-bold text-slate-600">MARCA</p>
              <p className="text-[10px] font-semibold text-slate-900 truncate">{asset.manufacturer || 'N/A'}</p>
            </div>

            <div>
              <p className="text-[9px] font-bold text-slate-600">MODELO</p>
              <p className="text-[10px] font-semibold text-slate-900 truncate">{asset.model || 'N/A'}</p>
            </div>

            <div>
              <p className="text-[9px] font-bold text-slate-600">TIPO</p>
              <p className="text-[10px] font-semibold text-slate-900 truncate">{asset.asset_type || 'N/A'}</p>
            </div>

            <div>
              <p className="text-[9px] font-bold text-slate-600">CLASIFICACIÓN</p>
              <div className="flex flex-wrap gap-0.5">
                {classifications?.rec && (
                  <span className="bg-blue-100 text-blue-900 px-1 py-0.5 rounded text-[8px] font-bold">
                    REC: {classifications.rec}
                  </span>
                )}
                {classifications?.f && (
                  <span className="bg-purple-100 text-purple-900 px-1 py-0.5 rounded text-[8px] font-bold">
                    F: {classifications.f}
                  </span>
                )}
                {classifications?.c && (
                  <span className="bg-amber-100 text-amber-900 px-1 py-0.5 rounded text-[8px] font-bold">
                    C: {classifications.c}
                  </span>
                )}
              </div>
            </div>

            <div>
              <p className="text-[9px] font-bold text-slate-600">ESPECIFICACIONES</p>
              <div className="flex flex-col gap-0.5">
                {specs?.ram_capacity && (
                  <span className="bg-indigo-100 text-indigo-900 px-1 py-0.5 rounded text-[8px] font-bold">
                    RAM: {specs.ram_capacity}{specs.ram_type ? ` ${specs.ram_type}` : ''}
                  </span>
                )}
                {specs?.disk_capacity && (
                  <span className="bg-indigo-100 text-indigo-900 px-1 py-0.5 rounded text-[8px] font-bold">
                    Disco: {specs.disk_capacity}{specs.disk_type ? ` ${specs.disk_type}` : ''}
                  </span>
                )}
                {specs?.processor && (
                  <span className="bg-indigo-100 text-indigo-900 px-1 py-0.5 rounded text-[8px] font-bold">
                    CPU: {specs.processor}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-colors"
          >
            <Printer size={18} />
            Imprimir
          </button>
          <button
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
