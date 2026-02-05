#!/usr/bin/env python3
"""Update existing logistics template with new design"""
import os
import json
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: Missing Supabase credentials")
    exit(1)

supabase = create_client(url, key)

NEW_TEMPLATE = '''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Guía de Manifiesto</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
            background: white; 
            padding: 40px 30px;
            color: #333;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
        }
        .header {
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 1px solid #e0e0e0;
            padding-bottom: 20px;
        }
        .header-left h1 {
            font-size: 28px;
            font-weight: 700;
            letter-spacing: -0.5px;
            color: #111;
        }
        .header-left p {
            color: #666;
            font-size: 13px;
            margin-top: 5px;
        }
        .header-right {
            text-align: right;
            font-size: 12px;
            color: #999;
        }
        .section {
            margin-bottom: 25px;
        }
        .section-title {
            font-size: 11px;
            font-weight: 600;
            color: #999;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 10px;
        }
        .field-group {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 15px;
        }
        .field-group.full {
            grid-template-columns: 1fr;
        }
        .field {
            display: flex;
            flex-direction: column;
        }
        .field-label {
            font-size: 11px;
            color: #999;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
        }
        .field-value {
            font-size: 16px;
            font-weight: 500;
            color: #222;
        }
        .box-info {
            background: #f9f9f9;
            border: 1px solid #e5e5e5;
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 15px;
        }
        .box-label {
            font-size: 11px;
            color: #999;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }
        .box-value {
            font-size: 20px;
            font-weight: 600;
            color: #111;
        }
        .description-box {
            background: #fafafa;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 12px;
            min-height: 60px;
            font-size: 13px;
            color: #555;
        }
        .description-label {
            font-size: 11px;
            color: #999;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="header-left">
                <h1>MANIFIESTO</h1>
                <p>{Manifest_Number}</p>
            </div>
            <div class="header-right">
                {Order_Date}
            </div>
        </div>

        <!-- Client Section -->
        <div class="section">
            <div class="section-title">Cliente</div>
            <div class="field-group">
                <div class="field">
                    <div class="field-label">Nombre</div>
                    <div class="field-value">{Client_Name}</div>
                </div>
                <div class="field">
                    <div class="field-label">Recolector</div>
                    <div class="field-value">{Collector_User}</div>
                </div>
            </div>
        </div>

        <!-- Box Section -->
        <div class="section">
            <div class="box-info">
                <div class="box-label">Caja</div>
                <div class="box-value">#{Box_ID}</div>
            </div>
        </div>

        <!-- Description Section -->
        <div class="section">
            <div class="description-label">Descripción</div>
            <div class="description-box">{Notes}</div>
        </div>
    </div>
</body>
</html>'''

print("Updating logistics template...")

# Update the template
response = supabase.table('document_templates').update({
    'content_html': NEW_TEMPLATE
}).eq('slug', 'guias-y-manifiestos').execute()

if response.data:
    print(f"✅ Template updated successfully!")
    print(f"Updated record: {response.data[0]['id']}")
else:
    print("❌ Failed to update template")
    print(f"Response: {response}")
