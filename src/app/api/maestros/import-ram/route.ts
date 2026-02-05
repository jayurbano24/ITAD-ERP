import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'
import { parse } from 'csv-parse/sync'

export const runtime = 'nodejs';

// POST: Importar memoria RAM desde archivo Excel o CSV
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No se envió archivo' }, { status: 400 })
    }
    const buffer = await (file as any).arrayBuffer();
    let ramItems: { name: string, ram_capacity: string, ram_type: string, is_active: boolean }[] = [];
    const fileName = file.name || '';
    if (fileName.endsWith('.csv')) {
      const text = new TextDecoder().decode(buffer);
      try {
        const records = parse(text, { columns: true, skip_empty_lines: true });
        ramItems = records
          .map((row: any) => ({
            name: row.name || row.nombre,
            ram_capacity: row.ram_capacity || row.capacidad || '',
            ram_type: row.ram_type || row.tecnologia || '',
            is_active: true
          }))
          .filter((r: any) => r.name && r.ram_capacity && r.ram_type);
      } catch (csvError) {
        return NextResponse.json({ error: 'Error al parsear CSV', details: String(csvError) }, { status: 500 });
      }
    } else {
      try {
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        let nameIdx = -1, capIdx = -1, typeIdx = -1;
        if (rows.length > 0) {
          nameIdx = rows[0].findIndex((col: any) => String(col).toLowerCase().includes('nombre') || String(col).toLowerCase().includes('name'));
          capIdx = rows[0].findIndex((col: any) => String(col).toLowerCase().includes('capacidad') || String(col).toLowerCase().includes('ram_capacity'));
          typeIdx = rows[0].findIndex((col: any) => String(col).toLowerCase().includes('tecnologia') || String(col).toLowerCase().includes('ram_type'));
        }
        ramItems = rows.slice(1)
          .map((row: any) => ({
            name: row[nameIdx],
            ram_capacity: row[capIdx],
            ram_type: row[typeIdx],
            is_active: true
          }))
          .filter((r: any) => r.name && r.ram_capacity && r.ram_type);
      } catch (excelError) {
        return NextResponse.json({ error: 'Error al parsear Excel', details: String(excelError) }, { status: 500 });
      }
    }
    const { error } = await supabase.from('catalog_ram').insert(ramItems)
    if (error) {
      return NextResponse.json({ error: 'No se pudo importar memoria RAM', details: String(error) }, { status: 500 })
    }
    return NextResponse.json({ success: true, count: ramItems.length })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno del servidor', details: String(error) }, { status: 500 })
  }
}
