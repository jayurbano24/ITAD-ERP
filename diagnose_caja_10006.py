#!/usr/bin/env python3
"""
Script para diagnosticar por qué la caja #10006 no se visualiza en el módulo de Recepción
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
    print("Instala con: pip install supabase")
    sys.exit(1)

# Cargar credenciales de Supabase desde env
try:
    from dotenv import load_dotenv
    load_dotenv('.env.local')
except:
    pass

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: Variables SUPABASE_URL y SUPABASE_KEY no encontradas en .env.local")
    sys.exit(1)

# Conectar a Supabase
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

print("🔍 Diagnosticando caja #10006 en ticket TK-2026-00006...")
print()

try:
    # 1. Obtener información del ticket
    print("📋 INFORMACIÓN DEL TICKET")
    print("=" * 80)
    ticket_response = supabase.table('operations_tickets').select(
        'id, readable_id, status, received_units, expected_units, completed_at'
    ).ilike('readable_id', 'TK-2026-00006').execute()
    
    if not ticket_response.data:
        print("❌ Ticket TK-2026-00006 no encontrado")
        sys.exit(1)
    
    ticket = ticket_response.data[0]
    print(f"  Ticket ID (UUID): {ticket['id']}")
    print(f"  Ticket ID (Readable): {ticket['readable_id']}")
    print(f"  Estado: {ticket['status']}")
    print(f"  Unidades Recibidas: {ticket['received_units']} / {ticket['expected_units']}")
    print(f"  Completado en: {ticket['completed_at']}")
    print()
    
    # 2. Obtener todas las cajas del ticket
    print("📦 CAJAS EN EL TICKET")
    print("=" * 80)
    boxes_response = supabase.table('ticket_items').select(
        'id, box_number, box_sku, box_seal, box_reception_code, brand, model, collected_serial, validation_status, classification_f, classification_c'
    ).eq('ticket_id', ticket['id']).order('box_number', desc=False).execute()
    
    if not boxes_response.data:
        print("❌ No hay items en este ticket")
        sys.exit(1)
    
    # Agrupar por caja
    boxes_dict = {}
    for item in boxes_response.data:
        box_num = item['box_number'] or 0
        if box_num not in boxes_dict:
            boxes_dict[box_num] = {
                'sku': item['box_sku'],
                'seal': item['box_seal'],
                'reception_code': item['box_reception_code'],
                'items': []
            }
        boxes_dict[box_num]['items'].append(item)
    
    # Mostrar cajas
    for box_num in sorted(boxes_dict.keys()):
        box_data = boxes_dict[box_num]
        items = box_data['items']
        
        label = f"Caja #{box_num}" if box_num > 0 else "Items sin caja"
        print(f"\n  {label}")
        print(f"    SKU: {box_data['sku'] or 'N/A'}")
        print(f"    Sello: {box_data['seal'] or 'N/A'}")
        print(f"    Código Recepción: {box_data['reception_code'] or 'N/A'}")
        print(f"    Total de items: {len(items)}")
        
        # Mostrar items
        for idx, item in enumerate(items, 1):
            classified = "✓ Clasificado" if (item['classification_f'] and item['classification_c']) else "⚠ Pendiente"
            print(f"      [{idx}] {item['brand']} {item['model']} | S/N: {item['collected_serial']} | {classified}")
        
    print()
    
    # 3. Análisis del problema
    print("🔎 ANÁLISIS")
    print("=" * 80)
    
    if 10006 not in boxes_dict:
        print("❌ La caja #10006 NO se encontró en la base de datos")
        print("\n   Posibles causas:")
        print("   1. La caja nunca fue guardada en Logística")
        print("   2. Fue eliminada después de ser guardada")
        print("   3. El box_number es diferente (revisar cajas existentes arriba)")
    else:
        caja_10006 = boxes_dict[10006]
        print(f"✓ La caja #10006 EXISTE en la base de datos")
        print(f"  Items en la caja: {len(caja_10006['items'])}")
        
        # Verificar si el problema es de filtrado
        all_classified = all(
            item['classification_f'] and item['classification_c'] 
            for item in caja_10006['items']
        )
        print(f"  ¿Todos clasificados? {'Sí' if all_classified else 'No'}")
        print(f"  Validación status: {', '.join(set(item['validation_status'] for item in caja_10006['items']))}")
    
    print()
    print("💡 RECOMENDACIÓN:")
    print("=" * 80)
    print("Si la caja #10006 existe pero no se visualiza en Recepción:")
    print("1. Verifica el módulo RecepcionModule en la línea 251-310")
    print("2. Asegúrate de que el filtro en /api/logistica/boxes permite mostrar la caja")
    print("3. Revisa la consola del navegador para ver si hay errores en la respuesta del API")
    
except Exception as e:
    print(f"❌ Error durante el diagnóstico: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
