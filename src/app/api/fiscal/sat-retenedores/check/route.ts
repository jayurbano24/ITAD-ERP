import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { lookupWithholdingAgent } from '@/lib/fiscal/lookupWithholdingAgent'
import { DEFAULT_IVA_WITHHOLDING_RATE } from '@/lib/fiscal/ivaWithholding'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const url = new URL(request.url)
    const nit = url.searchParams.get('nit')?.trim() ?? ''
    if (!nit) {
      return NextResponse.json({ error: 'Parámetro nit requerido' }, { status: 400 })
    }

    const lookup = await lookupWithholdingAgent(supabase, nit)

    let withholdingRate = DEFAULT_IVA_WITHHOLDING_RATE
    const { data: settings } = await supabase
      .from('company_settings')
      .select('iva_withholding_rate')
      .limit(1)
      .maybeSingle()
    const configured = Number(settings?.iva_withholding_rate)
    if (Number.isFinite(configured) && configured > 0 && configured <= 1) {
      withholdingRate = configured
    }

    return NextResponse.json({
      nit,
      ...lookup,
      withholdingRate,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al consultar agente retenedor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}