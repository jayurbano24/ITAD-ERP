import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic';

// GET: Obtener catálogo de accesorios
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const productTypeId = searchParams.get('productTypeId')

    // Primero intentar con la relación, si falla, intentar sin ella
    let query = supabase
      .from('catalog_accessories')
      .select(`
        id,
        name,
        product_type_id,
        is_required,
        is_active
      `)
      .eq('is_active', true)
      .order('name', { ascending: true })

    // Filtrar por tipo de producto si se proporciona
    if (productTypeId) {
      query = query.or(`product_type_id.eq.${productTypeId},product_type_id.is.null`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching accessories catalog:', error)
      // Si falla, retornar array vacío en lugar de error 500
      return NextResponse.json({ accessories: [] })
    }

    // Intentar enriquecer con información de product_type si es posible
    if (data && data.length > 0) {
      try {
        const productTypeIds = data
          .map(acc => acc.product_type_id)
          .filter((id): id is string => id !== null && id !== undefined)

        if (productTypeIds.length > 0) {
          const { data: productTypes } = await supabase
            .from('catalog_product_types')
            .select('id, name')
            .in('id', productTypeIds)

          if (productTypes) {
            const productTypesMap = new Map(productTypes.map(pt => [pt.id, pt]))
            data.forEach(acc => {
              if (acc.product_type_id && productTypesMap.has(acc.product_type_id)) {
                (acc as any).product_type = productTypesMap.get(acc.product_type_id)
              }
            })
          }
        }
      } catch (enrichError) {
        // Si falla el enriquecimiento, continuar sin él
        console.warn('Could not enrich accessories with product types:', enrichError)
      }
    }

    return NextResponse.json({ accessories: data || [] })
  } catch (error: any) {
    console.error('Unexpected error in accessories catalog:', error)
    // Retornar array vacío en lugar de error 500 para que el formulario funcione
    return NextResponse.json({ accessories: [] })
  }
}
