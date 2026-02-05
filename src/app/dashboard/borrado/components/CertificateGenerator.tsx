'use client'

import { useState } from 'react'
import { FileDown, Loader2, ShieldCheck, Calendar, Building2 } from 'lucide-react'
import type { WipedAssetForCertificate } from '../actions'

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

// Mapeo de software a nombres legibles
const softwareNames: Record<string, string> = {
  blancco: 'Blancco Drive Eraser',
  killdisk: 'KillDisk',
  wipedrive: 'WipeDrive',
  physical_destruction: 'Destrucción Física',
  other: 'Otro Software Certificado',
}

export function CertificateGenerator({ assets, company }: CertificateGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const companyName = company?.name || 'ITAD ERP Guatemala'
  const primary = company?.primary_color || '#059669'
  const secondary = company?.secondary_color || '#0d9488'
  const companyEmail = company?.email || 'certificaciones@itad.gt'
  const logoHtml = company?.logo_url
    ? `<img src="${company.logo_url}" alt="${companyName} Logo" class="logo-img" />`
    : `<div class="logo-icon">🛡️</div>`

  const generateCertificate = () => {
    if (assets.length === 0) {
      alert('No hay activos certificados para incluir en el documento')
      return
    }

    setIsGenerating(true)

    try {
      // Agrupar por cliente
      const byClient = assets.reduce((acc, asset) => {
        const client = asset.client_name || 'Sin Cliente'
        if (!acc[client]) acc[client] = []
        acc[client].push(asset)
        return acc
      }, {} as Record<string, WipedAssetForCertificate[]>)

      // Generar número de certificado único con fecha del movimiento
      const now = new Date()
      const dateStr = now.toISOString().split('T')[0].replace(/-/g, '')
      const randomToken = String(Date.now()).slice(-6)
      const certNumber = `CERT-${dateStr}-${randomToken}`
      const today = now.toLocaleDateString('es-GT', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })

      // Generar filas de la tabla
      const tableRows = assets.map((asset, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td class="mono">${asset.internal_tag}</td>
          <td class="mono">${asset.serial_number || 'N/A'}</td>
          <td>${asset.manufacturer || ''} ${asset.model || ''}</td>
          <td>${asset.asset_type}</td>
          <td>${softwareNames[asset.wipe_software || 'other'] || asset.wipe_software}</td>
          <td class="mono">${asset.wipe_certificate_id || 'N/A'}</td>
        </tr>
      `).join('')

      // Crear ventana con el certificado
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        alert('Por favor, permite las ventanas emergentes para generar el certificado')
        return
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>Certificado de Sanitización - ${certNumber}</title>
          <style>
            @page {
              size: letter;
              margin: 15mm;
            }
            
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              font-size: 11pt;
              line-height: 1.5;
              color: #1a1a1a;
              background: #f5f5f5;
              padding: 20px;
            }
            
            .certificate {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              padding: 40px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            }
            
            .header {
              text-align: center;
              border-bottom: 3px solid ${primary};
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            
            .logo {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 15px;
              margin-bottom: 10px;
            }
            
            .logo-icon {
              width: 50px;
              height: 50px;
              background: linear-gradient(135deg, ${primary}, ${secondary});
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 24px;
            }
            .logo-img {
              height: 50px;
              max-width: 220px;
              object-fit: contain;
              border-radius: 6px;
            }
            
            .company-name {
              font-size: 24pt;
              font-weight: bold;
              color: ${primary};
            }
            
            .title {
              font-size: 18pt;
              font-weight: bold;
              color: #1a1a1a;
              margin-top: 15px;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            
            .cert-number {
              font-family: 'Courier New', monospace;
              font-size: 12pt;
              color: #666;
              margin-top: 10px;
            }
            
            .meta {
              display: flex;
              justify-content: space-between;
              margin-bottom: 25px;
              padding: 15px;
              background: #f8fafb;
              border-radius: 8px;
            }
            
            .meta-item {
              text-align: center;
            }
            
            .meta-label {
              font-size: 9pt;
              color: #666;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            
            .meta-value {
              font-size: 11pt;
              font-weight: 600;
              color: #1a1a1a;
            }
            
            .declaration {
              background: linear-gradient(135deg, #ecfdf5, #f0fdfa);
              border-left: 4px solid ${primary};
              padding: 20px;
              margin-bottom: 25px;
              border-radius: 0 8px 8px 0;
            }
            
            .declaration h3 {
              color: #059669;
              margin-bottom: 10px;
              font-size: 12pt;
            }
            
            .declaration p {
              color: #374151;
              font-size: 10pt;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 25px;
              font-size: 9pt;
            }
            
            th {
              background: ${primary};
              color: white;
              padding: 10px 8px;
              text-align: left;
              font-weight: 600;
              text-transform: uppercase;
              font-size: 8pt;
              letter-spacing: 0.5px;
            }
            
            td {
              padding: 8px;
              border-bottom: 1px solid #e5e7eb;
            }
            
            tr:nth-child(even) {
              background: #f9fafb;
            }
            
            tr:hover {
              background: #ecfdf5;
            }
            
            .mono {
              font-family: 'Courier New', monospace;
              font-size: 8pt;
            }
            
            .compliance {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              margin-bottom: 25px;
            }
            
            .compliance-badge {
              text-align: center;
              padding: 10px;
              background: #f3f4f6;
              border-radius: 8px;
              font-size: 8pt;
              font-weight: 600;
              color: #374151;
            }
            
            .footer {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
            }
            
            .signature {
              text-align: center;
              width: 200px;
            }
            
            .signature-line {
              border-top: 1px solid #1a1a1a;
              margin-top: 50px;
              padding-top: 5px;
              font-size: 9pt;
              color: #666;
            }
            
            .qr-placeholder {
              width: 80px;
              height: 80px;
              border: 2px dashed #d1d5db;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 8pt;
              color: #9ca3af;
              text-align: center;
            }
            
            .legal {
              font-size: 8pt;
              color: #6b7280;
              text-align: center;
              margin-top: 20px;
              padding-top: 15px;
              border-top: 1px solid #e5e7eb;
            }
            
            .no-print {
              text-align: center;
              margin-bottom: 20px;
              padding: 15px;
              background: #059669;
              color: white;
              border-radius: 8px;
            }
            
            .no-print button {
              background: white;
              color: #059669;
              border: none;
              padding: 12px 30px;
              font-size: 14px;
              font-weight: 600;
              border-radius: 6px;
              cursor: pointer;
              margin-top: 10px;
            }
            
            .no-print button:hover {
              background: #ecfdf5;
            }
            
            @media print {
              body {
                background: white;
                padding: 0;
              }
              
              .certificate {
                box-shadow: none;
                padding: 0;
              }
              
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="no-print">
            <strong>Certificado de Sanitización de Datos</strong><br>
            <small>Vista previa - ${assets.length} equipos certificados</small><br>
            <button onclick="window.print()">📄 Imprimir / Guardar PDF</button>
          </div>
          
          <div class="certificate">
            <div class="header">
              <div class="logo">
                ${logoHtml}
                <span class="company-name">${companyName}</span>
              </div>
              <div class="title">Certificado de Sanitización de Datos</div>
              <div class="cert-number">N° ${certNumber}</div>
            </div>
            
            <div class="meta">
              <div class="meta-item">
                <div class="meta-label">Fecha de Emisión</div>
                <div class="meta-value">${today}</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">Total de Equipos</div>
                <div class="meta-value">${assets.length}</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">Clientes</div>
                <div class="meta-value">${Object.keys(byClient).length}</div>
              </div>
            </div>
            
            <div class="declaration">
              <h3>Declaración de Cumplimiento R2v3</h3>
              <p>
                Por medio del presente, <strong>${companyName}</strong> certifica que los equipos listados a continuación 
                han sido sometidos a un proceso de sanitización de datos conforme a los estándares internacionales 
                <strong>NIST 800-88</strong> (Guidelines for Media Sanitization) y <strong>DoD 5220.22-M</strong>, 
                cumpliendo con los requisitos del estándar <strong>R2v3</strong> (Core Requirement 6 - Data Sanitization).
              </p>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Tag Interno</th>
                  <th>N° Serie</th>
                  <th>Equipo</th>
                  <th>Tipo</th>
                  <th>Software</th>
                  <th>ID Reporte</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
            
            <div class="compliance">
              <div class="compliance-badge">✓ NIST 800-88</div>
              <div class="compliance-badge">✓ DoD 5220.22-M</div>
              <div class="compliance-badge">✓ R2v3 Compliant</div>
              <div class="compliance-badge">✓ GDPR Ready</div>
            </div>
            
            <div class="footer">
              <div class="signature">
                <div class="signature-line">Técnico Responsable</div>
              </div>
              <div class="qr-placeholder">
                Verificación<br>Digital
              </div>
              <div class="signature">
                <div class="signature-line">Supervisor de Calidad</div>
              </div>
            </div>
            
            <div class="legal">
              Este certificado es válido únicamente para los equipos listados y ha sido generado electrónicamente por ${companyName}.<br>
              Para verificar la autenticidad de este documento, contacte a ${companyEmail}
            </div>
          </div>
        </body>
        </html>
      `)
      
      printWindow.document.close()
      console.log('✅ Certificado generado exitosamente')

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
      title={assets.length === 0 ? 'No hay activos certificados' : `Generar certificado para ${assets.length} equipos`}
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

