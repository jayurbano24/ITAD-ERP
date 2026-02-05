#!/usr/bin/env python3
"""
Script para corregir el box_number=0 a 10006 mediante Supabase API
"""

import requests
import json
import sys

# Credenciales de Supabase
SUPABASE_URL = 'https://lnuduhpsmdqjwyhhirba.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxudWR1aHBzbWRxand5aGhpcmJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MDY0MTEsImV4cCI6MjA4MDI4MjQxMX0.JHAB4y8_5v8dfzQ7HyVAULTq6kyvVH9WF2Gxhx6pSd4'

headers = {
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Prefer': 'return=representation'
}

print("🔧 Actualizando box_number de 0 a 10006...")
print()

try:
    # 1. Primero, encontrar los items con box_number=0
    print("1️⃣ Buscando items con box_number=0...")
    get_url = f"{SUPABASE_URL}/rest/v1/ticket_items?box_number=eq.0&select=id,ticket_id,box_number,brand,model"
    response = requests.get(get_url, headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Error al buscar items: {response.status_code}")
        print(response.text)
        sys.exit(1)
    
    items = response.json()
    if not items:
        print("❌ No hay items con box_number=0")
        sys.exit(1)
    
    print(f"✓ Encontrados {len(items)} items con box_number=0")
    print()
    
    # Mostrar items encontrados
    for item in items:
        print(f"   - ID: {item['id'][:8]}... | Ticket: {item['ticket_id'][:8]}... | {item['brand']} {item['model']}")
    print()
    
    # 2. Actualizar cada item a box_number=10006
    print("2️⃣ Actualizando box_number a 10006 para cada item...")
    
    updated_count = 0
    for item in items:
        item_id = item['id']
        
        # Hacer PATCH para actualizar
        update_url = f"{SUPABASE_URL}/rest/v1/ticket_items?id=eq.{item_id}"
        update_payload = {"box_number": 10006}
        
        update_response = requests.patch(update_url, json=update_payload, headers=headers)
        
        if update_response.status_code != 204:
            print(f"❌ Error actualizando item {item_id[:8]}...: {update_response.status_code}")
            print(update_response.text)
            continue
        
        updated_count += 1
        print(f"   ✓ Item {item_id[:8]}... actualizado")
    
    print()
    print(f"✅ {updated_count} items actualizados correctamente")
    print()
    
    # 3. Verificar los cambios
    print("3️⃣ Verificando cambios...")
    verify_url = f"{SUPABASE_URL}/rest/v1/ticket_items?box_number=eq.10006&select=id,box_number,brand,model"
    verify_response = requests.get(verify_url, headers=headers)
    
    if verify_response.status_code == 200:
        verified_items = verify_response.json()
        print(f"✓ Verificados {len(verified_items)} items en Caja #10006")
        for item in verified_items:
            print(f"   - {item['brand']} {item['model']} (box_number: {item['box_number']})")
    
    print()
    print("✅ FIX COMPLETADO EXITOSAMENTE")
    print()
    print("💡 PRÓXIMOS PASOS:")
    print("1. Recarga el módulo de Recepción en el navegador (F5)")
    print("2. Ingresa el número de ticket: TK-2026-00006")
    print("3. Presiona 'Cargar Cajas'")
    print("4. Deberías ver la Caja #10006 ahora")

except requests.exceptions.RequestException as e:
    print(f"❌ Error de conexión: {str(e)}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error inesperado: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
