import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const CREATE_MAP: Record<
  string,
  {
    table: string
    build: (
      name: string,
      brand: string | null,
      generation: string | null,
      family: string | null
    ) => Record<string, unknown>
  }
> = {
  procesador: {
    table: 'catalog_processors',
    build: (name, brand, generation, family) => ({
      name,
      brand,
      generation,
      model: family,
      is_active: true,
    }),
  },
  teclado: {
    table: 'catalog_keyboards',
    build: (name, _brand, _generation, _family) => ({ name, is_active: true }),
  },
}

/** Alta rápida de un ítem en catálogo maestro (desde bodega / recepción). */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      tipo?: string
      name?: string
      brand?: string | null
      generation?: string | null
      family?: string | null
    }

    const tipo = (body.tipo || '').trim().toLowerCase()
    const name = (body.name || '').trim()
    const brand = (body.brand || '').trim() || null
    const generation = (body.generation || '').trim() || null
    const family = (body.family || '').trim() || null

    if (!tipo || !name) {
      return NextResponse.json({ error: 'tipo y name son requeridos' }, { status: 400 })
    }

    const spec = CREATE_MAP[tipo]
    if (!spec) {
      return NextResponse.json({ error: 'Tipo de catálogo no soportado para alta' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const insertRow = spec.build(name, brand, generation, family)
    const { data, error } = await supabase
      .from(spec.table)
      .insert(insertRow)
      .select('id, name, brand, generation, model')
      .maybeSingle()

    if (error) {
      const duplicate = error.code === '23505' || error.message.toLowerCase().includes('duplicate')
      if (duplicate) {
        return NextResponse.json({ error: 'Ese valor ya existe en el catálogo' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, item: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al guardar en catálogo'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
