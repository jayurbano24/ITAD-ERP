#!/usr/bin/env python3
"""
Script para actualizar marca y modelo del asset 825328253282532
"""
from supabase import create_client, Client

URL = 'https://hvxdekhmopxoroqqvrrq.supabase.co'
SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2eGRla2htb3B4b3JvcXF2cnJxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxOTg4MzM5NCwiZXhwIjoyMDM1NDU5Mzk0fQ.qMv-t3c7cEyb88dcRCtKHhd5nWvOLBzvtegBcMtOugY'

supabase: Client = create_client(URL, SERVICE_KEY)

# Datos del asset
SERIAL = '825328253282532'
MANUFACTURER = 'Dell'
MODEL = 'OptiPlex 3080'

print(f"1) Buscando asset {SERIAL}...")
asset_result = supabase.table('assets').select('id, internal_tag, manufacturer, model').eq('serial_number', SERIAL).execute()

if not asset_result.data:
    print("❌ Asset no encontrado")
    exit(1)

asset = asset_result.data[0]
print(f"✓ Asset: {asset['internal_tag']} (ID: {asset['id']})")
print(f"  Manufacturer actual: {asset.get('manufacturer')}")
print(f"  Model actual: {asset.get('model')}")

print(f"\n2) Actualizando a {MANUFACTURER} {MODEL}...")
update_result = supabase.table('assets').update({
    'manufacturer': MANUFACTURER,
    'model': MODEL,
    'updated_at': 'now()'
}).eq('id', asset['id']).execute()

if update_result.data:
    print("✓ Asset actualizado exitosamente")
    
    # Verificar
    print("\n3) Verificando...")
    verify_result = supabase.table('assets').select('id, internal_tag, manufacturer, model').eq('id', asset['id']).execute()
    if verify_result.data:
        verified = verify_result.data[0]
        print(f"✓ Manufacturer: {verified.get('manufacturer')}")
        print(f"✓ Model: {verified.get('model')}")
else:
    print("❌ Error al actualizar")
    
print("\n✅ Listo. Refresca la página de Bodega Valorización")
