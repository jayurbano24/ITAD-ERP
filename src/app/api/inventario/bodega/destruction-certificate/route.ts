import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const url = new URL(request.url)
        const assetId = url.searchParams.get('assetId')

        if (!assetId) {
            return NextResponse.json({ error: 'assetId requerido' }, { status: 400 })
        }

        const supabase = await createClient()

        // Obtener el asset con sus especificaciones
        const { data: asset, error: assetError } = await supabase
            .from('assets')
            .select(`
        id,
        serial_number,
        internal_tag,
        manufacturer,
        model,
        asset_type,
        specifications,
        status,
        batch_id
      `)
            .eq('id', assetId)
            .single()

        if (assetError || !asset) {
            return NextResponse.json({ error: 'Activo no encontrado' }, { status: 404 })
        }

        const specs = asset.specifications as any || {}
        const destroyedAt = specs.destroyed_at
        const evidence = specs.destruction_evidence || []
        const weight = specs.destruction_batch_weight

        if (!destroyedAt) {
            return NextResponse.json({ error: 'Este activo no ha sido destruido' }, { status: 400 })
        }

        // Obtener información del lote si existe
        let batchInfo = null
        if (asset.batch_id) {
            const { data: batch } = await supabase
                .from('batches')
                .select('code, ticket_id')
                .eq('id', asset.batch_id)
                .single()

            if (batch) {
                batchInfo = batch
            }
        }

        // Generar HTML del certificado
        const destroyedDate = new Date(destroyedAt).toLocaleDateString('es-GT', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })

        const certificateHTML = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Certificado de Destrucción - ${asset.serial_number || asset.internal_tag || assetId}</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 40px;
            background: #f5f5f5;
        }
        .certificate {
            background: white;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #dc2626;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #dc2626;
            margin: 0;
            font-size: 28px;
        }
        .header p {
            color: #666;
            margin: 5px 0;
        }
        .section {
            margin-bottom: 25px;
        }
        .section h2 {
            color: #333;
            font-size: 18px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
            margin-bottom: 15px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        .info-item {
            margin-bottom: 10px;
        }
        .info-label {
            font-weight: bold;
            color: #666;
            font-size: 12px;
            text-transform: uppercase;
        }
        .info-value {
            color: #333;
            font-size: 14px;
            margin-top: 3px;
        }
        .evidence-section {
            margin-top: 20px;
        }
        .evidence-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .evidence-item {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: center;
        }
        .evidence-item img {
            max-width: 100%;
            height: auto;
            max-height: 200px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 12px;
        }
        .status-badge {
            display: inline-block;
            background: #dc2626;
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="certificate">
        <div class="header">
            <h1>CERTIFICADO DE DESTRUCCIÓN</h1>
            <p>Certificado Oficial de Destrucción de Equipos</p>
        </div>

        <div class="section">
            <h2>Información del Equipo</h2>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Serie / IMEI</div>
                    <div class="info-value">${asset.serial_number || asset.internal_tag || 'N/A'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Marca</div>
                    <div class="info-value">${asset.manufacturer || 'N/A'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Modelo</div>
                    <div class="info-value">${asset.model || 'N/A'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Tipo</div>
                    <div class="info-value">${asset.asset_type || 'N/A'}</div>
                </div>
                ${batchInfo ? `
                <div class="info-item">
                    <div class="info-label">Lote</div>
                    <div class="info-value">${batchInfo.code || 'N/A'}</div>
                </div>
                ` : ''}
            </div>
        </div>

        <div class="section">
            <h2>Información de Destrucción</h2>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Fecha y Hora de Destrucción</div>
                    <div class="info-value">${destroyedDate}</div>
                </div>
                ${weight ? `
                <div class="info-item">
                    <div class="info-label">Peso Total (Lb)</div>
                    <div class="info-value">${weight}</div>
                </div>
                ` : ''}
                <div class="info-item">
                    <div class="info-label">Estado</div>
                    <div class="info-value"><span class="status-badge">DESTRUIDO</span></div>
                </div>
            </div>
        </div>

        ${evidence && evidence.length > 0 ? `
        <div class="section evidence-section">
            <h2>Evidencia Fotográfica</h2>
            <div class="evidence-grid">
                ${evidence.map((url: string) => `
                    <div class="evidence-item">
                        <img src="${url}" alt="Evidencia de destrucción" />
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        <div class="footer">
            <p>Este certificado es generado automáticamente por el sistema ITAD-ERP</p>
            <p>Fecha de emisión: ${new Date().toLocaleDateString('es-GT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
    </div>
</body>
</html>
    `

        // Retornar como HTML
        return new NextResponse(certificateHTML, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Content-Disposition': `inline; filename="certificado-destruccion-${asset.serial_number || assetId}.html"`
            }
        })

    } catch (error) {
        console.error('Error generando certificado:', error)
        return NextResponse.json({ error: 'Error al generar el certificado' }, { status: 500 })
    }
}
