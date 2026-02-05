import { createClient } from '@/lib/supabase/server'
import { FileText, Truck, Calendar, User, Search, Download } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default async function DespachosPage({
    searchParams
}: {
    searchParams: { q?: string }
}) {
    const supabase = await createClient()
    const query = searchParams.q?.trim()

    // Query Base
    let baseQuery = supabase
        .from('dispatches')
        .select(`
            *,
            client:client_id (commercial_name),
            items:dispatch_items (
                count
            )
        `)

    if (query) {
        baseQuery = baseQuery.or(`dispatch_code.ilike.%${query}%,driver_name.ilike.%${query}%,vehicle_plate.ilike.%${query}%`)
    }

    const { data: dispatches, error } = await baseQuery.order('dispatched_at', { ascending: false })

    if (error) {
        console.error('Error fetching dispatches:', error)
    }

    let filteredDispatches = dispatches || []

    // Si hay búsqueda y no hubo resultados arriba, buscamos por series
    if (query && filteredDispatches.length === 0) {
        const { data: serialMatches } = await supabase
            .from('dispatch_items')
            .select('dispatch_id, asset:assets!inner(serial_number, internal_tag)')
            .or(`serial_number.ilike.%${query}%,internal_tag.ilike.%${query}%`, { foreignTable: 'assets' })

        if (serialMatches && serialMatches.length > 0) {
            const dispatchIds = Array.from(new Set(serialMatches.map(m => m.dispatch_id)))
            const { data: retryDispatches } = await supabase
                .from('dispatches')
                .select(`
                    *,
                    client:client_id (commercial_name),
                    items:dispatch_items (count)
                `)
                .in('id', dispatchIds)
                .order('dispatched_at', { ascending: false })

            filteredDispatches = retryDispatches || []
        }
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Truck className="w-8 h-8 text-indigo-500" />
                        Historial de Despachos
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Registro histórico de salidas y destrucciones
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full max-w-md">
                    <form className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            name="q"
                            defaultValue={searchParams.q || ''}
                            placeholder="Buscar por código, serie o chofer..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm shadow-sm text-gray-900 dark:text-white"
                        />
                    </form>
                </div>
            </div>

            <div className="bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800">
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Código</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Origen</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cliente / Destino</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Transporte</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Items</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Peso (lb)</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                            {filteredDispatches.length > 0 ? (
                                filteredDispatches.map((dispatch) => {
                                    const warehouseName = {
                                        'BOD-REC': 'Recepción',
                                        'BOD-REM': 'Remarketing',
                                        'BOD-VAL': 'Valorización',
                                        'BOD-HARV': 'Harvesting',
                                        'BOD-DES': 'Destrucción'
                                    }[dispatch.origin_warehouse as string] || dispatch.origin_warehouse

                                    return (
                                        <tr key={dispatch.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                                                        <FileText className="w-4 h-4 text-indigo-500" />
                                                    </div>
                                                    <div>
                                                        <span className="font-mono font-bold text-gray-900 dark:text-white block">
                                                            {dispatch.dispatch_code}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 uppercase tracking-widest leading-none">Despacho</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <div className="text-gray-900 dark:text-white font-medium">
                                                    {format(new Date(dispatch.dispatched_at), "d 'de' MMMM, yyyy", { locale: es })}
                                                </div>
                                                <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 font-mono">
                                                    <Calendar className="w-3 h-3" />
                                                    {format(new Date(dispatch.dispatched_at), "HH:mm 'hrs'")}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
                                                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                                    {warehouseName}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-gray-900 dark:text-white font-bold text-sm">
                                                    {(dispatch.client as any)?.commercial_name || 'N/A'}
                                                </div>
                                                <div className="text-[10px] text-indigo-500 uppercase font-extrabold tracking-tighter">
                                                    {dispatch.movement_type}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center border border-gray-200 dark:border-gray-700">
                                                        <User className="w-3.5 h-3.5 text-gray-400" />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold text-gray-900 dark:text-white">
                                                            {dispatch.driver_name || 'N/A'}
                                                        </div>
                                                        <div className="text-[10px] text-gray-500 font-mono tracking-tighter uppercase leading-none">
                                                            {dispatch.vehicle_plate || 'N/A'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
                                                    <span className="text-xs font-black">{(dispatch.items as any)?.[0]?.count || 0}</span>
                                                    <span className="text-[10px] font-bold uppercase">Und</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-sm font-black text-gray-900 dark:text-white font-mono">
                                                    {dispatch.total_weight_lb}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-bold ml-1">LB</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black tracking-widest border bg-green-500/10 text-green-500 border-green-500/20 uppercase">
                                                    {dispatch.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <a
                                                    href={`/api/inventario/bodega/dispatch-pdf?dispatchId=${dispatch.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-500 rounded-lg transition-all border border-indigo-500/20 shadow-sm"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                    Ver
                                                </a>
                                            </td>
                                        </tr>
                                    )
                                })
                            ) : (
                                <tr>
                                    <td colSpan={9} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800/50 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-800">
                                                <Search className="w-8 h-8 text-gray-300" />
                                            </div>
                                            <p className="text-gray-500 dark:text-gray-400 font-medium tracking-tight">
                                                {query
                                                    ? <>No se encontraron resultados para <span className="text-indigo-500 font-bold">&quot;{query}&quot;</span></>
                                                    : "No hay despachos registrados"
                                                }
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
