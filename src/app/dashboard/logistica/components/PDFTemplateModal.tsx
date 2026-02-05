'use client'

import React, { useState, useEffect } from 'react'
import { X, FileText } from 'lucide-react'

interface PDFTemplateModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (data: { manifestNumber: string; notes: string; templateContent?: string }) => void
    boxCount: number
    defaultManifestNumber?: string
    initialTemplateContent?: string
    logisticsData?: {
        ticketId: string
        clientName: string
        clientLocation?: string
        collectorName: string
        collectorPhone?: string
        vehicleModel?: string
        vehiclePlate?: string
        manifestNumber?: string
        boxCount?: number
        totalUnits?: number
        boxNumbers?: string[]
        boxSeals?: string[]
        equipmentDetails?: Array<{
            brand: string
            model: string
            serial: string
            tipo?: string
        }>
    }
}

// Variables disponibles para la plantilla
const TEMPLATE_VARIABLES = [
    {
        category: 'Empresa',
        variables: [
            { code: '{Company Name}', label: 'Nombre de la empresa' },
            { code: '{Company NIT}', label: 'NIT de la empresa' },
            { code: '{Company Address}', label: 'Dirección' },
            { code: '{Company Phone}', label: 'Teléfono' }
        ]
    },
    {
        category: 'Documento',
        variables: [
            { code: '{Manifest Number}', label: 'Número de Manifiesto' },
            { code: '{Date}', label: 'Fecha Actual' },
            { code: '{Box Count}', label: 'Cantidad de Cajas' }
        ]
    },
    {
        category: 'Cliente',
        variables: [
            { code: '{Client Name}', label: 'Nombre del Cliente' },
            { code: '{Client NIT}', label: 'NIT del Cliente' },
            { code: '{Client Address}', label: 'Dirección del Cliente' },
            { code: '{Client Phone}', label: 'Teléfono del Cliente' }
        ]
    },
    {
        category: 'Equipos',
        variables: [
            { code: '{Equipment Type}', label: 'Tipo de Equipo' },
            { code: '{Equipment Brand}', label: 'Marca del Equipo' },
            { code: '{Equipment Model}', label: 'Modelo del Equipo' },
            { code: '{Equipment Serial}', label: 'Serial del Equipo' },
            { code: '{Equipment Count}', label: 'Total de Equipos' }
        ]
    },
    {
        category: 'Logística / Manifiesto',
        variables: [
            { code: '{Ticket_ID}', label: 'ID del Ticket' },
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
            { code: '{Total_Boxes}', label: 'Total de Cajas' },
            { code: '{Equipment_Brand}', label: 'Marca de Equipo' },
            { code: '{Equipment_Model}', label: 'Modelo de Equipo' },
            { code: '{Equipment_Type}', label: 'Tipo de Producto' },
            { code: '{Asset_Series}', label: 'Series de Activos' },
            { code: '{Equipment_List}', label: 'Lista de Equipos' },
            { code: '{Total_Items}', label: 'Total de Unidades' },
            { code: '{Notes}', label: 'Notas/Observaciones' }
        ]
    },
    {
        category: 'Logística (Original)',
        variables: [
            { code: '{Ticket Number}', label: 'Número de Ticket' },
            { code: '{Collector Name}', label: 'Nombre del Recolector' },
            { code: '{Collection Date}', label: 'Fecha de Recolección' },
            { code: '{Notes}', label: 'Notas/Observaciones' }
        ]
    }
]

