#!/usr/bin/env python3
"""
Script para verificar el asset 825328253282532 y moverlo a BOD-VAL si es necesario
"""
from supabase import create_client, Client

URL = 'https://hvxdekhmopxoroqqvrrq.supabase.co'
SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2eGRla2htb3B4b3JvcXF2cnJxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxOTg4MzM5NCwiZXhwIjoyMDM1NDU5Mzk0fQ.qMv-t3c7cEyb88dcRCtKHhd5nWvOLBzvtegBcMtOugY'

supabase: Client = create_client(URL, SERVICE_KEY)

print("1) Buscando asset con serial/tag 825328253282532...")
asset_result = supabase.table('assets').select(
    'id, internal_tag, serial_number, status, current_warehouse_id, warehouses(code, name)'
).or_(f'serial_number.eq.825328253282532,internal_tag.eq.825328253282532').execute()

if not asset_result.data:
    print("❌ No se encontró el asset")
    exit(1)

asset = asset_result.data[0]
print(f"✓ Asset encontrado: {asset.get('internal_tag')} (ID: {asset['id']})")
print(f"  Serial: {asset.get('serial_number')}")
print(f"  Status: {asset.get('status')}")
print(f"  Warehouse actual: {asset.get('warehouses')}")

# Verificar si el asset tiene status 'wiped'
if asset.get('status') == 'wiped':
    print("\n✓ Asset tiene status 'wiped', procediendo a mover a BOD-VAL...")
    
    # Buscar o crear BOD-VAL
    print("\n2) Buscando bodega BOD-VAL...")
    warehouse_result = supabase.table('warehouses').select('id, code, name').eq('code', 'BOD-VAL').execute()
    
    if not warehouse_result.data:
        print("  Bodega BOD-VAL no existe, creando...")
        create_result = supabase.table('warehouses').insert({
            'code': 'BOD-VAL',
            'name': 'Bodega de Valorización',
            'description': 'Bodega para equipos con borrado de datos certificado',
            'is_active': True
        }).execute()
        warehouse_id = create_result.data[0]['id']
        print(f"✓ Bodega creada: {warehouse_id}")
    else:
        warehouse = warehouse_result.data[0]
        warehouse_id = warehouse['id']
        print(f"✓ Bodega encontrada: {warehouse['name']} ({warehouse_id})")
    
    # Mover asset
    print(f"\n3) Moviendo asset a BOD-VAL...")
    previous_warehouse = asset.get('current_warehouse_id')
    update_result = supabase.table('assets').update({
        'current_warehouse_id': warehouse_id,
        'updated_at': 'now()'
    }).eq('id', asset['id']).execute()
    
    print(f"✓ Asset movido exitosamente")
    print(f"  Warehouse anterior: {previous_warehouse}")
    print(f"  Warehouse nuevo: {warehouse_id}")
    
    # Verificar
    print(f"\n4) Verificando...")
    verify_result = supabase.table('assets').select('current_warehouse_id, warehouses(code, name)').eq('id', asset['id']).execute()
    print(f"✓ Verificación: {verify_result.data[0]}")
    
else:
    print(f"\n⚠️  Asset no tiene status 'wiped' (actual: {asset.get('status')})")
    print("   No se moverá automáticamente.")
    if asset.get('status') == 'received':
        print("   El asset está en estado 'received', necesita iniciar el proceso de borrado.")
    elif asset.get('status') == 'wiping':
        print("   El asset está en proceso de borrado, necesita certificación.")

print("\n✅ Proceso completado. Revisa Inventario > Bodega > Bodega Valorización")
