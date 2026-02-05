-- Create document template categories enum
DO $$ BEGIN
    CREATE TYPE document_category AS ENUM (
        'certificados',
        'ordenes_presupuestos',
        'facturas',
        'ventas',
        'etiquetas',
        'otros'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create document templates table
CREATE TABLE IF NOT EXISTS document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category document_category NOT NULL,
    content_html TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Document templates are viewable by all authenticated users" ON document_templates;
CREATE POLICY "Document templates are viewable by all authenticated users"
    ON document_templates FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Document templates are manageable by super_admin" ON document_templates;
CREATE POLICY "Document templates are manageable by super_admin"
    ON document_templates FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'super_admin'
        )
    );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_document_templates_updated_at ON document_templates;
CREATE TRIGGER update_document_templates_updated_at
    BEFORE UPDATE ON document_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Initial templates with premium professional design
INSERT INTO document_templates (slug, name, category, content_html)
VALUES 
('orden_trabajo', 'Orden de Trabajo', 'ordenes_presupuestos', '
<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.4;">
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
    <tr>
      <td style="width: 50%;">
        <h1 style="color: #059669; font-size: 28px; margin: 0;">ORDEN DE TRABAJO</h1>
        <p style="font-size: 14px; margin: 5px 0;">Folio: <strong style="color: #d97706;">#{Order Number}</strong></p>
      </td>
      <td style="width: 50%; text-align: right;">
        <div style="font-weight: bold; font-size: 18px;">{Company Name}</div>
        <div style="font-size: 12px; color: #666;">
          {Company Address}<br>
          NIT: {Company NIT}<br>
          Tel: {Company Phone}
        </div>
      </td>
    </tr>
  </table>

  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
    <h3 style="margin-top: 0; color: #1e293b; border-bottom: 2px solid #059669; padding-bottom: 5px; display: inline-block;">Información del Cliente</h3>
    <table style="width: 100%; font-size: 13px;">
      <tr>
        <td style="padding: 4px 0;"><strong>Nombre:</strong> {Cliente Nombre}</td>
        <td style="padding: 4px 0;"><strong>NIT/DPI:</strong> {Cliente NIT}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0;"><strong>Dirección:</strong> {Cliente Dirección}</td>
        <td style="padding: 4px 0;"><strong>Teléfono:</strong> {Cliente Teléfono}</td>
      </tr>
    </table>
  </div>

  <div style="margin-bottom: 20px;">
    <h3 style="margin-top: 0; color: #1e293b; border-bottom: 2px solid #059669; padding-bottom: 5px; display: inline-block;">Detalles del Dispositivo</h3>
    <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px;">
      <thead>
        <tr style="background-color: #059669; color: white;">
          <th style="padding: 10px; text-align: left; border: 1px solid #059669;">Tipo</th>
          <th style="padding: 10px; text-align: left; border: 1px solid #059669;">Marca / Modelo</th>
          <th style="padding: 10px; text-align: left; border: 1px solid #059669;">Serie (S/N)</th>
          <th style="padding: 10px; text-align: left; border: 1px solid #059669;">Tag Interno</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">{Asset Type}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">{Asset Brand} {Asset Model}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">{Asset Serial Number}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">{Internal Tag}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div style="border-top: 1px dashed #cbd5e1; padding-top: 20px; margin-top: 40px;">
    <table style="width: 100%;">
      <tr>
        <td style="width: 45%; text-align: center;">
          <br><br>
          <div style="border-top: 1px solid #333; width: 80%; margin: 0 auto;"></div>
          <p style="font-size: 12px;">Firma del Técnico</p>
        </td>
        <td style="width: 10%; "></td>
        <td style="width: 45%; text-align: center;">
          <br><br>
          <div style="border-top: 1px solid #333; width: 80%; margin: 0 auto;"></div>
          <p style="font-size: 12px;">Firma del Cliente</p>
        </td>
      </tr>
    </table>
  </div>
  
  <p style="font-size: 10px; color: #94a3b8; text-align: center; margin-top: 50px;">
    Este documento es una orden de trabajo oficial de {Company Name}.
  </p>
</div>
'),
('certificado_borrado', 'Certificado de Borrado de Datos', 'certificados', '
<div style="font-family: ''Georgia'', serif; color: #1e293b; padding: 40px; border: 20px solid #f1f5f9; position: relative;">
  <div style="text-align: center; margin-bottom: 30px;">
    <div style="font-size: 42px; color: #0f172a; font-weight: bold; margin-bottom: 10px;">CERTIFICADO DE BORRADO</div>
    <div style="font-size: 18px; color: #334155; font-style: italic;">Certificación de Protección de Datos de Grado Militar</div>
  </div>

  <div style="margin-bottom: 40px; text-align: justify; line-height: 1.8;">
    Por la presente se certifica que el dispositivo con número de serie <strong>{Asset Serial Number}</strong>, marca <strong>{Asset Brand}</strong> y modelo <strong>{Asset Model}</strong>, ha sido sometido a un proceso riguroso de borrado de datos bajo los estándares de la industria ITAD.
  </div>

  <div style="background-color: #fff; border: 1px solid #e2e8f0; padding: 25px; margin-bottom: 40px;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;"><strong>Fecha de Procesamiento:</strong></td>
        <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; text-align: right;">{Order Date}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;"><strong>ID del Activo:</strong></td>
        <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; text-align: right;">{Internal Tag}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0;"><strong>Resultado:</strong></td>
        <td style="padding: 8px 0; text-align: right;"><span style="color: #059669; font-weight: bold;">EXITOSO (VERIFICADO)</span></td>
      </tr>
    </table>
  </div>

  <div style="text-align: center; margin-top: 60px;">
    <img src="https://via.placeholder.com/150x80?text=SELLO+ITAD" style="margin-bottom: 10px;" />
    <div style="font-weight: bold;">{Company Name}</div>
    <div style="font-size: 12px; color: #64748b;">Departamento de Seguridad de la Información</div>
  </div>
  
  <div style="position: absolute; bottom: 10px; right: 20px; font-size: 10px; color: #cbd5e1;">
    Certificado No. BOR-{Order Number}
  </div>
</div>
'),
('factura_venta', 'Factura de Venta', 'ventas', '
<div style="font-family: sans-serif; padding: 20px; color: #334155;">
  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px;">
    <div>
      <h1 style="color: #059669; font-size: 32px; margin: 0;">FACTURA</h1>
      <p style="font-size: 14px; margin: 5px 0;">No. <strong>INV-{Order Number}</strong></p>
      <p style="font-size: 14px; margin: 5px 0;">Fecha: {Order Date}</p>
    </div>
    <div style="text-align: right;">
      <h2 style="margin: 0;">{Company Name}</h2>
      <p style="font-size: 12px; margin: 2px 0;">{Company Address}</p>
      <p style="font-size: 12px; margin: 2px 0;">NIT: {Company NIT}</p>
    </div>
  </div>

  <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
    <h3 style="margin-top: 0; font-size: 14px; color: #64748b; text-transform: uppercase;">Facturar a:</h3>
    <div style="font-size: 16px; font-weight: bold;">{Cliente Nombre}</div>
    <div style="font-size: 14px;">NIT: {Cliente NIT}</div>
    <div style="font-size: 14px;">{Cliente Dirección}</div>
  </div>

  <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
    <thead>
      <tr style="border-bottom: 2px solid #059669; background-color: #f8fafc;">
        <th style="padding: 12px; text-align: left;">Descripción</th>
        <th style="padding: 12px; text-align: right;">Cantidad</th>
        <th style="padding: 12px; text-align: right;">Precio Unit.</th>
        <th style="padding: 12px; text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #f1f5f9;">{Asset Type} {Asset Brand} {Asset Model} S/N: {Asset Serial Number}</td>
        <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: right;">1</td>
        <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: right;">{Estimated Price}</td>
        <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: right;">{Estimated Price}</td>
      </tr>
    </tbody>
  </table>

  <div style="display: flex; justify-content: flex-end;">
    <div style="width: 250px;">
      <div style="display: flex; justify-content: space-between; padding: 5px 0;">
        <span>Subtotal:</span>
        <span>{Currency} {Estimated Price}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 5px 0; font-weight: bold; border-top: 2px solid #059669; font-size: 18px; color: #059669;">
        <span>Total:</span>
        <span>{Currency} {Estimated Price}</span>
      </div>
    </div>
  </div>
</div>
'),
('etiqueta_activo', 'Etiqueta de Activo (Zebra)', 'etiquetas', '
<div style="width: 4in; height: 2in; border: 1px solid #000; padding: 0.2in; font-family: monospace; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
  <div style="font-size: 14pt; font-weight: bold; margin-bottom: 5px;">PROPIEDAD DE {Company Name}</div>
  <div style="font-size: 24pt; font-weight: bold; margin-bottom: 10px;">ID: {Internal Tag}</div>
  <div style="font-size: 10pt;">MARCA: {Asset Brand}</div>
  <div style="font-size: 10pt;">MODELO: {Asset Model}</div>
  <div style="font-size: 10pt; margin-top: 10px;">SERIE: {Asset Serial Number}</div>
</div>
')
ON CONFLICT (slug) DO UPDATE SET 
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    content_html = EXCLUDED.content_html,
    updated_at = now();


