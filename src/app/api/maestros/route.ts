import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic';

// GET: Obtener catálogo maestro por tipo
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')

    if (!tipo) {
      return NextResponse.json({ error: 'Falta el parámetro tipo' }, { status: 400 })
    }

    // Valores por defecto como fallback
    const defaultValues: Record<string, string[]> = {
      ram_capacity: ['4 GB', '8 GB', '16 GB', '32 GB', '64 GB'],
      ram_type: ['DDR3', 'DDR4', 'DDR5', 'LPDDR3', 'LPDDR4', 'LPDDR4X', 'LPDDR5'],
      disk_capacity: ['128 GB', '256 GB', '512 GB', '1 TB', '2 TB', '4 TB'],
      disk_type: ['HDD', 'SSD', 'NVMe SSD', 'eMMC']
    }

    // Manejar RAM capacity y RAM type desde catalog_memory
    if (tipo === 'ram_capacity' || tipo === 'ram_type') {
      try {
        const { data: ramData, error: ramError } = await supabase
          .from('catalog_memory')
          .select(tipo === 'ram_capacity' ? 'ram_capacity' : 'ram_type')
          .eq('is_active', true)

        if (!ramError && ramData && ramData.length > 0) {
          // Extraer valores únicos
          const uniqueValues = Array.from(new Set(
            ramData.map((item: any) => item[tipo === 'ram_capacity' ? 'ram_capacity' : 'ram_type'])
              .filter((val: any) => val && String(val).trim() !== '')
          )).sort()

          if (uniqueValues.length > 0) {
            const items = uniqueValues.map((value, index) => ({
              id: `ram-${tipo}-${index}`,
              name: value
            }))
            return NextResponse.json({ items })
          }
        }
        // Si no hay datos en catalog_memory, usar valores por defecto
        console.warn(`No data in catalog_memory for ${tipo}, using defaults`)
      } catch (ramDbError: any) {
        console.error(`Error loading RAM catalog for ${tipo}:`, ramDbError)
        // Continuar con valores por defecto
      }

      // Fallback a valores por defecto
      const items = defaultValues[tipo].map((value, index) => ({
        id: `default-${tipo}-${index}`,
        name: value
      }))
      return NextResponse.json({ items })
    }

    // Manejar disk_capacity y disk_type desde catalog_storage
    if (tipo === 'disk_capacity' || tipo === 'disk_type') {
      try {
        const { data: storageData, error: storageError } = await supabase
          .from('catalog_storage')
          .select(tipo === 'disk_capacity' ? 'storage_capacity' : 'storage_type')
          .eq('is_active', true)

        if (!storageError && storageData && storageData.length > 0) {
          // Extraer valores únicos
          const uniqueValues = Array.from(new Set(
            storageData.map((item: any) => item[tipo === 'disk_capacity' ? 'storage_capacity' : 'storage_type'])
              .filter((val: any) => val && String(val).trim() !== '')
          )).sort()

          if (uniqueValues.length > 0) {
            const items = uniqueValues.map((value, index) => ({
              id: `storage-${tipo}-${index}`,
              name: value
            }))
            return NextResponse.json({ items })
          }
        }
        // Si no hay datos en catalog_storage, usar valores por defecto
        console.warn(`No data in catalog_storage for ${tipo}, using defaults`)
      } catch (storageDbError: any) {
        console.error(`Error loading storage catalog for ${tipo}:`, storageDbError)
        // Continuar con valores por defecto
      }

      // Fallback a valores por defecto
      const items = defaultValues[tipo].map((value, index) => ({
        id: `default-${tipo}-${index}`,
        name: value
      }))
      return NextResponse.json({ items })
    }

    // Mapeo de tipo a tabla y campo (solo para tipos que tienen catálogo en BD)
    const catalogMap: Record<string, { table: string, field: string; extraFields?: string[] }> = {
      procesador: { table: 'catalog_processors', field: 'name' },
      teclado: { table: 'catalog_keyboards', field: 'name' },
      accesorios: { table: 'catalog_accessories', field: 'name' },
      marca: { table: 'catalog_brands', field: 'name' },
      modelo: { table: 'catalog_models', field: 'name', extraFields: ['brand_id', 'product_type_id'] },
      tipo_producto: { table: 'catalog_product_types', field: 'name' }
    }

    const catalog = catalogMap[tipo]
    if (!catalog) {
      return NextResponse.json({ error: 'Tipo de catálogo no soportado' }, { status: 400 })
    }

    try {
      const extraSelect = catalog.extraFields?.length
        ? `, ${catalog.extraFields.join(', ')}`
        : ''
      const { data, error } = await supabase
        .from(catalog.table)
        .select(`id, ${catalog.field}${extraSelect}`)
        .eq('is_active', true)
        .order(catalog.field, { ascending: true })

      if (error) {
        console.warn(`[API/maestros] Catalog ${tipo} (${catalog.table}):`, error.message)
        return NextResponse.json({ items: [] })
      }

      const items = (data || []).map((row: any) => {
        const base = {
          id: row.id,
          [catalog.field]: row[catalog.field],
          name: row[catalog.field]
        }
        if (catalog.extraFields?.length) {
          catalog.extraFields.forEach((field) => {
            base[field] = row[field]
          })
        }
        return base
      })
      return NextResponse.json({ items })
    } catch (dbError: any) {
      console.warn(`[API/maestros] Fallback empty for ${tipo}:`, dbError?.message)
      return NextResponse.json({ items: [] })
    }
  } catch (error) {
    console.error('[API/maestros] Unexpected error:', error)
    return NextResponse.json({ items: [] })
  }
}
