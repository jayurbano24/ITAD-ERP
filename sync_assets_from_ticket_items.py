#!/usr/bin/env python3
"""Sync asset manufacturer/model/type from ticket_items for a given ticket readable_id."""
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

def get_ticket_id(readable_id: str):
    url = f"{SUPABASE_URL}/rest/v1/operations_tickets?readable_id=eq.{readable_id}&select=id"
    res = requests.get(url, headers=headers)
    if res.status_code != 200:
        print(f"❌ Error al buscar ticket: {res.status_code} {res.text}")
        sys.exit(1)
    data = res.json()
    return data[0]['id'] if data else None


def get_ticket_items(ticket_id: str):
    url = (
        f"{SUPABASE_URL}/rest/v1/ticket_items?"
        f"ticket_id=eq.{ticket_id}&select=id,asset_id,brand_full,model_full,product_type,color_detail"
    )
    res = requests.get(url, headers=headers)
    if res.status_code != 200:
        print(f"❌ Error al obtener items: {res.status_code} {res.text}")
        sys.exit(1)
    return res.json()


def update_asset(asset_id: str, brand: str, model: str, product_type: str, color: str | None):
    url = f"{SUPABASE_URL}/rest/v1/assets?id=eq.{asset_id}"
    payload = {
        'manufacturer': brand or None,
        'model': model or None,
        'asset_type': product_type or None,
        'color': color or None
    }
    res = requests.patch(url, headers=headers, json=payload)
    if res.status_code not in (200, 204):
        print(f"⚠️  Error actualizando asset {asset_id}: {res.status_code} {res.text}")
        return False
    return True


def main():
    readable_id = 'TK-2026-00006'
    if len(sys.argv) > 1:
        readable_id = sys.argv[1]

    print(f"🔍 Ticket: {readable_id}")
    ticket_id = get_ticket_id(readable_id)
    if not ticket_id:
        print("❌ Ticket no encontrado")
        sys.exit(1)

    items = get_ticket_items(ticket_id)
    if not items:
        print("⚠️  No hay items para este ticket")
        sys.exit(0)

    updated = 0
    skipped = 0
    for item in items:
        asset_id = item.get('asset_id')
        if not asset_id:
            skipped += 1
            continue
        ok = update_asset(
            asset_id,
            item.get('brand_full') or '',
            item.get('model_full') or '',
            item.get('product_type') or '',
            item.get('color_detail')
        )
        if ok:
            updated += 1

    print(f"✅ Assets actualizados: {updated}")
    print(f"⏭️  Items sin asset_id: {skipped}")


if __name__ == '__main__':
    main()
