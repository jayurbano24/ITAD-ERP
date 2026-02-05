#!/usr/bin/env python3
"""
Script para buscar y corregir el box_number de la caja
"""

import sys
import os
from pathlib import Path

# Importar módulos necesarios
try:
    from supabase import create_client
except ImportError:
    print("❌ Error: python-supabase no está instalado")
    sys.exit(1)

# Credenciales de Supabase
SUPABASE_URL = 'https://lnuduhpsmdqjwyhhirba.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxudWR1aHBzbWRxand5aGhpcmJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MDY0MTEsImV4cCI6MjA4MDI4MjQxMX0.JHAB4y8_5v8dfzQ7HyVAULTq6kyvVH9WF2Gxhx6pSd4'

# Conectar a Supabase
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

print("🔍 Buscando tickets con cajas...")
print()

try:
    # Buscar todos los tickets
    tickets_response = supabase.table('operations_tickets').select('id, readable_id').execute()
    
    if not tickets_response.data:
        print("❌ No hay tickets")
        sys.exit(1)
    
    print(f"Encontrados {len(tickets_response.data)} tickets:")
    for ticket in tickets_response.data[:10]:  # Mostrar los primeros 10
        print(f"  - {ticket['readable_id']} ({ticket['id'][:8]}...)")
    
    print()
    print("Buscando items con box_number=0...")
    
    # Buscar items con box_number=0
    items_response = supabase.table('ticket_items').select(
        'id, ticket_id, box_number, brand, model'
    ).eq('box_number', 0).execute()
    
    if not items_response.data:
        print("❌ No hay items con box_number=0")
        sys.exit(1)
    
    print(f"Encontrados {len(items_response.data)} items con box_number=0")
    print()
    
    # Agrupar por ticket
    by_ticket = {}
    for item in items_response.data:
        tid = item['ticket_id']
        if tid not in by_ticket:
            by_ticket[tid] = []
        by_ticket[tid].append(item)
    
    for ticket_id, items in by_ticket.items():
        # Obtener readable_id del ticket
        ticket = next((t for t in tickets_response.data if t['id'] == ticket_id), None)
        readable = ticket['readable_id'] if ticket else ticket_id[:8]
        print(f"Ticket: {readable}")
        print(f"  Items con box_number=0: {len(items)}")
        for item in items:
            print(f"    - {item['brand']} {item['model']}")

except Exception as e:
    print(f"❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
