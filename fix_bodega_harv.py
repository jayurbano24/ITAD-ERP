#!/usr/bin/env python3
import sys
from supabase.client import Client
from supabase import create_client

# Get Supabase credentials
url = 'https://lnuduhpsmdqjwyhhirba.supabase.co'
key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxudWR1aHBzbWRxand5aGhpcmJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MDY0MTEsImV4cCI6MjA4MDI4MjQxMX0.JHAB4y8_5v8dfzQ7HyVAULTq6kyvVH9WF2Gxhx6pSd4'

try:
    client = Client(url, key)
    
    # Update warehouse
    result = client.table('warehouses').update({
        'is_active': True,
        'name': 'Bodega Hardvesting'
    }).eq('code', 'BOD-HARV').execute()
    
    print('✓ Warehouse updated successfully')
    print(f'Updated records: {len(result.data) if result.data else 0}')
    
    # Verify
    verify = client.table('warehouses').select('*').eq('code', 'BOD-HARV').execute()
    if verify.data:
        w = verify.data[0]
        print(f'Verification:')
        print(f'  - code: {w.get("code")}')
        print(f'  - name: {w.get("name")}')
        print(f'  - is_active: {w.get("is_active")}')
        print(f'  - id: {w.get("id")}')
    else:
        print('✗ Warehouse not found')
    
except Exception as e:
    print(f'✗ Error: {e}')
    import traceback
    traceback.print_exc()
    sys.exit(1)
