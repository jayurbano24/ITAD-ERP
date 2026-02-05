#!/usr/bin/env python3
"""
Script para listar los últimos tickets registrados
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv('.env.local')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL', '').strip()
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '').strip()

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: Variables de entorno no configuradas")
    exit(1)

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

# Obtener últimos 20 tickets
url = f"{SUPABASE_URL}/rest/v1/tickets?order=created_at.desc&limit=20&select=id,readable_id,client_name,status"
response = requests.get(url, headers=headers)

if response.status_code == 200:
    tickets = response.json()
    print("📋 Últimos 20 tickets registrados:\n")
    for i, ticket in enumerate(tickets, 1):
        print(f"{i:2}. {ticket['readable_id']} - {ticket['client_name']} ({ticket['status']})")
else:
    print(f"❌ Error al obtener tickets: {response.status_code}")
    print(response.text)
