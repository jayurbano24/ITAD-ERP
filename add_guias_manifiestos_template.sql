-- First, add 'logistica' to the document_category enum type if it doesn't exist
ALTER TYPE document_category ADD VALUE IF NOT EXISTS 'logistica';

-- Insert the "Generar Guías y Manifiesto" template into document_templates
INSERT INTO document_templates (slug, name, description, category, content_html, variables, is_active)
VALUES (
    'guias-y-manifiestos',
    'Guías y Manifiestos',
    'Plantilla para generar guías de despacho y manifiestos de logística',
    'logistica',
    E'<!DOCTYPE html>
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
                <div class="info-value"><strong>{Manifest Number}</strong></div>
            </div>
            <div class="info-item">
                <div class="info-label">Fecha de Emisión:</div>
                <div class="info-value">{Date}</div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">INFORMACIÓN DEL TICKET</div>
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Número de Ticket:</div>
                <div class="info-value"><strong>{Ticket Number}</strong></div>
            </div>
            <div class="info-item">
                <div class="info-label">Recolector/Personal:</div>
                <div class="info-value">{Collector Name}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Fecha de Recolección:</div>
                <div class="info-value">{Collection Date}</div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">INFORMACIÓN DEL CLIENTE</div>
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Nombre del Cliente:</div>
                <div class="info-value"><strong>{Client Name}</strong></div>
            </div>
            <div class="info-item">
                <div class="info-label">NIT/Cédula:</div>
                <div class="info-value">{Client NIT}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Dirección:</div>
                <div class="info-value">{Client Address}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Teléfono:</div>
                <div class="info-value">{Client Phone}</div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">DETALLE DE CARGA</div>
        <table>
            <thead>
                <tr>
                    <th>Descripción</th>
                    <th>Cantidad</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Total de Cajas/Unidades de Carga</td>
                    <td><strong>{Box Count}</strong></td>
                </tr>
                <tr>
                    <td>Total de Equipos/Dispositivos</td>
                    <td><strong>{Equipment Count}</strong></td>
                </tr>
                <tr>
                    <td>Tipo de Equipo</td>
                    <td>{Equipment Type}</td>
                </tr>
            </tbody>
        </table>
    </div>

    <div class="manifest-seal">
        ⚠️ MANIFIESTO OFICIAL DE LOGÍSTICA ⚠️
    </div>

    <div class="section">
        <div class="section-title">NOTAS Y OBSERVACIONES</div>
        <div class="info-value" style="border: 1px solid #ddd; padding: 10px; border-radius: 5px; min-height: 80px;">
            {Notes}
        </div>
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
        <p><strong>IMPORTANTE:</strong> Este documento es oficial y cualquier alteración invalida completamente el mismo.</p>
        <p>Sistema ERP ITAD - Generado automáticamente | No requiere firma digital</p>
        <p style="margin-top: 20px; text-align: center; font-size: 10px; color: #999;">
            Fecha de Generación: {Date} | Ticket: {Ticket Number} | Manifiesto: {Manifest Number}
        </p>
    </div>
</body>
</html>',
    ARRAY['{Company Name}', '{Company NIT}', '{Company Address}', '{Company Phone}', '{Manifest Number}', '{Date}', '{Ticket Number}', '{Collector Name}', '{Collection Date}', '{Client Name}', '{Client NIT}', '{Client Address}', '{Client Phone}', '{Box Count}', '{Equipment Count}', '{Equipment Type}', '{Notes}'],
    true
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    content_html = EXCLUDED.content_html,
    variables = EXCLUDED.variables,
    is_active = EXCLUDED.is_active,
    updated_at = now();

-- Verify the template was created
SELECT id, slug, name, category, is_active 
FROM document_templates 
WHERE slug = 'guias-y-manifiestos';
