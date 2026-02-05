import React, { useState, useEffect } from 'react'
import { 
  Package, 
  ArrowLeft, 
  User, 
  Trash2, 
  Plus,
  AlertCircle,
  X,
  Users,
  AlertTriangle,
  ChevronDown,
  Users2
} from 'lucide-react'
import { TicketData, TicketItem } from '../types/modal'

interface TicketManagementModalProps {
  isOpen: boolean
  onClose: () => void
  ticket: TicketData
  onStartLoading: (data: {
    equipmentItems: TicketItem[]
    collectorData: {
      name: string
      phone: string
      vehicleModel: string
      vehiclePlate: string
    }
    collectWithoutName: boolean
    notes: string
  }) => void
}

export const TicketManagementModal: React.FC<TicketManagementModalProps> = ({
  isOpen,
  onClose,
  ticket,
  onStartLoading
}) => {
  // --- ESTADOS ---
  const [collectWithoutName, setCollectWithoutName] = useState(false)
  const [showCollectorForm, setShowCollectorForm] = useState(false)
  const [equipmentItems, setEquipmentItems] = useState<TicketItem[]>([])
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [collectorData, setCollectorData] = useState({
    name: '',
    phone: '',
    vehicleModel: '',
    vehiclePlate: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // --- EFECTOS ---
  useEffect(() => {
    if (isOpen) {
      setEquipmentItems(ticket.items || [])
      setAdditionalNotes('')
      setCollectorData({ name: '', phone: '', vehicleModel: '', vehiclePlate: '' })
      setCollectWithoutName(false)
      setShowCollectorForm(false)
      setErrors({})
    }
  }, [isOpen, ticket])

  // --- LÓGICA ---
  const validateBeforeStart = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!collectWithoutName && !collectorData.name.trim()) {
      newErrors.collector = 'Debe asignar un recolector o marcar "Recolectar sin nombre"'
    }
    
    // Ya no validamos equipmentItems aquí porque se agregarán en el modal siguiente
    // if (equipmentItems.length === 0) {
    //   newErrors.equipment = 'No hay equipos en la lista para cargar.'
    // }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleStartLoading = () => {
    console.log('=== BOTÓN CLICKEADO ===')
    console.log('Validando...')
    const isValid = validateBeforeStart()
    console.log('Validación resultado:', isValid)
    
    if (isValid) {
      console.log('Llamando a onStartLoading...')
      onStartLoading({
        equipmentItems,
        collectorData,
        collectWithoutName,
        notes: additionalNotes
      })
      onClose()
    } else {
      console.log('Validación falló, errores:', errors)
    }
  }

  const handleDeleteEquipment = (id: string) => {
    setEquipmentItems(prev => prev.filter((item) => item.id !== id))
  }

  const canStartLoading = collectWithoutName || Boolean(collectorData.name.trim())

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-[2.25rem] border border-[#2a2d36] bg-[#0f1117] shadow-2xl">
        
        {/* HEADER COMPACTO */}
        <div className="sticky top-0 z-10 bg-[#14161b] border-b border-[#2a2d36] px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg shadow-purple-600/30">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-500">Módulo de Logística - Detalle del Ticket</p>
              <h2 className="text-lg font-black text-white">{ticket.id}</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-8 py-6 space-y-6">
          {/* FILA DE INFO - CLIENTE, UNIDADES, CIERRE, ESTADO */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-[9px] font-bold uppercase text-gray-500 mb-2">Cliente</p>
              <p className="text-sm font-black text-white">{ticket.client}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase text-gray-500 mb-2">Unidades</p>
              <p className="text-2xl font-black text-emerald-400">{ticket.totalUnits || 0}</p>
            </div>
            <div>
              <p className="text-[9xs] font-bold uppercase text-gray-500 mb-2">Cierre</p>
              <p className="text-sm font-black text-white">{new Date().toLocaleDateString('es-ES')}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase text-gray-500 mb-2">Estado</p>
              <span className="inline-block px-3 py-1 rounded-full border border-orange-500/50 bg-orange-500/10 text-[10px] font-bold text-orange-400">
                Pendiente
              </span>
            </div>
          </div>

          {/* DESCRIPCIÓN */}
          {ticket.description && (
            <div>
              <p className="text-[9px] font-bold uppercase text-gray-500 mb-2">Descripción</p>
              <p className="text-sm text-gray-300">{ticket.description}</p>
            </div>
          )}

          {/* SECCIÓN EQUIPOS A RECOLECTAR */}
          <div className="bg-[#1b1e24]/30 border border-[#2a2d36] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#2a2d36] bg-[#14161b]/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20">
                  <Package className="h-4 w-4 text-purple-400" />
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Equipos a Recolectar</h3>
              </div>
              <button className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition">
                <Plus size={14} /> Exceder Lista
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#0f1117]/50 border-b border-[#2a2d36]">
                  <tr className="text-[9px] font-bold uppercase text-gray-500">
                    <th className="px-6 py-3 text-left">Marca/Modelo</th>
                    <th className="px-6 py-3 text-left">Tipo de Producto</th>
                    <th className="px-6 py-3 text-center">Cantidad</th>
                    <th className="px-6 py-3 text-center">Recibida</th>
                    <th className="px-6 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2d36]">
                  {equipmentItems.length > 0 ? (
                    equipmentItems.map((item) => (
                      <tr key={item.id} className="hover:bg-[#1b1e24]/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-white">
                          {item.brandName} <span className="text-gray-500 font-normal">| {item.modelName}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300">{item.productTypeName || 'N/A'}</td>
                        <td className="px-6 py-4 text-center text-emerald-400 font-bold">{item.expectedQuantity}</td>
                        <td className="px-6 py-4 text-center">
                          <input 
                            type="number" 
                            min="0"
                            max={item.expectedQuantity}
                            defaultValue="0"
                            className="w-12 bg-[#0f1117] border border-[#2a2d36] rounded px-2 py-1 text-center text-white text-sm focus:border-emerald-500 outline-none"
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => handleDeleteEquipment(item.id)} 
                            className="text-rose-400 hover:text-rose-300 transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">
                        No hay equipos en la lista
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* OTROS DETALLES O NOTAS */}
          <div className="bg-[#1b1e24]/30 border border-[#2a2d36] rounded-2xl p-6">
            <p className="text-[9px] font-bold uppercase text-gray-500 mb-3">Otros detalles o notas</p>
            <textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Ej: Requiere empaques especial, entrega sin horario específico, etc."
              className="w-full bg-[#0f1117] border border-[#2a2d36] rounded-xl p-4 text-white text-sm outline-none focus:border-emerald-500/50 resize-none"
              rows={3}
            />
          </div>

          {/* ASIGNACIÓN DE RECOLECTOR */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border border-[#2a2d36] bg-[#1b1e24]/30 hover:bg-[#1b1e24]/50 transition">
              <input
                type="checkbox"
                checked={collectWithoutName}
                onChange={(e) => {
                  setCollectWithoutName(e.target.checked)
                  if (e.target.checked) setShowCollectorForm(false)
                }}
                className="w-4 h-4 accent-emerald-500"
              />
              <span className="text-sm font-bold text-gray-300">Recolectar sin nombre asignado</span>
            </label>

            {!collectWithoutName && (
              <div className="bg-[#1b1e24]/30 border border-[#2a2d36] rounded-xl p-6">
                {!showCollectorForm ? (
                  <button
                    onClick={() => setShowCollectorForm(true)}
                    className="w-full py-3 bg-blue-600/10 border border-blue-500/30 text-blue-400 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-600/20 transition"
                  >
                    <Users2 size={16} /> Agregar datos del recolector
                  </button>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CollectorInput 
                      label="Nombre" 
                      value={collectorData.name} 
                      onChange={(val) => setCollectorData({...collectorData, name: val})} 
                      placeholder="Nombre completo"
                    />
                    <CollectorInput 
                      label="Teléfono" 
                      value={collectorData.phone} 
                      onChange={(val) => setCollectorData({...collectorData, phone: val})} 
                      placeholder="+502 1234 5678"
                    />
                    <CollectorInput 
                      label="Modelo Vehículo" 
                      value={collectorData.vehicleModel} 
                      onChange={(val) => setCollectorData({...collectorData, vehicleModel: val})} 
                      placeholder="Ej: Toyota Hilux"
                    />
                    <CollectorInput 
                      label="Placa" 
                      value={collectorData.vehiclePlate} 
                      onChange={(val) => setCollectorData({...collectorData, vehiclePlate: val})} 
                      placeholder="Ej: P-123ABC"
                    />
                    <button 
                      onClick={() => setShowCollectorForm(false)}
                      className="md:col-span-2 text-xs text-gray-500 hover:text-gray-400 transition font-bold"
                    >
                      ✕ Cancelar registro de recolector
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {/* ERRORES */}
            {errors.collector && (
              <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs">
                <AlertTriangle size={14} /> {errors.collector}
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="sticky bottom-0 bg-[#14161b] border-t border-[#2a2d36] px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <button 
            onClick={onClose} 
            className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase hover:text-white transition"
          >
            <ArrowLeft size={14} /> Vuelve a Logística
          </button>
          
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setCollectWithoutName(!collectWithoutName)}
              className={`px-4 py-2 rounded-lg font-bold text-xs uppercase flex items-center gap-1 transition ${
                collectWithoutName
                  ? 'bg-emerald-600/20 border border-emerald-500/50 text-emerald-400'
                  : 'bg-gray-500/10 border border-gray-500/30 text-gray-400 hover:text-gray-300'
              }`}
            >
              ☑ Recolectar sin nombre
            </button>

            <button
              onClick={() => setShowCollectorForm(!showCollectorForm)}
              disabled={collectWithoutName}
              className="px-4 py-2 rounded-lg font-bold text-xs uppercase flex items-center gap-1 transition bg-gray-500/10 border border-gray-500/30 text-gray-400 hover:text-gray-300 disabled:opacity-50"
            >
              👤 Agregar datos del recolector
            </button>

            <button className="px-4 py-2 rounded-lg font-bold text-xs uppercase flex items-center gap-1 transition bg-gray-500/10 border border-gray-500/30 text-gray-400 hover:text-gray-300">
              + Exceder lista
            </button>

            <button
              onClick={handleStartLoading}
              disabled={!canStartLoading}
              className={`px-6 py-2 rounded-full font-bold text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center gap-1 ${
                canStartLoading
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-emerald-500/20'
                  : 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
              }`}
            >
              ✓ Iniciar carga de equipos
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- SUBCOMPONENTES AUXILIARES ---
const CollectorInput = ({ 
  label, 
  value, 
  onChange,
  placeholder
}: { 
  label: string
  value: string
  onChange: (val: string) => void
  placeholder?: string
}) => (
  <div className="space-y-2">
    <label className="text-[10px] font-bold text-gray-500 uppercase">{label}</label>
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#0f1117] border border-[#2a2d36] rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none transition"
    />
  </div>
)