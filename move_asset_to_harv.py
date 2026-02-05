#!/usr/bin/env python3
import sys
from supabase import create_client, Client

# Supabase credentials - using SERVICE ROLE KEY to bypass RLS
url = 'https://lnuduhpsmdqjwyhhirba.supabase.co'
key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxudWR1aHBzbWRxand5aGhpcmJhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDcwNjQxMSwiZXhwIjoyMDgwMjgyNDExfQ.qMv-t3c7cEyb88dcRCtKHhd5nWvOLBzvtegBcMtOugY'

try:
    supabase: Client = create_client(url, key)
    
    # 1. Get BOD-HARV warehouse
    print('1. Buscando bodega BOD-HARV...')
    warehouse_result = supabase.table('warehouses').select('*').eq('code', 'BOD-HARV').execute()
    
    if not warehouse_result.data:
        print('✗ ERROR: Bodega BOD-HARV no encontrada')
        sys.exit(1)
    
    warehouse = warehouse_result.data[0]
    print(f'✓ Bodega encontrada: {warehouse["name"]} (ID: {warehouse["id"]})')
    print(f'  - is_active: {warehouse["is_active"]}')
    
    # 2. Get the asset by ID
    asset_id = '509d9cc0-d9a4-45c6-8c3d-9181a835543a'
    print(f'\n2. Buscando asset con ID {asset_id}...')
    asset_result = supabase.table('assets').select('*').eq('id', asset_id).execute()
    
    if not asset_result.data:
        print(f'✗ ERROR: Asset con ID {asset_id} no encontrado')
        sys.exit(1)
    
    asset = asset_result.data[0]
    print(f'✓ Asset encontrado: {asset["internal_tag"]} (ID: {asset["id"]})')
    print(f'  - current_warehouse_id: {asset.get("current_warehouse_id")}')
    
    # 3. Move asset to BOD-HARV
    print(f'\n3. Moviendo asset a {warehouse["name"]}...')
    update_result = supabase.table('assets').update({
        'current_warehouse_id': warehouse['id'],
        'updated_at': 'now()'
    }).eq('id', asset['id']).execute()
    
    if update_result.data:
        print(f'✓ Asset movido exitosamente a {warehouse["name"]}')
    else:
        print('✗ ERROR: No se pudo mover el asset')
        sys.exit(1)
    
    # 4. Verify the move
    print('\n4. Verificando el movimiento...')
    verify_result = supabase.table('assets').select('id, serial_number, internal_tag, current_warehouse_id').eq('id', asset['id']).execute()
    
    if verify_result.data:
        verified_asset = verify_result.data[0]
        print(f'✓ Verificación exitosa:')
        print(f'  - Asset: {verified_asset["internal_tag"]}')
        print(f'  - Warehouse ID: {verified_asset["current_warehouse_id"]}')
        print(f'  - Coincide con BOD-HARV: {verified_asset["current_warehouse_id"] == warehouse["id"]}')
    
    # 5. Count assets in BOD-HARV
    print('\n5. Contando assets en BOD-HARV...')
    count_result = supabase.table('assets').select('id', count='exact').eq('current_warehouse_id', warehouse['id']).execute()
    print(f'✓ Total de assets en BOD-HARV: {count_result.count}')
    
    print('\n' + '='*60)
    print('✓ PROCESO COMPLETADO EXITOSAMENTE')
    print('='*60)
    print(f'\nAhora ve a: Inventario > Bodega > Bodega Hardvesting')
    print(f'Deberías ver el asset {asset["internal_tag"]} (Serial: {asset.get("serial_number", "N/A")})')
    
except Exception as e:
    print(f'\n✗ ERROR: {e}')
    import traceback
    traceback.print_exc()
    sys.exit(1)
