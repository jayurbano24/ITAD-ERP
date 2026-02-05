#!/usr/bin/env python3
"""
Script para verificar y actualizar la plantilla de Logística en Supabase
"""

import os
import sys
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv('.env.local')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Variables de entorno no configuradas")
    sys.exit(1)

try:
    from supabase import create_client
except ImportError:
    os.system('pip install supabase')
    from supabase import create_client

def main():
    print("🔍 Conectando a Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print("📋 Buscando plantilla 'guias-y-manifiestos'...")
    try:
        response = supabase.table('document_templates').select('*').eq('slug', 'guias-y-manifiestos').execute()
        
        if response.data and len(response.data) > 0:
            template = response.data[0]
            print(f"\n✅ Plantilla encontrada:")
            print(f"   ID: {template['id']}")
            print(f"   Nombre: {template['name']}")
            print(f"   Categoría: {template['category']}")
            print(f"   Activa: {template['is_active']}")
            print(f"   Variables: {len(template.get('variables', []))} definidas")
            
            # Si la categoría es 'otros', actualizar a 'logistica'
            if template['category'] != 'logistica':
                print(f"\n⚠️ La categoría es '{template['category']}', actualizando a 'logistica'...")
                update_response = supabase.table('document_templates').update({
                    'category': 'logistica'
                }).eq('id', template['id']).execute()
                
                if update_response.data:
                    print("✅ Categoría actualizada a 'logistica'")
                else:
                    print(f"⚠️ No se pudo actualizar la categoría")
            else:
                print(f"\n✅ La categoría ya es 'logistica'")
        else:
            print("❌ La plantilla no existe")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == '__main__':
    main()
