-- Agregar categoría 'despachos' al enum document_category
DO $$ 
BEGIN
    -- Intentar agregar el valor al enum si no existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'despachos' 
        AND enumtypid = 'document_category'::regtype
    ) THEN
        ALTER TYPE document_category ADD VALUE 'despachos';
    END IF;
END $$;

-- Insertar plantilla de Guía de Despacho
INSERT INTO document_templates (slug, name, category, content_html, description)
VALUES (
  'guia_despacho',
  'Guía de Despacho',
  'despachos',
  '<div style="font-family: Arial, sans-serif; color: #1e293b; padding: 30px; max-width: 800px; margin: 0 auto;">
  <!-- Header -->
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
    <tr>
      <td style="width: 50%; vertical-align: top;">
        <h1 style="color: #0f172a; font-size: 32px; margin: 0 0 10px 0; font-weight: bold;">GUÍA DE DESPACHO</h1>
        <div style="background-color: #f59e0b; color: white; display: inline-block; padding: 8px 16px; border-radius: 6px; font-weight: bold; font-size: 16px;">
          No. {Dispatch Code}
        </div>
      </td>
      <td style="width: 50%; text-align: right; vertical-align: top;">
        <div style="font-weight: bold; font-size: 20px; color: #0f172a;">{Company Name}</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 5px;">
          {Company Address}<br>
          NIT: {Company NIT}<br>
          Tel: {Company Phone}
        </div>
      </td>
    </tr>
  </table>

  <!-- Información del Despacho -->
  <div style="background-color: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
    <h3 style="margin: 0 0 15px 0; color: #0f172a; font-size: 16px; border-bottom: 2px solid #0f172a; padding-bottom: 8px; display: inline-block;">
      INFORMACIÓN DEL DESPACHO
    </h3>
    <table style="width: 100%; font-size: 14px; line-height: 1.8;">
      <tr>
        <td style="width: 25%; padding: 6px 0;"><strong>Fecha:</strong></td>
        <td style="width: 25%; padding: 6px 0;">{Dispatch Date}</td>
        <td style="width: 25%; padding: 6px 0;"><strong>Hora:</strong></td>
        <td style="width: 25%; padding: 6px 0;">{Dispatch Time}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0;"><strong>Bodega Origen:</strong></td>
        <td style="padding: 6px 0;">{Origin Warehouse}</td>
        <td style="padding: 6px 0;"><strong>Tipo Movimiento:</strong></td>
        <td style="padding: 6px 0;">
          <span style="background-color: #dc2626; color: white; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: bold;">
            {Movement Type}
          </span>
        </td>
      </tr>
      <tr>
        <td style="padding: 6px 0;"><strong>Conductor:</strong></td>
        <td style="padding: 6px 0;">{Driver Name}</td>
        <td style="padding: 6px 0;"><strong>Vehículo:</strong></td>
        <td style="padding: 6px 0;">{Vehicle Plate}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0;"><strong>Cliente Destino:</strong></td>
        <td colspan="3" style="padding: 6px 0;">{Client Name}</td>
      </tr>
    </table>
  </div>

  <!-- Tabla de Assets -->
  <div style="margin-bottom: 25px;">
    <h3 style="margin: 0 0 15px 0; color: #0f172a; font-size: 16px; border-bottom: 2px solid #0f172a; padding-bottom: 8px; display: inline-block;">
      DETALLE DE ACTIVOS DESPACHADOS
    </h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
      <thead>
        <tr style="background-color: #0f172a; color: white;">
          <th style="padding: 12px 8px; text-align: left; border: 1px solid #0f172a;">#</th>
          <th style="padding: 12px 8px; text-align: left; border: 1px solid #0f172a;">Tag Interno</th>
          <th style="padding: 12px 8px; text-align: left; border: 1px solid #0f172a;">Marca</th>
          <th style="padding: 12px 8px; text-align: left; border: 1px solid #0f172a;">Modelo</th>
          <th style="padding: 12px 8px; text-align: left; border: 1px solid #0f172a;">Serie</th>
          <th style="padding: 12px 8px; text-align: left; border: 1px solid #0f172a;">Tipo</th>
          <th style="padding: 12px 8px; text-align: right; border: 1px solid #0f172a;">Peso (lb)</th>
        </tr>
      </thead>
      <tbody>
        {Asset List}
        <!-- Ejemplo de fila (será reemplazada dinámicamente):
        <tr>
          <td style="padding: 10px 8px; border: 1px solid #e2e8f0;">1</td>
          <td style="padding: 10px 8px; border: 1px solid #e2e8f0;">ITAD-2026-00001</td>
          <td style="padding: 10px 8px; border: 1px solid #e2e8f0;">DELL</td>
          <td style="padding: 10px 8px; border: 1px solid #e2e8f0;">OPTIPLEX 7090</td>
          <td style="padding: 10px 8px; border: 1px solid #e2e8f0;">ABC123XYZ</td>
          <td style="padding: 10px 8px; border: 1px solid #e2e8f0;">Desktop</td>
          <td style="padding: 10px 8px; border: 1px solid #e2e8f0; text-align: right;">15.5</td>
        </tr>
        -->
      </tbody>
      <tfoot>
        <tr style="background-color: #f1f5f9; font-weight: bold;">
          <td colspan="6" style="padding: 12px 8px; border: 1px solid #cbd5e1; text-align: right;">TOTAL:</td>
          <td style="padding: 12px 8px; border: 1px solid #cbd5e1; text-align: right;">{Total Weight} lb</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- Notas Adicionales -->
  <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 30px; border-radius: 4px;">
    <strong style="color: #92400e;">Notas:</strong>
    <p style="margin: 8px 0 0 0; color: #78350f; font-size: 13px; line-height: 1.6;">
      {Dispatch Notes}
    </p>
  </div>

  <!-- Firmas -->
  <div style="margin-top: 60px;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="width: 33%; text-align: center; vertical-align: bottom; padding: 0 10px;">
          <div style="border-top: 2px solid #334155; padding-top: 8px; margin-top: 50px;">
            <strong style="font-size: 12px; color: #475569;">Despachador</strong><br>
            <span style="font-size: 11px; color: #64748b;">Nombre y Firma</span>
          </div>
        </td>
        <td style="width: 33%; text-align: center; vertical-align: bottom; padding: 0 10px;">
          <div style="border-top: 2px solid #334155; padding-top: 8px; margin-top: 50px;">
            <strong style="font-size: 12px; color: #475569;">Conductor</strong><br>
            <span style="font-size: 11px; color: #64748b;">{Driver Name}</span>
          </div>
        </td>
        <td style="width: 33%; text-align: center; vertical-align: bottom; padding: 0 10px;">
          <div style="border-top: 2px solid #334155; padding-top: 8px; margin-top: 50px;">
            <strong style="font-size: 12px; color: #475569;">Receptor</strong><br>
            <span style="font-size: 11px; color: #64748b;">Nombre y Firma</span>
          </div>
        </td>
      </tr>
    </table>
  </div>

  <!-- Footer -->
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px dashed #cbd5e1; text-align: center;">
    <p style="font-size: 10px; color: #94a3b8; margin: 0;">
      Este documento es una guía de despacho oficial de {Company Name}.<br>
      Generado el {Dispatch Date} a las {Dispatch Time}
    </p>
  </div>
</div>',
  'Documento oficial para registrar el despacho de activos fuera del almacén (destrucción, traslados, etc.)'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  content_html = EXCLUDED.content_html,
  description = EXCLUDED.description,
  updated_at = now();
