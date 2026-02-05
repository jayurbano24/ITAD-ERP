import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
   const { searchParams } = new URL(request.url)
   const idsParam = searchParams.get('ids')

   if (!idsParam) {
      return NextResponse.json({ error: 'IDs requeridos' }, { status: 400 })
   }

   const ids = idsParam.split(',')
   const supabase = await createClient()

   const { data: assets } = await supabase
      .from('assets')
      .select('*')
      .in('id', ids)

   if (!assets || assets.length === 0) {
      return NextResponse.json({ error: 'Equipos no encontrados' }, { status: 404 })
   }

   // Obtenemos info de la empresa y fecha
   const { data: company } = await supabase.from('company_settings').select('*').single()
   const today = new Date().toLocaleDateString('es-GT', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
   })

   // Generamos HTML simple para impresión
   const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Certificado de Destrucción - ITAD</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-white p-10 font-sans text-slate-800" onload="window.print()">
      
      <!-- Header -->
      <div class="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-8">
        <div>
           <h1 class="text-3xl font-bold uppercase tracking-wider text-slate-900">Certificado de Destrucción</h1>
           <p class="text-sm font-medium text-slate-500 mt-1">Referencia #${Math.floor(Date.now() / 1000)}</p>
        </div>
        <div class="text-right">
           <p class="font-bold text-lg">${company?.name || 'ITAD GUATEMALA'}</p>
           <p class="text-sm text-slate-500">${company?.address || 'Ciudad de Guatemala'}</p>
           <p class="text-sm text-slate-500">${new Date().toISOString().split('T')[0]}</p>
        </div>
      </div>

      <!-- Declaración -->
      <div class="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8">
         <p class="text-justify leading-relaxed">
           Por medio de la presente certificamos que los equipos listados a continuación han sido procesados para su 
           <strong>DESTRUCCIÓN TOTAL</strong> y reciclaje de materiales, cumpliendo con los estándares ambientales R2v3 
           y las políticas de seguridad de datos. Se garantiza que la información contenida en estos dispositivos 
           es irrecuperable.
         </p>
      </div>

      <!-- Tabla de Equipos -->
      <table class="w-full text-sm mb-8 border-collapse">
        <thead>
          <tr class="bg-slate-100 border-b border-slate-300">
             <th class="py-3 px-4 text-left font-bold text-slate-700">Serie / IMEI</th>
             <th class="py-3 px-4 text-left font-bold text-slate-700">Marca / Modelo</th>
             <th class="py-3 px-4 text-left font-bold text-slate-700">Tipo</th>
             <th class="py-3 px-4 text-center font-bold text-slate-700">Peso (Est.)</th>
          </tr>
        </thead>
        <tbody>
          ${assets.map(asset => `
            <tr class="border-b border-slate-100">
               <td class="py-2 px-4 font-mono text-slate-600">${asset.serial_number}</td>
               <td class="py-2 px-4">${asset.manufacturer || '-'} ${asset.model || '-'}</td>
               <td class="py-2 px-4">${asset.asset_type || '-'}</td>
               <td class="py-2 px-4 text-center text-slate-500">
                 ${(asset.specifications as any)?.destruction_batch_weight
         ? (asset.specifications as any).destruction_batch_weight + ' Lb'
         : '-'}
               </td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Evidencia (Si existe en metadatos) -->
      ${assets.some(a => (a.specifications as any)?.destruction_evidence?.length) ? `
        <div class="mb-8">
           <h3 class="text-sm font-bold uppercase border-b border-slate-200 pb-2 mb-4">Evidencia Fotográfica</h3>
           <div class="grid grid-cols-4 gap-4">
              ${assets.flatMap(a => (a.specifications as any)?.destruction_evidence || []).map((url: string) => `
                 <div class="aspect-square bg-slate-100 rounded border overflow-hidden">
                    <img src="${url}" class="w-full h-full object-cover grayscale opacity-80" />
                 </div>
              `).join('')}
           </div>
        </div>
      ` : ''}

      <!-- Firmas -->
      <div class="mt-20 grid grid-cols-2 gap-20">
         <div class="border-t border-slate-400 pt-4 text-center">
            <p class="font-bold">Gerente de Operaciones</p>
            <p class="text-xs text-slate-400">Firma Autorizada</p>
         </div>
         <div class="border-t border-slate-400 pt-4 text-center">
            <p class="font-bold">Técnico Responsable</p>
            <p class="text-xs text-slate-400">Firma Ejecutora</p>
         </div>
      </div>

      <div class="mt-12 text-center text-xs text-slate-400">
        <p>Este documento es un comprobante digital generado por el sistema ITAD ERP.</p>
        <p>Fecha de Impresión: ${today}</p>
      </div>

    </body>
    </html>
  `

   return new NextResponse(html, {
      headers: {
         'Content-Type': 'text/html',
      },
   })
}
