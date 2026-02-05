#!/usr/bin/env python3
"""
Script para verificar el estado de la caja #10006 en TK-2026-00006
y mostrar qué seriales necesitan ser agregados
"""

import os
import json
import requests
from dotenv import load_dotenv

load_dotenv('.env.local')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL', '').strip()
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '').strip()

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configurados")
    exit(1)

# Headers para Supabase REST API
headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

def get_ticket_info(readable_id):
    """Obtiene info del ticket por readable_id"""
    url = f"{SUPABASE_URL}/rest/v1/operations_tickets?readable_id=eq.{readable_id}&select=id,readable_id,title"
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        data = response.json()
        return data[0] if data else None
    return None

def get_box_items(ticket_id, box_number):
    """Obtiene los items de una caja específica"""
    # Escapar comillas en la búsqueda
    url = f"{SUPABASE_URL}/rest/v1/ticket_items?ticket_id=eq.{ticket_id}&box_number=eq.{box_number}&select=*"
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        return response.json()
    return []

def main():
    ticket_readable_id = 'TK-2026-00006'
    box_number = 10006
    
    print(f"🔍 Buscando ticket {ticket_readable_id}...")
    ticket = get_ticket_info(ticket_readable_id)
    
    if not ticket:
        print(f"❌ Ticket {ticket_readable_id} no encontrado")
        exit(1)
    
    ticket_id = ticket['id']
    print(f"✅ Ticket encontrado: {ticket['readable_id']} (ID: {ticket_id})")
    print(f"   Título: {ticket.get('title', 'N/A')}")
    
    print(f"\n📦 Buscando caja #{box_number}...")
    items = get_box_items(ticket_id, box_number)
    
    if not items:
        print(f"❌ No se encontraron items en caja #{box_number}")
        exit(1)
    
    print(f"✅ Se encontraron {len(items)} items en la caja:\n")
    
    for idx, item in enumerate(items, 1):
        serial = item.get('collected_serial', '')
        brand = item.get('brand_full') or item.get('brand') or 'Sin marca'
        model = item.get('model_full') or item.get('model') or 'Sin modelo'
        
        print(f"  Item #{idx}:")
        print(f"    - Equipo: {brand} {model}")
        print(f"    - Tipo: {item.get('product_type', 'N/A')}")
        print(f"    - Serial: {serial if serial else '(vacío)'}")
        print()
    
    # Contar items sin serial
    items_without_serial = [i for i in items if not i.get('collected_serial')]
    if items_without_serial:
        print(f"⚠️  {len(items_without_serial)} item(s) sin número de serie")
        print("\n💡 Para agregar seriales retroactivamente:")
        print("   1. Ve a Logística")
        print("   2. Busca el ticket TK-2026-00006")
        print("   3. En 'Cajas guardadas', haz clic en ✏️ para editar la caja #10006")
        print("   4. Haz clic en cada equipo para editar y agrega los seriales")
        print("   5. Guarda la caja")
    else:
        print(f"✅ Todos los items tienen números de serie registrados")

if __name__ == '__main__':
    main()
