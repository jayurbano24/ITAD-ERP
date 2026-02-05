export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'
import { parse } from 'csv-parse/sync';

// POST: Importar procesadores desde archivo Excel o CSV
export async function POST(request: NextRequest) {
  try {
    console.log('Paso 1: Iniciando importación de procesadores');
    const supabase = await createClient()
    const formData = await request.formData()
    console.log('Paso 2: formData obtenido');
    const file = formData.get('file') as File | null
    if (!file) {
      console.error('No se envió archivo');
      return NextResponse.json({ error: 'No se envió archivo' }, { status: 400 })
    }
    console.log('Paso 3: Archivo recibido:', file.name || '[sin nombre]');
    const buffer = await (file as any).arrayBuffer();
    console.log('Paso 4: Buffer obtenido, tamaño:', buffer.byteLength);
    let procesadores: { nombre: string, is_active: boolean }[] = [];
    // Detectar tipo de archivo por nombre
    const fileName = file.name || '';
    if (fileName.endsWith('.csv')) {
      // Parsear CSV
      const text = new TextDecoder().decode(buffer);
      console.log('Paso 5: Texto CSV decodificado, longitud:', text.length);
      try {
        const records = parse(text, { columns: true, skip_empty_lines: true });
        console.log('Paso 6: Registros CSV parseados:', records.length);
        procesadores = records
          .map((row: any) => ({ nombre: row.nombre || row.name, is_active: true }))
          .filter((p: any) => p.nombre && typeof p.nombre === 'string' && p.nombre.trim().length > 0);
        console.log('Paso 7: Procesadores filtrados:', procesadores.length);
      } catch (csvError) {
        console.error('Error al parsear CSV:', csvError);
        return NextResponse.json({ error: 'Error al parsear CSV', details: String(csvError) }, { status: 500 });
      }
    } else {
      // Parsear Excel
      try {
        const workbook = XLSX.read(buffer, { type: 'array' });
        console.log('Paso 5: Excel leído');
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        console.log('Paso 6: Filas Excel parseadas:', rows.length);
        let nombreIdx = -1;
        if (rows.length > 0) {
          nombreIdx = rows[0].findIndex((col: any) => String(col).toLowerCase().includes('nombre') || String(col).toLowerCase().includes('procesador'));
        }
        if (nombreIdx === -1) nombreIdx = 0;
        procesadores = rows.slice(1)
          .map((row: any) => ({ nombre: row[nombreIdx], is_active: true }))
          .filter((p: any) => p.nombre && typeof p.nombre === 'string' && p.nombre.trim().length > 0);
        console.log('Paso 7: Procesadores filtrados:', procesadores.length);
      } catch (excelError) {
        console.error('Error al parsear Excel:', excelError);
        return NextResponse.json({ error: 'Error al parsear Excel', details: String(excelError) }, { status: 500 });
      }
    }
    console.log('Paso 8: Insertando en base de datos:', procesadores.length);
    const { error } = await supabase.from('catalog_processors').insert(procesadores)
    if (error) {
      console.error('Error al importar procesadores:', error);
      return NextResponse.json({ error: 'No se pudo importar procesadores', details: String(error) }, { status: 500 })
    }
    console.log('Paso 9: Importación exitosa');
    return NextResponse.json({ success: true, count: procesadores.length })
  } catch (error) {
    console.error('Error interno del servidor:', error);
    if (error && (error as any).stack) {
      console.error((error as any).stack);
    }
    return NextResponse.json({ error: 'Error interno del servidor', details: String(error) }, { status: 500 })
  }
}
