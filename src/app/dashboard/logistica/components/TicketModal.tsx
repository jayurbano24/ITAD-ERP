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
  AlertTriangle
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
    
    if (equipmentItems.length === 0) {
      newErrors.equipment = 'No hay equipos en la lista para cargar.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleStartLoading = () => {
    if (validateBeforeStart()) {
      onStartLoading({
        equipmentItems,
        collectorData,
        collectWithoutName,
        notes: additionalNotes
      })
      onClose()
    }
  }

  const handleDeleteEquipment = (id: string) => {
    setEquipmentItems(prev => prev.filter((item) => item.id !== id))
  }

  const canStartLoading = collectWithoutName || Boolean(collectorData.name.trim())

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2.25rem] border border-[#2a2d36] bg-[#0f1117] shadow-2xl">
        
        {/* HEADER */}
        <div className="sticky top-0 z-10 bg-[#14161b] border-b border-[#2a2d36] px-8 py-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-gray-500 mb-2">MÓDULO DE LOGÍSTICA</p>
              <h2 className="text-2xl font-black text-white">{ticket.id}</h2>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="px-8 py-6 space-y-6">
          {/* CARDS DE INFORMACIÓN */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoCard label="Cliente" value={ticket.client} />
            <InfoCard label="Unidades" value={`${ticket.totalUnits || 0}`} color="text-emerald-400" />
            <InfoCard label="Cierre" value={new Date().toLocaleDateString()} />
            <div className="bg-[#1b1e24]/50 border border-[#2a2d36] rounded-xl p-4">
              <p className="text-[9px] font-bold uppercase text-gray-500 mb-2">Estado</p>
              <span className="px-2.5 py-1 rounded-full border border-orange-500/50 bg-orange-500/10 text-[11px] font-bold text-orange-400">
                Pendiente
              </span>
            </div>
          </div>

          {/* TABLA DE EQUIPOS */}
          <div className="bg-[#1b1e24]/50 border border-[#2a2d36] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#2a2d36] bg-[#14161b]/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Equipos</h3>
              </div>
              <button className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                <Plus size={12} /> EXCEDER LISTA
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#0f1117]/50 text-[9px] font-bold text-gray-500 uppercase">
                  <tr>
                    <th className="px-6 py-3">Tipo de producto</th>
                    <th className="px-6 py-3">Marca</th>
                    <th className="px-6 py-3">Modelo</th>
                    <th className="px-6 py-3 text-center">Cant.</th>
                    <th className="px-6 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2d36]">
                  {equipmentItems.map((item) => (
                    <tr key={item.id} className="hover:bg-[#1b1e24]/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-300">{item.productTypeName || '—'}</td>
                      <td className="px-6 py-4 text-sm font-bold text-white">{item.brandName || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">{item.modelName || '—'}</td>
                      <td className="px-6 py-4 text-center text-emerald-400 font-bold">{item.expectedQuantity}</td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => handleDeleteEquipment(item.id)} className="text-rose-400 hover:text-rose-300">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* NOTAS */}
          <div className="bg-[#1b1e24]/50 border border-[#2a2d36] rounded-xl p-4">
            <p className="text-[9px] font-bold uppercase text-gray-500 mb-2">Notas Adicionales</p>
            <textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              className="w-full bg-[#0f1117] border border-[#2a2d36] rounded-xl p-3 text-white text-sm outline-none focus:border-emerald-500/50"
              rows={2}
            />
          </div>

          {/* ASIGNACIÓN DE RECOLECTOR */}
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border border-[#2a2d36] bg-[#1b1e24]/50">
              <input
                type="checkbox"
                checked={collectWithoutName}
                onChange={(e) => {
                  setCollectWithoutName(e.target.checked)
                  if (e.target.checked) setShowCollectorForm(false)
                }}
                className="w-4 h-4 accent-emerald-500"
              />
              <span className="text-sm text-gray-300">Recolectar sin nombre asignado</span>
            </label>

            {!collectWithoutName && (
              <div className="bg-[#1b1e24]/50 border border-[#2a2d36] rounded-xl p-6">
                {!showCollectorForm ? (
                  <button
                    onClick={() => setShowCollectorForm(true)}
                    className="w-full py-3 bg-blue-600/10 border border-blue-500/30 text-blue-400 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <Users size={16} /> Agregar datos del recolector
                  </button>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CollectorInput 
                      label="Nombre" 
                      value={collectorData.name} 
                      onChange={(val) => setCollectorData({...collectorData, name: val})} 
                    />
                    <CollectorInput 
                      label="Teléfono" 
                      value={collectorData.phone} 
                      onChange={(val) => setCollectorData({...collectorData, phone: val})} 
                    />
                    <CollectorInput 
                      label="Modelo Vehículo" 
                      value={collectorData.vehicleModel} 
                      onChange={(val) => setCollectorData({...collectorData, vehicleModel: val})} 
                    />
                    <CollectorInput 
                      label="Placa" 
                      value={collectorData.vehiclePlate} 
                      onChange={(val) => setCollectorData({...collectorData, vehiclePlate: val})} 
                    />
                    <button 
                      onClick={() => setShowCollectorForm(false)}
                      className="md:col-span-2 text-xs text-gray-500 hover:text-white"
                    >
                      Cancelar registro de recolector
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
        <div className="sticky bottom-0 bg-[#14161b] border-t border-[#2a2d36] px-8 py-4 flex flex-col md:flex-row justify-between gap-4">
          <button onClick={onClose} className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase hover:text-white">
            <ArrowLeft size={14} /> Volver
          </button>
          <button
            onClick={handleStartLoading}
            disabled={!canStartLoading}
            className={`px-8 py-3 rounded-xl font-bold text-sm uppercase tracking-wider shadow-lg active:scale-95 transition-all ${
              canStartLoading
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-emerald-500/20'
                : 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
            }`}
          >
            Iniciar carga de equipos
          </button>
        </div>
      </div>
    </div>
  )
}

// --- SUBCOMPONENTES AUXILIARES ---
const InfoCard = ({ label, value, color = "text-white" }: { label: string, value: string, color?: string }) => (
  <div className="bg-[#1b1e24]/50 border border-[#2a2d36] rounded-xl p-4">
    <p className="text-[9px] font-bold uppercase text-gray-500 mb-2">{label}</p>
    <p className={`text-sm font-black truncate ${color}`}>{value}</p>
  </div>
)

const CollectorInput = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-bold text-gray-500 uppercase">{label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#0f1117] border border-[#2a2d36] rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none"
    />
  </div>
)