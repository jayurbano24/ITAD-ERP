'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Trash2,
  Tag,
  AlertTriangle,
  Loader2,
  Palette,
  Cpu,
  Wrench,
  Stethoscope,
  Truck,
  Eye,
  X,
  Package,
  Edit2,
  PlugZap,
  Keyboard,
  HardDrive,
  BrainCircuit
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Text } from '@/components/ui/Text'
import { FormLabel } from '@/components/ui/FormLabel'
import * as XLSX from 'xlsx';
import {
  type CatalogItem,
  createCatalogItem,
  deleteCatalogItem,
  createModel,
  updateModel,
  deleteModel,
  createAccessory,
  updateAccessory,
  deleteAccessory,
  type AllCatalogs,
  type ModelItem,
  type AccessoryItem
} from '../actions'

interface CatalogsTabProps {
  catalogs: AllCatalogs
}

type CatalogType =
  | 'catalog_brands'
  | 'catalog_models'
  | 'catalog_product_types'
  | 'catalog_colors'
  | 'catalog_diagnostics'
  | 'catalog_repairs'
  | 'catalog_service_types'
  | 'catalog_failure_codes'
  | 'catalog_accessories'
  | 'catalog_processors'
  | 'catalog_memory'
  | 'catalog_keyboards'
  | 'catalog_storage'

interface CatalogConfig {
  key: CatalogType
  title: string
  description: string
  icon: typeof Tag
  color: string
  bgColor: string
  items: CatalogItem[]
  isSpecial?: boolean
}

