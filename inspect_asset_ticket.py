#!/usr/bin/env python3
"""Inspect ticket_items and assets for a given serial."""
import os
import sys
import requests
from dotenv import load_dotenv

load_dotenv('.env.local')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL', '').strip()
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '').strip()

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configurados")
    sys.exit(1)

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

def fetch(url):
    res = requests.get(url, headers=headers)
    if res.status_code != 200:
        print(f"❌ Error {res.status_code}: {res.text}")
        sys.exit(1)
    return res.json()


def main():
    serial = sys.argv[1] if len(sys.argv) > 1 else '651651616516'
    print(f"🔎 Serial: {serial}")

    items_url = (
        f"{SUPABASE_URL}/rest/v1/ticket_items?"
        f"collected_serial=eq.{serial}&"
        f"select=id,ticket_id,asset_id,brand,model,brand_full,model_full,product_type,brand_id,model_id,product_type_id"
    )
    items = fetch(items_url)
    print("\nTicket items:")
    if not items:
        print("  (sin items)")
    else:
        for it in items:
            print(it)

    assets_url = (
        f"{SUPABASE_URL}/rest/v1/assets?"
        f"serial_number=eq.{serial}&"
        f"select=id,manufacturer,model,asset_type,color,batch_id,current_warehouse_id"
    )
    assets = fetch(assets_url)
    print("\nAssets:")
    if not assets:
        print("  (sin assets)")
    else:
        for a in assets:
            print(a)

if __name__ == '__main__':
    main()
