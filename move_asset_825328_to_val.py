#!/usr/bin/env python3
"""
Script para mover asset 825328253282532 a Bodega Valorización (BOD-VAL)
"""
from supabase import create_client, Client

URL = 'https://hvxdekhmopxoroqqvrrq.supabase.co'
SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2eGRla2htb3B4b3JvcXF2cnJxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxOTg4MzM5NCwiZXhwIjoyMDM1NDU5Mzk0fQ.qMv-t3c7cEyb88dcRCtKHhd5nWvOLBzvtegBcMtOugY'

supabase: Client = create_client(URL, SERVICE_KEY)

# Serial o tag a buscar
SEARCH_TERM = '825328253282532'

print(f"1) Buscando asset: {SEARCH_TERM}...")
asset_result = supabase.table('assets').select(
    'id, internal_tag, serial_number, status, current_warehouse_id'
).or_(f'serial_number.eq.{SEARCH_TERM},internal_tag.eq.{SEARCH_TERM}').execute()

if not asset_result.data:
    print("❌ No se encontró el asset")
    exit(1)

asset = asset_result.data[0]
print(f"✓ Asset: {asset.get('internal_tag')} (ID: {asset['id']})")
print(f"  Serial: {asset.get('serial_number')}")
print(f"  Status: {asset.get('status')}")
print(f"  Warehouse ID actual: {asset.get('current_warehouse_id')}")

# Buscar o crear BOD-VAL
print("\n2) Buscando bodega BOD-VAL...")
warehouse_result = supabase.table('warehouses').select('id, code, name, is_active').eq('code', 'BOD-VAL').execute()

if not warehouse_result.data:
    print("  Bodega BOD-VAL no existe, creando...")
    create_result = supabase.table('warehouses').insert({
        'code': 'BOD-VAL',
        'name': 'Bodega de Valorización',
        'description': 'Equipos con borrado de datos certificado',
        'is_active': True
    }).execute()
    warehouse_id = create_result.data[0]['id']
    print(f"✓ Bodega creada: {warehouse_id}")
else:
    warehouse = warehouse_result.data[0]
    warehouse_id = warehouse['id']
    print(f"✓ Bodega: {warehouse['name']} (ID: {warehouse_id})")
    print(f"  is_active: {warehouse.get('is_active')}")

# Mover asset a BOD-VAL
print(f"\n3) Moviendo asset a BOD-VAL...")
previous_warehouse = asset.get('current_warehouse_id')

update_result = supabase.table('assets').update({
    'current_warehouse_id': warehouse_id,
    'updated_at': 'now()'
}).eq('id', asset['id']).execute()

if update_result.data:
    print(f"✓ Asset movido exitosamente")
    print(f"  Warehouse anterior: {previous_warehouse}")
    print(f"  Warehouse nuevo: {warehouse_id}")
else:
    print("❌ Error al mover el asset")
    exit(1)

# Verificación
print(f"\n4) Verificando...")
verify_result = supabase.table('assets').select(
    'current_warehouse_id, warehouses(code, name)'
).eq('id', asset['id']).execute()

if verify_result.data:
    verified = verify_result.data[0]
    print(f"✓ Verificado:")
    print(f"  current_warehouse_id: {verified.get('current_warehouse_id')}")
    print(f"  Bodega: {verified.get('warehouses')}")

# Contar assets en BOD-VAL
print(f"\n5) Conteo en BOD-VAL...")
count_result = supabase.table('assets').select('id', count='exact').eq('current_warehouse_id', warehouse_id).execute()
print(f"✓ Total assets en BOD-VAL: {count_result.count}")

print("\n✅ Listo. Revisa Inventario > Bodega > Bodega Valorización")