export function CatalogsTab({ catalogs }: CatalogsTabProps) {
  // Funciones de importación/exportación para catálogos
  const handleExportCatalog = (key: CatalogType, items: CatalogItem[]) => {
    if (items.length === 0) return;
    const ws = XLSX.utils.aoa_to_sheet([
      ['nombre'],
      ...items.map((item) => [item.name])
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Catalogo');
    XLSX.writeFile(wb, `${key}.xlsx`);
  };

  const handleImportCatalog = async (key: CatalogType, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    // endpoint por tipo, ejemplo: /api/maestros/import-procesadores
    let endpoint = '';
    if (key === 'catalog_processors') endpoint = '/api/maestros/import-procesadores';
    // Puedes agregar endpoints para otros catálogos aquí
    if (!endpoint) return alert('Importación no soportada para este catálogo');
    const res = await fetch(endpoint, {
      method: 'POST',
      body: formData
    });
    if (res.ok) {
      window.location.reload();
    } else {
      alert('Error al importar catálogo');
    }
  };
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [viewModal, setViewModal] = useState<CatalogConfig | null>(null)
  const [addModal, setAddModal] = useState<CatalogConfig | null>(null)
  const [newItemName, setNewItemName] = useState('')
  // Estado para campos de RAM
  const [newRamCapacity, setNewRamCapacity] = useState('')
  const [newRamType, setNewRamType] = useState('')
  // Estado para campos de Storage (Disco Duro)
  const [newStorageCapacity, setNewStorageCapacity] = useState('')
  const [newStorageType, setNewStorageType] = useState('')

  // Estado para modal de modelos
  const [modelModal, setModelModal] = useState<{ mode: 'add' | 'edit', model?: ModelItem } | null>(null)
  const [modelForm, setModelForm] = useState({
    name: '',
    brand_id: '',
    product_type_id: '',
    description: ''
  })
  const [accessoryModal, setAccessoryModal] = useState<{ mode: 'add' | 'edit', accessory?: AccessoryItem } | null>(null)
  const [accessoryForm, setAccessoryForm] = useState({
    name: '',
    product_type_id: '',
    is_required: false
  })
  const [accessoryError, setAccessoryError] = useState<string | null>(null)

  const accessoryFilterType = catalogs.productTypes.find(
    (type) => type.id === accessoryForm.product_type_id
  )
  const filteredAccessories = useMemo(() => {
    if (!accessoryForm.product_type_id) {
      return catalogs.accessories
    }

    return catalogs.accessories.filter(
      (accessory) => accessory.product_type_id === accessoryForm.product_type_id
    )
  }, [accessoryForm.product_type_id, catalogs.accessories])
  const accessoryListTitle = accessoryFilterType
    ? `Accesorios de ${accessoryFilterType.name}`
    : 'Accesorios por tipo'

  const catalogConfigs: CatalogConfig[] = [
    {
      key: 'catalog_brands',
      title: 'Marcas',
      description: 'Catálogo de marcas de equipos.',
      icon: Tag,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      items: catalogs.brands
    },
    {
      key: 'catalog_models',
      title: 'Modelos',
      description: 'Catálogo de modelos con marca y tipo.',
      icon: Cpu,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      items: catalogs.models,
      isSpecial: true
    },
    {
      key: 'catalog_product_types',
      title: 'Tipos de Producto',
      description: 'Categorías de productos (Laptop, Desktop, etc.).',
      icon: Package,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      items: catalogs.productTypes
    },
    {
      key: 'catalog_accessories',
      title: 'Accesorios',
      description: 'Accesorios dependientes del tipo de producto.',
      icon: PlugZap,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20',
      items: catalogs.accessories,
      isSpecial: true
    },
    {
      key: 'catalog_colors',
      title: 'Colores',
      description: 'Catálogo de colores de productos.',
      icon: Palette,
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/20',
      items: catalogs.colors
    },
    {
      key: 'catalog_diagnostics',
      title: 'Diagnósticos',
      description: 'Catálogo de diagnósticos técnicos.',
      icon: Stethoscope,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/20',
      items: catalogs.diagnostics
    },
    {
      key: 'catalog_repairs',
      title: 'Reparaciones',
      description: 'Tipos de reparaciones disponibles.',
      icon: Wrench,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
      items: catalogs.repairs
    },
    {
      key: 'catalog_service_types',
      title: 'Tipos de Servicio',
      description: 'Tipos de servicios ofrecidos.',
      icon: Truck,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/20',
      items: catalogs.serviceTypes
    },
    {
      key: 'catalog_failure_codes',
      title: 'Códigos de Falla',
      description: 'Códigos para identificar fallas comunes.',
      icon: AlertTriangle,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/20',
      items: catalogs.failureCodes
    },
    {
      key: 'catalog_processors',
      title: 'Procesadores',
      description: 'Catálogo de procesadores (CPU).',
      icon: BrainCircuit,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/20',
      items: catalogs.processors
    },
    {
      key: 'catalog_memory',
      title: 'Memoria RAM',
      description: 'Catálogo de tipos/capacidades de memoria.',
      icon: HardDrive,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      items: catalogs.memory
    },
    {
      key: 'catalog_keyboards',
      title: 'Teclados',
      description: 'Catálogo de tipos/idiomas de teclados.',
      icon: Keyboard,
      color: 'text-slate-400',
      bgColor: 'bg-slate-500/20',
      items: catalogs.keyboards
    },
    {
      key: 'catalog_storage',
      title: 'Disco Duro',
      description: 'Catálogo de discos con capacidad y tecnología.',
      icon: HardDrive,
      color: 'text-teal-400',
      bgColor: 'bg-teal-500/20',
      items: catalogs.storage
    }
  ]

  const handleAdd = async () => {
    if (!addModal) return
    if (addModal.key === 'catalog_memory') {
      if (!newItemName.trim() && !newRamCapacity.trim() && !newRamType.trim()) return
      setLoading('add')
      await createCatalogItem(addModal.key, {
        name: newItemName.trim(),
        ram_capacity: newRamCapacity.trim(),
        ram_type: newRamType.trim()
      })
      setNewItemName('')
      setNewRamCapacity('')
      setNewRamType('')
      setLoading(null)
      setAddModal(null)
      router.refresh()
      return
    }
    if (addModal.key === 'catalog_storage') {
      if (!newItemName.trim() && !newStorageCapacity.trim() && !newStorageType.trim()) return
      setLoading('add')
      await createCatalogItem(addModal.key, {
        name: newItemName.trim(),
        storage_capacity: newStorageCapacity.trim(),
        storage_type: newStorageType.trim()
      })
      setNewItemName('')
      setNewStorageCapacity('')
      setNewStorageType('')
      setLoading(null)
      setAddModal(null)
      router.refresh()
      return
    }
    if (!newItemName.trim()) return
    setLoading('add')
    await createCatalogItem(addModal.key, newItemName.trim())
    setNewItemName('')
    setLoading(null)
    setAddModal(null)
    router.refresh()
  }

  const handleDelete = async (table: CatalogType, id: string) => {
    if (!confirm('¿Eliminar este elemento?')) return
    setLoading(id)

    if (table === 'catalog_models') {
      await deleteModel(id)
    } else if (table === 'catalog_accessories') {
      await deleteAccessory(id)
    } else {
      await deleteCatalogItem(table, id)
    }

    setLoading(null)

    // Actualizar el modal con los items filtrados
    if (viewModal) {
      const updatedItems = viewModal.items.filter(item => item.id !== id)
      setViewModal({ ...viewModal, items: updatedItems })
    }
    router.refresh()
  }

  // Funciones para modelos
  const openModelModal = (mode: 'add' | 'edit', model?: ModelItem) => {
    setModelModal({ mode, model })
    if (model) {
      setModelForm({
        name: model.name,
        brand_id: model.brand_id || '',
        product_type_id: model.product_type_id || '',
        description: model.description || ''
      })
    } else {
      setModelForm({ name: '', brand_id: '', product_type_id: '', description: '' })
    }
  }

  const handleModelSubmit = async () => {
    if (!modelForm.name.trim()) return
    setLoading('model')

    if (modelModal?.mode === 'edit' && modelModal.model) {
      await updateModel(modelModal.model.id, modelForm)
    } else {
      await createModel(modelForm)
    }

    setLoading(null)
    setModelModal(null)
    router.refresh()
  }

  const openAccessoryModal = (mode: 'add' | 'edit', accessory?: AccessoryItem) => {
    setAccessoryModal({ mode, accessory })
    if (accessory) {
      setAccessoryForm({
        name: accessory.name,
        product_type_id: accessory.product_type_id || '',
        is_required: accessory.is_required
      })
    } else {
      setAccessoryForm({ name: '', product_type_id: '', is_required: false })
    }
    setAccessoryError(null)
  }

  const handleAccessorySubmit = async () => {
    if (!accessoryForm.name.trim()) return
    setLoading('accessory')

    if (accessoryModal?.mode === 'edit' && accessoryModal.accessory) {
      const result = await updateAccessory(accessoryModal.accessory.id, {
        name: accessoryForm.name.trim(),
        product_type_id: accessoryForm.product_type_id || undefined,
        is_required: accessoryForm.is_required
      })
      if (!result.success) {
        setAccessoryError(result.error || 'No se pudo actualizar el accesorio')
        setLoading(null)
        return
      }
    } else {
      const result = await createAccessory({
        name: accessoryForm.name.trim(),
        product_type_id: accessoryForm.product_type_id || undefined,
        is_required: accessoryForm.is_required
      })
      if (!result.success) {
        setAccessoryError(result.error || 'No se pudo guardar el accesorio')
        setLoading(null)
        return
      }
    }

    setAccessoryError(null)
    setLoading(null)
    setAccessoryModal(null)
    router.refresh()
  }

  return (
    <>
      {/* Grid de Catálogos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {catalogConfigs.map((config) => (
          <div
            key={config.key}
            className="bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:border-gray-300 dark:hover:border-gray-700 transition-all shadow-sm"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className={cn("p-2.5 rounded-xl", config.bgColor)}>
                <config.icon className={cn("w-5 h-5", config.color)} />
              </div>
              <Text variant="h2" className="text-2xl font-black">{config.items.length}</Text>
            </div>

            {/* Título y Descripción */}
            <Text variant="body" className="font-black uppercase tracking-tight mb-1 block">{config.title}</Text>
            <Text variant="muted" className="text-xs mb-4 line-clamp-2 block">{config.description}</Text>

            {/* Vista Previa */}
            {config.items.length > 0 && (
              <div className="mb-4">
                <Text variant="label" className="mb-2 block">Vista Previa:</Text>
                <div className="flex flex-wrap gap-1.5">
                  {config.items.slice(0, 4).map((item) => (
                    <span
                      key={item.id}
                      className="px-2 py-0.5 bg-gray-100 dark:bg-[#0f1419] text-gray-600 dark:text-gray-400 text-[10px] font-bold rounded-md border border-gray-200 dark:border-gray-800"
                    >
                      {item.name}
                    </span>
                  ))}
                  {config.items.length > 4 && (
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-[#0f1419] text-gray-400 text-[10px] font-bold rounded-md border border-gray-200 dark:border-gray-800">
                      +{config.items.length - 4}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setViewModal(config)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 
                         bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 
                         text-gray-700 dark:text-gray-300 
                         rounded-xl transition-colors text-xs font-bold uppercase tracking-widest"
              >
                <Eye className="w-4 h-4" />
                <span>Ver ({config.items.length})</span>
              </button>
              <button
                onClick={() => {
                  if (config.key === 'catalog_models') {
                    openModelModal('add')
                  } else if (config.key === 'catalog_accessories') {
                    openAccessoryModal('add')
                  } else {
                    setAddModal(config)
                    setNewItemName('')
                  }
                }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2",
                  "text-white rounded-xl transition-all text-xs font-bold uppercase tracking-widest",
                  config.bgColor.replace('/20', '/80'),
                  "hover:opacity-90 active:scale-95 shadow-lg shadow-emerald-500/10"
                )}
              >
                <Plus className="w-4 h-4" />
                <span>Agregar</span>
              </button>
            </div>

            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleExportCatalog(config.key, config.items)}
                className="flex-1 px-2 py-2 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-600/20 transition-all"
              >Exportar</button>
              <label className="flex-1 px-2 py-2 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest border border-blue-600/20 transition-all cursor-pointer text-center">
                Importar
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  style={{ display: 'none' }}
                  onChange={(e) => handleImportCatalog(config.key, e)}
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Ver Lista */}
      {viewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setViewModal(null)}
          />
          <div className="relative bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-2xl 
                        shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-xl", viewModal.bgColor)}>
                  <viewModal.icon className={cn("w-5 h-5", viewModal.color)} />
                </div>
                <div>
                  <Text variant="h3" as="h2">{viewModal.title}</Text>
                  <Text variant="muted" className="text-sm">{viewModal.items.length} elementos</Text>
                </div>
              </div>
              <button
                onClick={() => setViewModal(null)}
                className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto">
              {viewModal.items.length > 0 ? (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {viewModal.items.map((item: any) => {
                    // RAM: mostrar campos extra
                    if (viewModal.key === 'catalog_memory') {
                      return (
                        <div key={item.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <div className="flex-1">
                            <Text variant="body" className="font-bold">{item.name}</Text>
                            <div className="flex gap-2 mt-1">
                              {item.ram_capacity && (
                                <span className="text-[10px] px-2 py-0.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded font-black uppercase tracking-widest border border-yellow-500/20">
                                  Capacidad: {item.ram_capacity}
                                </span>
                              )}
                              {item.ram_type && (
                                <span className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded font-black uppercase tracking-widest border border-blue-500/20">
                                  Tipo: {item.ram_type}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setAddModal(viewModal)
                                setNewItemName(item.name)
                                setNewRamCapacity(item.ram_capacity || '')
                                setNewRamType(item.ram_type || '')
                                setViewModal(null)
                              }}
                              className="p-1.5 text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(viewModal.key, item.id)}
                              disabled={loading === item.id}
                              className="p-1.5 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            >
                              {loading === item.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      )
                    }
                    // Storage: mostrar campos extra
                    if (viewModal.key === 'catalog_storage') {
                      return (
                        <div key={item.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <div className="flex-1">
                            <Text variant="body" className="font-bold">{item.name}</Text>
                            <div className="flex gap-2 mt-1">
                              {item.storage_capacity && (
                                <span className="text-[10px] px-2 py-0.5 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded font-black uppercase tracking-widest border border-teal-500/20">
                                  Capacidad: {item.storage_capacity}
                                </span>
                              )}
                              {item.storage_type && (
                                <span className="text-[10px] px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded font-black uppercase tracking-widest border border-purple-500/20">
                                  Tecnología: {item.storage_type}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setAddModal(viewModal)
                                setNewItemName(item.name)
                                setNewStorageCapacity(item.storage_capacity || '')
                                setNewStorageType(item.storage_type || '')
                                setViewModal(null)
                              }}
                              className="p-1.5 text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(viewModal.key, item.id)}
                              disabled={loading === item.id}
                              className="p-1.5 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            >
                              {loading === item.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      )
                    }
                    // Modelos: mostrar marca y tipo de producto
                    if (viewModal.key === 'catalog_models') {
                      return (
                        <div key={item.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <div className="flex-1">
                            <Text variant="body" className="font-bold">{item.name}</Text>
                            <div className="flex gap-2 mt-1">
                              {item.brand?.name && (
                                <span className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded font-black uppercase tracking-widest border border-blue-500/20">
                                  Marca: {item.brand.name}
                                </span>
                              )}
                              {item.product_type?.name && (
                                <span className="text-[10px] px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded font-black uppercase tracking-widest border border-green-500/20">
                                  Tipo: {item.product_type.name}
                                </span>
                              )}
                              {!item.brand?.name && (
                                <span className="text-[10px] px-2 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded font-black uppercase tracking-widest border border-rose-500/20">
                                  Sin Marca
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openModelModal('edit', item)}
                              className="p-1.5 text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(viewModal.key, item.id)}
                              disabled={loading === item.id}
                              className="p-1.5 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            >
                              {loading === item.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      )
                    }
                    // Items normales
                    return (
                      <div key={item.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <Text variant="body" className="font-bold">{item.name}</Text>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setAddModal(viewModal)
                              setNewItemName(item.name)
                              setViewModal(null)
                            }}
                            className="p-1.5 text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(viewModal.key, item.id)}
                            disabled={loading === item.id}
                            className="p-1.5 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          >
                            {loading === item.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-10 text-center">
                  <viewModal.icon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <Text variant="muted" className="block font-bold uppercase tracking-widest text-xs">No hay elementos en este catálogo</Text>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => {
                  if (viewModal.key === 'catalog_models') {
                    openModelModal('add')
                    setViewModal(null)
                  } else if (viewModal.key === 'catalog_accessories') {
                    openAccessoryModal('add')
                    setViewModal(null)
                  } else {
                    setAddModal(viewModal)
                    setViewModal(null)
                    setNewItemName('')
                  }
                }}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-4 py-2.5",
                  "text-white rounded-xl transition-colors",
                  viewModal.bgColor.replace('/20', '/80'),
                  "hover:opacity-90"
                )}
              >
                <Plus className="w-4 h-4" />
                Agregar Nuevo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Agregar Simple */}
      {addModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setAddModal(null)}
          />
          <div className="relative bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-md shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-xl", addModal.bgColor)}>
                  <addModal.icon className={cn("w-5 h-5", addModal.color)} />
                </div>
                <Text variant="h3" as="h2">Agregar {addModal.title}</Text>
              </div>
              <button
                onClick={() => setAddModal(null)}
                className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="p-5">
              {/* Solo para RAM: campos extra */}
              {addModal.key === 'catalog_memory' ? (
                <div className="space-y-4">
                  <div>
                    <FormLabel>Capacidad (GB)</FormLabel>
                    <input
                      type="text"
                      value={newRamCapacity}
                      onChange={(e) => setNewRamCapacity(e.target.value)}
                      placeholder="Ej: 8, 16, 32"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1419] border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                  <div>
                    <FormLabel>Tipo de RAM</FormLabel>
                    <input
                      type="text"
                      value={newRamType}
                      onChange={(e) => setNewRamType(e.target.value)}
                      placeholder="Ej: DDR4, DDR5, LPDDR4X"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1419] border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                </div>
              ) : addModal.key === 'catalog_storage' ? (
                <div className="space-y-4">
                  <div>
                    <FormLabel>Nombre</FormLabel>
                    <input
                      type="text"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="Ej: SSD 512GB"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1419] border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                    />
                  </div>
                  <div>
                    <FormLabel>Capacidad</FormLabel>
                    <input
                      type="text"
                      value={newStorageCapacity}
                      onChange={(e) => setNewStorageCapacity(e.target.value)}
                      placeholder="Ej: 128GB, 256GB, 512GB, 1TB"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1419] border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                    />
                  </div>
                  <div>
                    <FormLabel>Tecnología</FormLabel>
                    <input
                      type="text"
                      value={newStorageType}
                      onChange={(e) => setNewStorageType(e.target.value)}
                      placeholder="Ej: SSD, HDD, NVMe, M.2"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1419] border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <FormLabel>Nombre</FormLabel>
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder={`Nuevo ${addModal.title.toLowerCase().slice(0, -1)}...`}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1419] border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-5 pt-0">
              <button
                onClick={() => setAddModal(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 
                         text-gray-700 dark:text-gray-300 rounded-xl transition-colors font-bold uppercase tracking-widest text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleAdd}
                disabled={
                  loading === 'add' || 
                  (addModal.key === 'catalog_memory' 
                    ? (!newRamCapacity.trim() && !newRamType.trim())
                    : addModal.key === 'catalog_storage'
                    ? (!newStorageCapacity.trim() && !newStorageType.trim() && !newItemName.trim())
                    : !newItemName.trim()
                  )
                }
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-2.5",
                  "text-white rounded-xl transition-colors font-bold uppercase tracking-widest text-xs",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  addModal.bgColor.replace('/20', '/80'),
                  "hover:opacity-90"
                )}
              >
                {loading === 'add' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Accesorios */}
      {accessoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setAccessoryModal(null)
              setAccessoryError(null)
            }}
          />
          <div className="relative bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10">
                  <PlugZap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <Text variant="h3" as="h2">
                  {accessoryModal.mode === 'edit' ? 'Editar Accesorio' : 'Nuevo Accesorio'}
                </Text>
              </div>
              <button
                onClick={() => setAccessoryModal(null)}
                className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <FormLabel required>Nombre</FormLabel>
                <input
                  type="text"
                  value={accessoryForm.name}
                  onChange={(e) => setAccessoryForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Cargador"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1419] border border-gray-200 dark:border-gray-700 rounded-xl
                           text-gray-900 dark:text-white placeholder:text-gray-400
                           focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  autoFocus
                />
              </div>

              <div>
                <FormLabel>Tipo de Producto</FormLabel>
                <select
                  value={accessoryForm.product_type_id}
                  onChange={(e) => setAccessoryForm(prev => ({ ...prev, product_type_id: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1419] border border-gray-200 dark:border-gray-700 rounded-xl
                           text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="">Todos los tipos</option>
                  {catalogs.productTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="accessory-required"
                  checked={accessoryForm.is_required}
                  onChange={(e) => setAccessoryForm(prev => ({ ...prev, is_required: e.target.checked }))}
                  className="mt-1 [accent-color:#34d399] w-4 h-4 rounded"
                />
                <div>
                  <label htmlFor="accessory-required" className="text-sm font-medium text-white">
                    Requerido por defecto
                  </label>
                  <p className="text-xs text-surface-500">El accesorio se marcará automáticamente para ese tipo de producto.</p>
                </div>
              </div>
            </div>

            <div className="px-5 pt-4 pb-2 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <Text variant="body" className="font-bold">{accessoryListTitle}</Text>
                <Text variant="muted" className="text-xs">{filteredAccessories.length} encontrados</Text>
              </div>
              <div className="space-y-2 max-h-52 overflow-y-auto mt-3 pr-1">
                {filteredAccessories.length === 0 ? (
                  <Text variant="muted" className="text-xs text-center block italic">No hay accesorios asociados a este tipo.</Text>
                ) : (
                  filteredAccessories.map((accessory) => (
                    <div
                      key={accessory.id}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-[#0f1419] rounded-xl border border-gray-100 dark:border-gray-800"
                    >
                      <div className="flex-1 min-w-0">
                        <Text variant="body" className="font-bold truncate group-hover:text-emerald-600 transition-colors block">{accessory.name}</Text>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {accessory.product_type && (
                            <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-500/10 rounded-full border border-emerald-500/10">
                              {accessory.product_type.name}
                            </span>
                          )}
                          {accessory.is_required && (
                            <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-500/10 rounded-full border border-blue-500/10">
                              Requerido
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openAccessoryModal('edit', accessory)}
                        className="p-1.5 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {accessoryError && (
              <div className="px-5 pt-2">
                <p className="text-xs text-red-400">{accessoryError}</p>
              </div>
            )}

            <div className="flex gap-3 p-5 pt-0">
              <button
                onClick={() => {
                  setAccessoryModal(null)
                  setAccessoryError(null)
                }}
                className="flex-1 px-4 py-2.5 bg-surface-800 hover:bg-surface-700 
                         text-surface-300 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAccessorySubmit}
                disabled={loading === 'accessory' || !accessoryForm.name.trim()}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-2.5",
                  "text-white rounded-xl transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "bg-emerald-500/80 hover:opacity-90"
                )}
              >
                {loading === 'accessory' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : accessoryModal.mode === 'edit' ? (
                  <>
                    <Edit2 className="w-4 h-4" />
                    Guardar Cambios
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Agregar Accesorio
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Agregar/Editar Modelo */}
      {modelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setModelModal(null)}
          />
          <div className="relative bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/10">
                  <Cpu className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <Text variant="h3" as="h2">
                  {modelModal.mode === 'edit' ? 'Editar Modelo' : 'Nuevo Modelo'}
                </Text>
              </div>
              <button
                onClick={() => setModelModal(null)}
                className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4">
              {/* Nombre y Tipo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FormLabel required>Nombre del Modelo</FormLabel>
                  <input
                    type="text"
                    value={modelForm.name}
                    onChange={(e) => setModelForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ej: 12T PRO"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1419] border border-gray-200 dark:border-gray-700 rounded-xl
                             text-gray-900 dark:text-white placeholder:text-gray-400
                             focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    autoFocus
                  />
                </div>
                <div>
                  <FormLabel>Tipo de Producto</FormLabel>
                  <select
                    value={modelForm.product_type_id}
                    onChange={(e) => setModelForm(prev => ({ ...prev, product_type_id: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1419] border border-gray-200 dark:border-gray-700 rounded-xl
                             text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  >
                    <option value="">Seleccionar...</option>
                    {catalogs.productTypes.map(pt => (
                      <option key={pt.id} value={pt.id}>{pt.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Marca */}
              <div>
                <FormLabel required>Marca</FormLabel>
                <select
                  value={modelForm.brand_id}
                  onChange={(e) => setModelForm(prev => ({ ...prev, brand_id: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1419] border border-gray-200 dark:border-gray-700 rounded-xl
                           text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  <option value="">Seleccionar marca...</option>
                  {catalogs.brands.map(brand => (
                    <option key={brand.id} value={brand.id}>{brand.name}</option>
                  ))}
                </select>
              </div>

              {/* Descripción */}
              <div>
                <FormLabel>Descripción</FormLabel>
                <input
                  type="text"
                  value={modelForm.description}
                  onChange={(e) => setModelForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Ej: Gama alta 2023"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1419] border border-gray-200 dark:border-gray-700 rounded-xl
                           text-gray-900 dark:text-white placeholder:text-gray-400
                           focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-5 pt-0">
              <button
                onClick={() => setModelModal(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 
                         text-gray-700 dark:text-gray-300 rounded-xl transition-colors font-bold uppercase tracking-widest text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleModelSubmit}
                disabled={loading === 'model' || !modelForm.name.trim() || !modelForm.brand_id}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5
                         bg-purple-600 hover:bg-purple-700 text-white rounded-xl 
                         transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold uppercase tracking-widest text-xs shadow-lg shadow-purple-500/10"
              >
                {loading === 'model' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : modelModal.mode === 'edit' ? (
                  <>
                    <Edit2 className="w-4 h-4" />
                    Actualizar Modelo
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Crear Modelo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
