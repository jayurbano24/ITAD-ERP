#!/usr/bin/env python3
import sys
from supabase import create_client, Client

URL = 'https://lnuduhpsmdqjwyhhirba.supabase.co'
SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxudWR1aHBzbWRxand5aGhpcmJhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDcwNjQxMSwiZXhwIjoyMDgwMjgyNDExfQ.qMv-t3c7cEyb88dcRCtKHhd5nWvOLBzvtegBcMtOugY'
TARGET_WAREHOUSE = {
    'code': 'BOD-VAL',
    'name': 'Bodega Valorización',
    'description': 'Equipos valorización',
}

serial = '1593232133'

try:
    supabase: Client = create_client(URL, SERVICE_KEY)

    print('1) Buscando bodega destino...')
    wh = supabase.table('warehouses').select('*').eq('code', TARGET_WAREHOUSE['code']).execute()
    warehouse = None
    if wh.data:
        warehouse = wh.data[0]
    else:
        wh_new = supabase.table('warehouses').insert({
            'code': TARGET_WAREHOUSE['code'],
            'name': TARGET_WAREHOUSE['name'],
            'description': TARGET_WAREHOUSE['description'],
            'is_active': True,
        }).select('*').execute()
        if wh_new.data:
            warehouse = wh_new.data[0]
    if not warehouse:
        print('✗ No se pudo obtener/crear la bodega destino')
        sys.exit(1)
    print(f"✓ Bodega destino: {warehouse['name']} ({warehouse['id']})")

    print(f"\n2) Buscando asset con serial {serial}...")
    asset_res = supabase.table('assets').select('*').eq('serial_number', serial).execute()
    if not asset_res.data:
        print('✗ Asset no encontrado por serial')
        sys.exit(1)
    asset = asset_res.data[0]
    print(f"✓ Asset: {asset.get('internal_tag', '-')}, id={asset['id']}, current_warehouse_id={asset.get('current_warehouse_id')}")

    print('\n3) Moviendo asset a Valorización...')
    upd = supabase.table('assets').update({
        'current_warehouse_id': warehouse['id'],
        'updated_at': 'now()'
    }).eq('id', asset['id']).execute()
    if upd.data is None:
        print('✗ No se pudo actualizar asset')
        sys.exit(1)
    print('✓ Asset movido')

    print('\n4) Verificando...')
    verify = supabase.table('assets').select('id, serial_number, internal_tag, current_warehouse_id').eq('id', asset['id']).execute()
    if verify.data:
        va = verify.data[0]
        print(f"✓ current_warehouse_id={va['current_warehouse_id']}")
    else:
        print('⚠ Verificación sin datos')

    print('\n5) Conteo en BOD-VAL...')
    count = supabase.table('assets').select('id', count='exact').eq('current_warehouse_id', warehouse['id']).execute()
    print(f"✓ Total en BOD-VAL: {count.count}")

    print('\nListo. Revisa Inventario > Bodega > Bodega Valorización')
except Exception as e:
    print('✗ Error:', e)
    sys.exit(1)
