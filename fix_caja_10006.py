#!/usr/bin/env python3
"""
Script para corregir el box_number de la caja #10006
"""

import sys
import os
from pathlib import Path

# Añadir el directorio raíz al path
project_root = Path(__file__).parent.absolute()
sys.path.insert(0, str(project_root))

# Importar módulos necesarios
try:
    from supabase import create_client
    import os
except ImportError:
    print("❌ Error: python-supabase no está instalado")
    sys.exit(1)

# Credenciales de Supabase (desde env.local.example)
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or 'https://lnuduhpsmdqjwyhhirba.supabase.co'
SUPABASE_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY') or 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxudWR1aHBzbWRxand5aGhpcmJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MDY0MTEsImV4cCI6MjA4MDI4MjQxMX0.JHAB4y8_5v8dfzQ7HyVAULTq6kyvVH9WF2Gxhx6pSd4'

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: No se pudieron obtener las credenciales de Supabase")
    sys.exit(1)

# Conectar a Supabase
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

print("🔧 Corrigiendo el box_number de la caja #10006...")
print()

try:
    # 1. Obtener el UUID del ticket TK-2026-00006
    print("📋 Buscando ticket TK-2026-00006...")
    ticket_response = supabase.table('operations_tickets').select('id').ilike('readable_id', 'TK-2026-00006').execute()
    
    if not ticket_response.data:
        print("❌ Ticket TK-2026-00006 no encontrado")
        sys.exit(1)
    
    ticket_id = ticket_response.data[0]['id']
    print(f"✓ Ticket encontrado: {ticket_id}")
    print()
    
    # 2. Actualizar el box_number de 0 a 10006
    print("🔄 Actualizando box_number a 10006 para todos los items con box_number=0...")
    
    update_response = supabase.table('ticket_items').update({'box_number': 10006}).eq('ticket_id', ticket_id).eq('box_number', 0).execute()
    
    if update_response.data:
        updated_count = len(update_response.data)
        print(f"✓ {updated_count} item(s) actualizado(s) correctamente")
        print()
        
        # 3. Verificar los cambios
        print("✓ VERIFICACIÓN DESPUÉS DEL FIX")
        print("=" * 80)
        verify_response = supabase.table('ticket_items').select(
            'id, box_number, brand, model, collected_serial, validation_status'
        ).eq('ticket_id', ticket_id).execute()
        
        for item in verify_response.data:
            print(f"  Item: {item['id'][:8]}...")
            print(f"    Box Number: {item['box_number']}")
            print(f"    Producto: {item['brand']} {item['model']}")
            print(f"    Serial: {item['collected_serial']}")
            print(f"    Estado: {item['validation_status']}")
            print()
        
        print("✅ FIX COMPLETADO")
        print()
        print("💡 PRÓXIMOS PASOS:")
        print("1. Abre el módulo de Recepción")
        print("2. Ingresa el número de ticket: TK-2026-00006")
        print("3. Presiona 'Cargar Cajas'")
        print("4. Deberías ver la Caja #10006 ahora")
    else:
        print("⚠ No se encontraron items con box_number=0 para actualizar")
        print("La caja podría haber sido actualizada previamente")

except Exception as e:
    print(f"❌ Error durante la corrección: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