const DEFAULT_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Guía de Manifiesto</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
            background: white; 
            padding: 40px 30px;
            color: #333;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
        }
        .header {
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 1px solid #e0e0e0;
            padding-bottom: 20px;
        }
        .header-left h1 {
            font-size: 28px;
            font-weight: 700;
            letter-spacing: -0.5px;
            color: #111;
        }
        .header-left p {
            color: #666;
            font-size: 13px;
            margin-top: 5px;
        }
        .header-right {
            text-align: right;
            font-size: 12px;
            color: #999;
        }
        .section {
            margin-bottom: 25px;
        }
        .section-title {
            font-size: 11px;
            font-weight: 600;
            color: #999;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 10px;
        }
        .field-group {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 15px;
        }
        .field-group.full {
            grid-template-columns: 1fr;
        }
        .field {
            display: flex;
            flex-direction: column;
        }
        .field-label {
            font-size: 11px;
            color: #999;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
        }
        .field-value {
            font-size: 16px;
            font-weight: 500;
            color: #222;
        }
        .box-info {
            background: #f9f9f9;
            border: 1px solid #e5e5e5;
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 15px;
        }
        .box-label {
            font-size: 11px;
            color: #999;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }
        .box-value {
            font-size: 20px;
            font-weight: 600;
            color: #111;
        }
        .description-box {
            background: #fafafa;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 12px;
            min-height: 60px;
            font-size: 13px;
            color: #555;
        }
        .description-label {
            font-size: 11px;
            color: #999;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="header-left">
                <h1>MANIFIESTO</h1>
                <p>{Manifest_Number}</p>
            </div>
            <div class="header-right">
                {Order_Date}
            </div>
        </div>

        <!-- Client Section -->
        <div class="section">
            <div class="section-title">Cliente</div>
            <div class="field-group">
                <div class="field">
                    <div class="field-label">Nombre</div>
                    <div class="field-value">{Client_Name}</div>
                </div>
                <div class="field">
                    <div class="field-label">Recolector</div>
                    <div class="field-value">{Collector_User}</div>
                </div>
            </div>
        </div>

        <!-- Box Section -->
        <div class="section">
            <div class="box-info">
                <div class="box-label">Caja</div>
                <div class="box-value">#{Box_ID}</div>
            </div>
        </div>

        <!-- Description Section -->
        <div class="section">
            <div class="description-label">Descripción</div>
            <div class="description-box">{Notes}</div>
        </div>
    </div>
</body>
</html>
`

export const PDFTemplateModal: React.FC<PDFTemplateModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    boxCount,
    defaultManifestNumber = '',
    initialTemplateContent,
    logisticsData
}) => {
    const [manifestNumber, setManifestNumber] = useState(defaultManifestNumber)
    const [notes, setNotes] = useState('')
    const [templateContent, setTemplateContent] = useState(initialTemplateContent || DEFAULT_TEMPLATE)

    useEffect(() => {
        if (isOpen && defaultManifestNumber) {
            setManifestNumber(defaultManifestNumber)
        } else if (isOpen) {
            const date = new Date()
            const code = `MAN-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 1000)}`
            setManifestNumber(code)
        }

        // Cargar plantilla desde la BD (initialTemplateContent)
        if (isOpen) {
            if (initialTemplateContent) {
                setTemplateContent(initialTemplateContent)
            } else {
                setTemplateContent(DEFAULT_TEMPLATE)
            }
        }
    }, [isOpen, defaultManifestNumber, initialTemplateContent])

    const injectLogisticsVariables = (template: string, logisticsData?: PDFTemplateModalProps['logisticsData']): string => {
        if (!logisticsData) return template

        let result = template

        // Formato de fecha completo
        const currentDate = new Date()
        const formattedDate = currentDate.toLocaleDateString('es-GT', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        })

        // Construir lista de equipos
        const equipmentList = logisticsData.equipmentDetails
            ? logisticsData.equipmentDetails.map(e => `${e.brand} ${e.model} (Serie: ${e.serial})`).join('\n')
            : 'Sin equipos'
        
        const boxList = logisticsData.boxNumbers
            ? logisticsData.boxNumbers.map((num, idx) => `Caja #${num} - Precinto: ${logisticsData.boxSeals?.[idx] || 'Sin precinto'}`).join('\n')
            : 'Sin cajas'

        // Obtener primer equipo para variables individuales
        const firstEquipment = logisticsData.equipmentDetails?.[0]
        const firstBoxSeal = logisticsData.boxSeals?.[0] || 'N/A'
        const allBoxSeals = logisticsData.boxSeals?.join(', ') || 'N/A'

        // Reemplazar variables de logística con datos dinámicos
        const replacements: Record<string, string> = {
            // Variables principales de logística
            '{Ticket_ID}': logisticsData.ticketId || 'N/A',
            '{Manifest_Number}': logisticsData.manifestNumber || manifestNumber || 'N/A',
            '{Order_Date}': formattedDate,
            '{Client_Name}': logisticsData.clientName || 'N/A',
            '{Client_Location}': logisticsData.clientLocation || 'N/A',
            '{Collector_User}': logisticsData.collectorName || 'N/A',
            '{Collector_Phone}': logisticsData.collectorPhone || 'N/A',
            '{Vehicle_Model}': logisticsData.vehicleModel || 'N/A',
            '{Vehicle_Plate}': logisticsData.vehiclePlate || 'N/A',
            '{Box_ID}': logisticsData.boxNumbers?.[0] ? `#${logisticsData.boxNumbers[0]}` : 'N/A',
            '{Box_List}': boxList,
            '{Box_Seal}': firstBoxSeal,
            '{Box_Seals}': allBoxSeals,
            '{Marchamo}': firstBoxSeal,
            '{Precinto}': firstBoxSeal,
            '{Equipment_Brand}': firstEquipment?.brand || 'N/A',
            '{Equipment_Model}': firstEquipment?.model || 'N/A',
            '{Equipment_Type}': firstEquipment?.tipo || 'N/A',
            '{Asset_Series}': logisticsData.equipmentDetails
                ? logisticsData.equipmentDetails.map(e => e.serial).join(', ')
                : 'N/A',
            '{Equipment_List}': equipmentList,
            '{Total_Items}': (logisticsData.totalUnits || logisticsData.equipmentDetails?.length || 0).toString(),
            '{Total_Boxes}': (logisticsData.boxCount || 0).toString(),
            '{Notes}': notes || 'Sin observaciones',
            
            // Variables alternativas (compatibilidad)
            '{Manifest Number}': logisticsData.manifestNumber || manifestNumber || 'N/A',
            '{Date}': formattedDate,
            '{Box Count}': (logisticsData.boxCount || 0).toString(),
            '{Ticket Number}': logisticsData.ticketId || 'N/A',
            '{Client NIT}': 'N/A',
            '{Client Address}': logisticsData.clientLocation || 'N/A',
            '{Client Phone}': 'N/A',
            '{Equipment Count}': (logisticsData.totalUnits || logisticsData.equipmentDetails?.length || 0).toString(),
            
            // Variables de empresa (placeholders)
            '{Company Name}': 'ITAD Guatemala',
            '{Company NIT}': '12345678-9',
            '{Company Address}': 'Guatemala, Guatemala',
            '{Company Phone}': '+502 1234-5678'
        }

        Object.entries(replacements).forEach(([variable, value]) => {
            result = result.replaceAll(variable, value)
        })

        return result
    }


    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#14161b] border border-[#2a2d36] rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-[#2a2d36] shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white">Generar Guías y Manifiesto</h3>
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                                {boxCount} {boxCount === 1 ? 'caja' : 'cajas'} para procesar
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-400 hover:text-white"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>



                {/* Content */}
                <div className="flex-1 overflow-hidden flex">
                    <div className="flex-1 overflow-y-auto p-8 space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 block">
                                Número de Manifiesto
                            </label>
                            <input
                                type="text"
                                value={manifestNumber}
                                onChange={(e) => setManifestNumber(e.target.value)}
                                className="w-full bg-[#1b1e24] border border-[#2a2d36] rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all"
                                placeholder="MAN-2024..."
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 block">
                                Notas / Observaciones
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={6}
                                className="w-full bg-[#1b1e24] border border-[#2a2d36] rounded-xl px-4 py-3 text-white font-medium focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all resize-none"
                                placeholder="Comentarios adicionales para el manifiesto..."
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 block">
                                Vista previa (plantilla PDF)
                            </label>
                            <div className="border border-[#2a2d36] rounded-2xl overflow-hidden bg-white">
                                <iframe
                                    title="Vista previa de la plantilla"
                                    className="w-full h-[60vh] bg-white"
                                    srcDoc={injectLogisticsVariables(templateContent, logisticsData)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-8 py-4 border-t border-[#2a2d36] bg-[#0f1419] shrink-0">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold transition-all text-sm"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => {
                            const injectedTemplate = injectLogisticsVariables(templateContent, logisticsData)
                            onConfirm({ manifestNumber, notes, templateContent: injectedTemplate })
                        }}
                        disabled={!manifestNumber.trim()}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                    >
                        <FileText size={18} />
                        Generar PDF
                    </button>
                </div>
            </div>
        </div>
    )
}
