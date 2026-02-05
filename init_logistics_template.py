#!/usr/bin/env python3
"""
Script para insertar la plantilla de Guías y Manifiestos en Supabase
"""

import os
import sys
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv('.env.local')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Variables de entorno no configuradas")
    print("Necesitas NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY")
    sys.exit(1)

try:
    from supabase import create_client
except ImportError:
    print("Instalando supabase-py...")
    os.system('pip install supabase')
    from supabase import create_client

DEFAULT_TEMPLATE = """<!DOCTYPE html>
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

    <div class="footer">
        <p>Este es un documento oficial de logística.</p>
        <p>Generado automáticamente por el Sistema ITAD-ERP</p>
    </div>
</body>
</html>"""

def main():
    print("🚀 Inicializando cliente de Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print("📋 Verificando si la plantilla ya existe...")
    try:
        existing = supabase.table('document_templates').select('id').eq('slug', 'guias-y-manifiestos').execute()
        if existing.data and len(existing.data) > 0:
            print("✅ La plantilla ya existe en la base de datos")
            return
    except Exception as e:
        print(f"⚠️ Error al verificar: {e}")
    
    print("📝 Insertando plantilla de Guías y Manifiestos...")
    try:
        response = supabase.table('document_templates').insert({
            'slug': 'guias-y-manifiestos',
            'name': 'Guías y Manifiestos',
            'description': 'Plantilla para generar guías de despacho y manifiestos de logística',
            'category': 'otros',
            'content_html': DEFAULT_TEMPLATE,
            'variables': [
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
            'is_active': True
        }).execute()
        
        if response.data:
            print("✅ ¡Plantilla creada exitosamente!")
            print(f"ID: {response.data[0]['id']}")
            print(f"Slug: {response.data[0]['slug']}")
        else:
            print("❌ Error: No se recibió respuesta")
    except Exception as e:
        print(f"❌ Error al insertar: {e}")
        if 'duplicate' in str(e).lower() or 'conflict' in str(e).lower():
            print("💡 La plantilla probablemente ya existe. Intenta actualizar manualmente desde el panel.")

if __name__ == '__main__':
    main()
