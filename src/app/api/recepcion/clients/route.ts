import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** Clientes activos para alta rápida de ticket en recepción */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('crm_entities')
      .select('id, commercial_name, tax_id_nit, account_class')
      .eq('is_active', true)
      .eq('entity_type', 'client')
      .order('commercial_name', { ascending: true })
      .limit(500)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ clients: data ?? [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error cargando clientes'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

const normalizeNit = (nit: string) => {
  const n = nit.trim().toUpperCase()
  if (!n || n === 'C/F' || n === 'CONSUMIDOR FINAL') return 'CF'
  return nit.trim()
}

const isConsumidorFinalNit = (nit: string) => normalizeNit(nit) === 'CF'

/** Alta rápida de cliente desde recepción */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = (await request.json()) as {
      commercial_name?: string
      tax_id_nit?: string
      phone?: string | null
      email?: string | null
      account_class?: 'empresa' | 'cliente_final'
    }

    const commercial_name = (body.commercial_name || '').trim()
    const tax_id_nit = normalizeNit(body.tax_id_nit || 'CF')
    const account_class = body.account_class === 'cliente_final' ? 'cliente_final' : 'empresa'

    if (!commercial_name) {
      return NextResponse.json({ error: 'El nombre del cliente es requerido' }, { status: 400 })
    }

    if (!isConsumidorFinalNit(tax_id_nit)) {
      const { data: existing } = await supabase
        .from('crm_entities')
        .select('id, commercial_name, tax_id_nit, account_class')
        .eq('tax_id_nit', tax_id_nit)
        .maybeSingle()
      if (existing) {
        return NextResponse.json({ client: existing, reused: true })
      }
    }

    const { data, error } = await supabase
      .from('crm_entities')
      .insert({
        commercial_name,
        tax_id_nit: isConsumidorFinalNit(tax_id_nit) ? 'CF' : tax_id_nit,
        entity_type: 'client',
        account_class,
        phone: body.phone?.trim() || null,
        email: body.email?.trim() || null,
        city: 'Guatemala',
        country: 'Guatemala',
        is_active: true,
      })
      .select('id, commercial_name, tax_id_nit, account_class')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ client: data, reused: false })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error creando cliente'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
