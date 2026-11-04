'use client'

import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import type { WipedAssetForCertificate, WipeReportSnapshot } from '../actions'

interface CertificateGeneratorProps {
  assets: WipedAssetForCertificate[]
  company?: CompanyInfo
}

interface CompanyInfo {
  name: string
  nit?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  logo_url?: string | null
  primary_color?: string | null
  secondary_color?: string | null
}

const softwareNames: Record<string, string> = {
  blancco: 'Blancco Drive Eraser',
  killdisk: 'KillDisk',
  wipedrive: 'WipeDrive',
  physical_destruction: 'Destrucción Física',
  other: 'Software Certificado',
}

function esc(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function softwareLabel(asset: WipedAssetForCertificate): string {
  const fromReport = asset.wipe_report?.software
  if (fromReport) return fromReport
  return softwareNames[asset.wipe_software || 'other'] || asset.wipe_software || 'Software Certificado'
}

function wipeStatusDisplay(status: string | null | undefined): { text: string; ok: boolean } {
  if (!status) return { text: 'Erased', ok: true }
  const s = status.toLowerCase()
  if (/eras|pass|success/.test(s)) return { text: 'Erased', ok: true }
  if (/fail/.test(s)) return { text: 'Failed', ok: false }
  return { text: status, ok: false }
}

function field(label: string, value: string | number | null | undefined, opts?: { green?: boolean; bold?: boolean }): string {
  if (value === null || value === undefined || value === '') return ''
  const cls = [opts?.green ? 'val-ok' : '', opts?.bold ? 'val-bold' : ''].filter(Boolean).join(' ')
  return `
    <div class="field">
      <span class="fl">${esc(label)}</span>
      <span class="fv ${cls}">${esc(value)}</span>
    </div>`
}

function buildReportPages(assets: WipedAssetForCertificate[], companyName: string, logoHtml: string): string {
  return assets
    .map((asset) => {
      const r: WipeReportSnapshot | null = asset.wipe_report
      const make = r?.make || asset.manufacturer || ''
      const model = r?.model || asset.model || ''
      const serial = r?.serialNumber || asset.serial_number || ''
      const soft = softwareLabel(asset)
      const stamp =
        r?.testDate ||
        r?.processedTime?.split('/')?.[1]?.trim() ||
        r?.processedTime ||
        (asset.wipe_completed_at
          ? new Date(asset.wipe_completed_at).toISOString().replace('T', ' ').slice(0, 19) + ' (+0000)'
          : '')
      const topbar = [stamp, soft, make.toUpperCase(), model.toUpperCase(), serial]
        .filter(Boolean)
        .join(', ')

      const customer = r?.customerName || asset.client_name || ''
      const tech = r?.technicianName || ''
      const disks =
        r?.disks && r.disks.length > 0
          ? r.disks
          : [
              {
                index: 1,
                vendor: null as string | null,
                model: null as string | null,
                serial: null as string | null,
                size: null as string | null,
                bus: null as string | null,
                wipeStatus: 'Erased' as string | null,
                destruction: 'No' as string | null,
                method: null as string | null,
                startEnd: r?.processedTime || null,
                duration: null as string | null,
                health: null as string | null,
              },
            ]

      const diskSections = disks
        .map((disk) => {
          const st = wipeStatusDisplay(disk.wipeStatus)
          const startEnd = disk.startEnd || r?.processedTime || ''
          return `
          <section class="block">
            <h2>Erasure Results <span class="h2-sub">Disk: ${disk.index} (1-${disk.index})</span></h2>
            <div class="cols">
              <div class="col">
                ${field('Vendor', disk.vendor)}
                ${field('Model', disk.model)}
                ${field('Serial', disk.serial)}
                ${field('Size', disk.size)}
                ${field('Bus', disk.bus)}
                ${field('Health Status', disk.health, { green: /good/i.test(disk.health || '') })}
              </div>
              <div class="col">
                ${field('Start/End Time', startEnd)}
                ${field('Duration', disk.duration)}
                ${field('Method', disk.method)}
                ${field('Status', st.text, { green: st.ok, bold: true })}
              </div>
            </div>
          </section>`
        })
        .join('')

      const ramLine =
        [r?.ramCapacityGb, r?.ramType].filter(Boolean).join(', ') || ''

      return `
      <article class="page">
        <div class="topbar">${esc(topbar)}</div>

        <header class="title-row">
          <h1>Data Erasure Report</h1>
          <div class="logo-slot">${logoHtml}</div>
        </header>

        <section class="block">
          <h2>Licensing and Customer Details</h2>
          <div class="cols">
            <div class="col">
              ${field('Licensed To', companyName)}
              ${field('Customer Name', customer)}
              ${field('Customer Location', 'GUATEMALA')}
            </div>
            <div class="col">
              ${field('Erasure Provider', companyName)}
              ${field('Erasure Technician', tech)}
            </div>
          </div>
        </section>

        ${diskSections}

        <section class="block">
          <h2>Hardware Details</h2>
          <div class="cols">
            <div class="col">
              ${field('Manufacturer', make)}
              ${field('Chassis Type', asset.asset_type === 'Laptop' ? 'Notebook' : asset.asset_type)}
              ${field('Model', model)}
              ${field('Serial', serial)}
              ${field('System Board', r?.mainBoardPart)}
            </div>
            <div class="col">
              ${field('Processor', r?.cpu)}
              ${field('Memory', ramLine)}
              ${field('Display', r?.screenSize)}
              ${field('Internal Tag', asset.internal_tag)}
              ${field('Report ID', asset.wipe_certificate_id || r?.reportUuid)}
            </div>
          </div>
        </section>

        <footer class="foot">
          <div class="sign">
            <div class="line"></div>
            <div>OPERATOR</div>
            ${tech ? `<div class="sign-name">${esc(tech)}</div>` : ''}
          </div>
          <div class="sign">
            <div class="line"></div>
            <div>SUPERVISOR</div>
          </div>
        </footer>
      </article>`
    })
    .join('')
}

export function CertificateGenerator({ assets, company }: CertificateGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const companyName = company?.name || 'ITAD ERP Guatemala'
  const primary = company?.primary_color || '#1d4ed8'
  const logoHtml = company?.logo_url
    ? `<img src="${esc(company.logo_url)}" alt="${esc(companyName)}" class="logo-img" />`
    : `<div class="logo-text" style="color:${primary}"><strong>${esc(companyName)}</strong></div>`

  const generateCertificate = () => {
    if (assets.length === 0) {
      alert('No hay activos certificados para incluir en el documento')
      return
    }

    setIsGenerating(true)

    try {
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        alert('Por favor, permite las ventanas emergentes para generar el certificado')
        setIsGenerating(false)
        return
      }

      printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Data Erasure Report</title>
  <style>
    @page { size: letter; margin: 12mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10pt;
      color: #111;
      background: #d1d5db;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .no-print {
      max-width: 820px; margin: 16px auto; padding: 12px 16px;
      background: #1e40af; color: #fff; text-align: center; border-radius: 8px;
    }
    .no-print button {
      margin-top: 8px; background: #fff; color: #1e40af; border: none;
      padding: 8px 18px; font-weight: 700; border-radius: 4px; cursor: pointer;
    }
    .page {
      width: 8.5in; min-height: 11in; margin: 16px auto; background: #fff;
      padding: 0 16mm 16mm; page-break-after: always;
      box-shadow: 0 6px 24px rgba(0,0,0,.15);
    }
    .page:last-child { page-break-after: auto; }
    .topbar {
      background: #2563eb; color: #fff; font-size: 8pt;
      padding: 8px 12px; margin: 0 -16mm 18px;
      letter-spacing: 0.01em;
    }
    .title-row {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 22px; padding: 0 2px;
    }
    .title-row h1 {
      font-size: 26pt; font-weight: 700; color: #000; letter-spacing: -0.02em;
    }
    .logo-img { height: 42px; max-width: 160px; object-fit: contain; }
    .logo-text { text-align: right; font-size: 11pt; line-height: 1.2; max-width: 180px; }
    .block { margin-bottom: 22px; }
    .block h2 {
      font-size: 11pt; font-weight: 700; color: #4b5563;
      border-bottom: 1px solid #111; padding-bottom: 4px; margin-bottom: 10px;
    }
    .h2-sub { font-weight: 400; color: #6b7280; font-size: 10pt; }
    .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 28px; }
    .field {
      display: grid; grid-template-columns: 150px 1fr; gap: 8px;
      padding: 3px 0; align-items: baseline;
    }
    .fl { color: #111; font-size: 9.5pt; }
    .fv { color: #111; font-size: 9.5pt; word-break: break-word; }
    .val-ok { color: #15803d; font-weight: 700; }
    .val-bold { font-weight: 700; }
    .foot {
      display: flex; justify-content: space-between; gap: 48px;
      margin-top: 48px; padding-top: 8px;
    }
    .sign { flex: 1; text-align: center; font-size: 8pt; letter-spacing: 0.1em; color: #374151; }
    .sign .line { border-top: 1px solid #111; margin: 40px 12px 6px; }
    .sign-name { margin-top: 4px; letter-spacing: 0; font-size: 9pt; color: #111; }
    @media print {
      body { background: #fff; }
      .no-print { display: none !important; }
      .page { margin: 0; box-shadow: none; width: auto; min-height: auto; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <strong>Data Erasure Report</strong><br />
    <small>${assets.length} equipo(s)</small><br />
    <button onclick="window.print()">Imprimir / Guardar PDF</button>
  </div>
  ${buildReportPages(assets, companyName, logoHtml)}
</body>
</html>`)

      printWindow.document.close()
    } catch (err) {
      console.error('Error generando certificado:', err)
      alert('Error al generar el certificado')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <button
      onClick={generateCertificate}
      disabled={isGenerating || assets.length === 0}
      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 
               text-white font-semibold rounded-xl transition-colors
               disabled:opacity-50 disabled:cursor-not-allowed"
      title={assets.length === 0 ? 'No hay activos certificados' : `Generar reporte para ${assets.length} equipos`}
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Generando...</span>
        </>
      ) : (
        <>
          <FileDown className="w-4 h-4" />
          <span>Descargar Certificado ({assets.length})</span>
        </>
      )}
    </button>
  )
}
