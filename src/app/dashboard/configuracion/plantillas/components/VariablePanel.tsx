'use client'

import { Text } from '@/components/ui/Text'
import { Plus } from 'lucide-react'

interface Variable {
    code: string
    label: string
}

interface VariableCategory {
    name: string
    variables: Variable[]
}

const VARIABLES: VariableCategory[] = [
    {
        name: 'Empresa',
        variables: [
            { code: '{Company Name}', label: 'Nombre de la empresa' },
            { code: '{Company NIT}', label: 'NIT de la empresa' },
            { code: '{Company Address}', label: 'Dirección' },
            { code: '{Company Phone}', label: 'Teléfono' },
            { code: '{Company Email}', label: 'Email' }
        ]
    },
    {
        name: 'Cliente',
        variables: [
            { code: '{Cliente Nombre}', label: 'Nombre del cliente' },
            { code: '{Cliente NIT}', label: 'NIT del cliente' },
            { code: '{Cliente Dirección}', label: 'Dirección' },
            { code: '{Cliente Teléfono}', label: 'Teléfono' },
            { code: '{Cliente Email}', label: 'Email' }
        ]
    },
    {
        name: 'Orden / Ticket',
        variables: [
            { code: '{Order Number}', label: 'ID del Ticket' },
            { code: '{Order Date}', label: 'Fecha de creación' },
            { code: '{Priority}', label: 'Prioridad' },
            { code: '{Status}', label: 'Estado' }
        ]
    },
    {
        name: 'Logística y Manifiestos',
        variables: [
            { code: '{Ticket_ID}', label: 'Número de Ticket' },
            { code: '{Manifest_Number}', label: 'Número de Manifiesto' },
            { code: '{Order_Date}', label: 'Fecha de la Orden' },
            { code: '{Client_Name}', label: 'Nombre del Cliente' },
            { code: '{Client_Location}', label: 'Ubicación del Cliente' },
            { code: '{Collector_User}', label: 'Usuario Recolector' },
            { code: '{Collector_Phone}', label: 'Teléfono Recolector' },
            { code: '{Vehicle_Model}', label: 'Modelo de Vehículo' },
            { code: '{Vehicle_Plate}', label: 'Placa del Vehículo' },
            { code: '{Box_ID}', label: 'ID de Caja Principal' },
            { code: '{Box_List}', label: 'Lista de Todas las Cajas' },
            { code: '{Box_Seal}', label: 'Precinto/Marchamo (Primera Caja)' },
            { code: '{Box_Seals}', label: 'Todos los Precintos/Marchaos' },
            { code: '{Marchamo}', label: 'Marchamo (Primera Caja)' },
            { code: '{Precinto}', label: 'Precinto (Primera Caja)' },
            { code: '{Total_Boxes}', label: 'Total de Cajas' },
            { code: '{Equipment_Brand}', label: 'Marca de Equipo' },
            { code: '{Equipment_Model}', label: 'Modelo de Equipo' },
            { code: '{Equipment_Type}', label: 'Tipo de Producto' },
            { code: '{Asset_Series}', label: 'Series de Activos' },
            { code: '{Equipment_List}', label: 'Lista Completa de Equipos' },
            { code: '{Total_Items}', label: 'Total de Unidades' },
            { code: '{Notes}', label: 'Notas/Observaciones' }
        ]
    },
    {
        name: 'Dispositivo',
        variables: [
            { code: '{Asset Type}', label: 'Tipo' },
            { code: '{Asset Brand}', label: 'Marca' },
            { code: '{Asset Model}', label: 'Modelo' },
            { code: '{Asset Color}', label: 'Color' },
            { code: '{Asset Serial Number}', label: 'S/N' },
            { code: '{Internal Tag}', label: 'Tag Interno' },
            { code: '{Classification REC}', label: 'Clasificación REC' },
            { code: '{Classification F}', label: 'Clasificación F' },
            { code: '{Classification C}', label: 'Clasificación C' }
        ]
    }
]

interface VariablePanelProps {
    onInsert: (code: string) => void
}

export function VariablePanel({ onInsert }: VariablePanelProps) {
    return (
        <div className="w-80 bg-white dark:bg-[#1a1f2e] border-l border-gray-200 dark:border-gray-800 flex flex-col h-full shadow-sm">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800/50">
                <Text variant="h3" className="text-sm font-black">Variables Disponibles</Text>
                <Text variant="muted" className="text-[10px] mt-1 block">Click para insertar en el editor</Text>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {VARIABLES.map((cat) => (
                    <div key={cat.name} className="space-y-2">
                        <Text variant="label" className="uppercase tracking-widest text-[10px] text-gray-400 block px-1">
                            {cat.name}
                        </Text>
                        <div className="grid gap-1.5">
                            {cat.variables.map((v) => (
                                <button
                                    key={v.code}
                                    onClick={() => onInsert(v.code)}
                                    className="w-full text-left px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 rounded-xl hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 transition-all group"
                                    title={v.label}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform truncate mr-2">
                                            {v.code}
                                        </span>
                                        <Plus className="w-3 h-3 text-gray-300 dark:text-gray-600 group-hover:text-emerald-500" />
                                    </div>
                                    <Text variant="muted" className="text-[9px] truncate block mt-0.5">{v.label}</Text>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
