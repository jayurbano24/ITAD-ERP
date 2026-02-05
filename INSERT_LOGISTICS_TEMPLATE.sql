-- Crear plantilla de Guías y Manifiestos para Logística
-- Este script inserta o actualiza la plantilla de logística

INSERT INTO document_templates (
    slug,
    name,
    description,
    category,
    content_html,
    variables,
    is_active
) VALUES (
    'guias-y-manifiestos',
    'Guías y Manifiestos',
    'Plantilla para generar guías de despacho y manifiestos de logística',
    'otros',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Guía de Manifiesto</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
        .header h1 { margin: 0; color: #1a1a1a; }
        .company-info { background: #f5f5f5; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
        .section { margin-bottom: 20px; }
        .section-title { font-weight: bold; font-size: 14px; color: #333; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .info-item { margin-bottom: 10px; }
        .info-label { font-weight: bold; color: #666; font-size: 12px; }
        .info-value { color: #333; margin-top: 5px; }
        .manifest-seal { text-align: center; font-size: 18px; font-weight: bold; color: #d32f2f; margin: 20px 0; }
        .footer { border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px; font-size: 12px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th { background: #f0f0f0; padding: 8px; text-align: left; border: 1px solid #ddd; font-weight: bold; }
        td { padding: 8px; border: 1px solid #ddd; }
    </style>
</head>
<body>
    <div class="header">
        <h1>GUÍA DE MANIFIESTO DE LOGÍSTICA</h1>
        <p style="margin: 5px 0; color: #666;">Documento Oficial de Despacho y Rastreo</p>
    </div>

    <div class="company-info">
        <strong>{Company Name}</strong><br>
        NIT: {Company NIT}<br>
        {Company Address}<br>
        Tel: {Company Phone}
    </div>

    <div class="section">
        <div class="section-title">INFORMACIÓN DEL DOCUMENTO</div>
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Número de Manifiesto:</div>
                <div class="info-value"><strong>{Manifest_Number}</strong></div>
            </div>
            <div class="info-item">
                <div class="info-label">Fecha de Emisión:</div>
                <div class="info-value">{Order_Date}</div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">INFORMACIÓN DEL TICKET</div>
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Número de Ticket:</div>
                <div class="info-value"><strong>{Ticket_ID}</strong></div>
            </div>
            <div class="info-item">
                <div class="info-label">Recolector/Personal:</div>
                <div class="info-value">{Collector_User}</div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">INFORMACIÓN DEL CLIENTE</div>
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Nombre del Cliente:</div>
                <div class="info-value"><strong>{Client_Name}</strong></div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">DETALLE DE CARGA</div>
        <table>
            <thead>
                <tr>
                    <th>Descripción</th>
                    <th>Valor</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>ID de Caja</td>
                    <td><strong>{Box_ID}</strong></td>
                </tr>
                <tr>
                    <td>Total de Artículos</td>
                    <td><strong>{Total_Items}</strong></td>
                </tr>
                <tr>
                    <td>Series de Activos</td>
                    <td>{Asset_Series}</td>
                </tr>
            </tbody>
        </table>
    </div>

    <div class="manifest-seal">
        ⚠️ MANIFIESTO OFICIAL DE LOGÍSTICA ⚠️
    </div>

    <div class="section">
        <div class="section-title">FIRMA Y SELLO</div>
        <div class="info-grid">
            <div class="info-item">
                <div style="border-top: 1px solid #333; margin-top: 40px; text-align: center;">
                    <div style="font-weight: bold; margin-top: 5px;">Firma Responsable</div>
                    <div style="font-size: 11px; color: #666;">Recolector/Personal</div>
                </div>
            </div>
            <div class="info-item">
                <div style="border-top: 1px solid #333; margin-top: 40px; text-align: center;">
                    <div style="font-weight: bold; margin-top: 5px;">Firma Recibido</div>
                    <div style="font-size: 11px; color: #666;">Autoridad Competente</div>
                </div>
            </div>
        </div>
    </div>

    <div class="footer">
        <p>Este es un documento oficial de logística. Cualquier alteración invalida el documento.</p>
        <p>Generado automáticamente por el Sistema ITAD-ERP</p>
    </div>
</body>
</html>',
    ARRAY[
        'Ticket_ID',
        'Manifest_Number',
        'Order_Date',
        'Client_Name',
        'Collector_User',
        'Box_ID',
        'Asset_Series',
        'Total_Items',
        'Company Name',
        'Company NIT',
        'Company Address',
        'Company Phone'
    ],
    true
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    content_html = EXCLUDED.content_html,
    variables = EXCLUDED.variables,
    is_active = EXCLUDED.is_active,
    updated_at = now();
