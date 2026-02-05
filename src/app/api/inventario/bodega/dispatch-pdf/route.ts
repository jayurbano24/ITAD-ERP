import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const dispatchId = searchParams.get('dispatchId')

    if (!dispatchId) {
      return NextResponse.json({ error: 'dispatchId requerido' }, { status: 400 })
    }

    const supabase = await createClient()

    // Obtener el despacho con sus items y cliente
    const { data: dispatch, error: dispatchError } = await supabase
      .from('dispatches')
      .select(`
                *,
                client:client_id (commercial_name),
                items:dispatch_items (
                    asset_id,
                    product_summary,
                    weight_lb,
                    asset:assets(serial_number, internal_tag)
                )
            `)
      .eq('id', dispatchId)
      .single()

    if (dispatchError || !dispatch) {
      return NextResponse.json({ error: 'Despacho no encontrado' }, { status: 404 })
    }

    const today = new Date().toLocaleDateString('es-GT', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })

    // Generamos HTML para impresión
    const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Guía de Despacho - ${dispatch.dispatch_code}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body class="bg-white p-10 font-sans text-slate-800" onload="window.print()">
      
      <!-- Header -->
      <div class="flex justify-between items-start border-b-2 border-indigo-600 pb-6 mb-8">
        <div>
           <div class="flex items-center gap-3 mb-2">
             <div class="w-10 h-10 bg-indigo-600 rounded-lg"></div>
             <h1 class="text-3xl font-bold uppercase tracking-wider text-slate-900">Guía de Despacho</h1>
           </div>
           <p class="text-lg font-mono font-bold text-indigo-600">${dispatch.dispatch_code}</p>
        </div>
        <div class="text-right">
           <p class="font-bold text-lg">ITAD GUATEMALA</p>
           <p class="text-sm text-slate-500">Ciudad de Guatemala</p>
           <p class="text-sm text-slate-500">${new Date(dispatch.dispatched_at).toLocaleDateString('es-GT')}</p>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-8 mb-8">
        <!-- Info Cliente -->
        <div class="bg-slate-50 p-6 rounded-xl border border-slate-200">
          <h3 class="text-xs font-bold uppercase text-slate-400 mb-2 tracking-widest">Cliente / Destino</h3>
          <p class="text-xl font-bold text-slate-900">${(dispatch.client as any)?.commercial_name || 'N/A'}</p>
          <p class="text-sm text-slate-500 mt-1">Movement Type: ${dispatch.movement_type}</p>
        </div>

        <!-- Info Transporte -->
        <div class="bg-indigo-50/50 p-6 rounded-xl border border-indigo-100">
          <h3 class="text-xs font-bold uppercase text-indigo-400 mb-2 tracking-widest">Transporte</h3>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-xs text-slate-400">Chofer</p>
              <p class="font-bold text-slate-900">${dispatch.driver_name || 'N/A'}</p>
            </div>
            <div>
              <p class="text-xs text-slate-400">Vehículo / Placa</p>
              <p class="font-bold text-slate-900 font-mono">${dispatch.vehicle_plate || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Resumen de Carga -->
      <div class="flex gap-4 mb-8">
        <div class="flex-1 border border-slate-200 rounded-xl p-4 text-center">
          <p class="text-xs text-slate-400 uppercase font-bold">Total Equipos</p>
          <p class="text-2xl font-bold text-slate-900">${dispatch.items?.length || 0}</p>
        </div>
        <div class="flex-1 border border-slate-200 rounded-xl p-4 text-center">
          <p class="text-xs text-slate-400 uppercase font-bold">Peso Total (Lb)</p>
          <p class="text-2xl font-bold text-slate-900">${dispatch.total_weight_lb || 0}</p>
        </div>
      </div>

      <!-- Tabla de Equipos -->
      <table class="w-full text-sm mb-8 border-collapse">
        <thead>
          <tr class="bg-slate-900 text-white">
             <th class="py-3 px-4 text-left font-bold rounded-tl-lg">Serie / IMEI</th>
             <th class="py-3 px-4 text-left font-bold">Descripción / Resumen</th>
             <th class="py-3 px-4 text-right font-bold rounded-tr-lg whitespace-nowrap">Peso (Lb)</th>
          </tr>
        </thead>
        <tbody>
          ${dispatch.items.map((item: any) => `
            <tr class="border-b border-slate-100 odd:bg-slate-50/50">
               <td class="py-3 px-4 font-mono text-slate-600 font-bold">${item.asset?.serial_number || item.asset?.internal_tag || 'S/N'}</td>
               <td class="py-3 px-4">${item.product_summary || 'N/A'}</td>
               <td class="py-3 px-4 text-right text-slate-500">${item.weight_lb || 0}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Firmas -->
      <div class="mt-20 grid grid-cols-3 gap-10">
         <div class="border-t border-slate-400 pt-4 text-center">
            <p class="font-bold text-sm">Entregado por (ITAD)</p>
            <div class="h-20"></div>
            <p class="text-xs text-slate-400 uppercase tracking-widest border-t border-slate-200 pt-2">Firma y Sello</p>
         </div>
         <div class="border-t border-slate-400 pt-4 text-center">
            <p class="font-bold text-sm">Transportista</p>
            <div class="h-20"></div>
            <p class="text-xs text-slate-400 uppercase tracking-widest border-t border-slate-200 pt-2">Firma y DPI</p>
         </div>
         <div class="border-t border-slate-400 pt-4 text-center">
            <p class="font-bold text-sm">Recibido por (Cliente)</p>
            <div class="h-20"></div>
            <p class="text-xs text-slate-400 uppercase tracking-widest border-t border-slate-200 pt-2">Firma y Sello</p>
         </div>
      </div>

      <div class="mt-12 text-center text-[10px] text-slate-400 leading-tight">
        <p>Este documento es un comprobante digital generado por el sistema ITAD ERP para control interno de inventario y logística.</p>
        <p class="mt-1 uppercase">Fecha de Emisión: ${today}</p>
      </div>

    </body>
    </html>
    `

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    })
  } catch (error) {
    console.error('Error generando PDF de despacho:', error)
    return NextResponse.json({ error: 'Error al generar el documento' }, { status: 500 })
  }
}
