import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('document_templates')
      .select('content_html')
      .eq('slug', 'guias-y-manifiestos')
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Error fetching template:', error)
      return NextResponse.json(
        { error: 'Plantilla no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      content: data.content_html
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Error in API:', error)
    return NextResponse.json(
      { error: 'Error al obtener la plantilla' },
      { status: 500 }
    )
  }
}
