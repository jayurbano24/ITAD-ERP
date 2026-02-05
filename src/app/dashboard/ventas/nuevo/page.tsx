'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  AlertCircle,
  Building2,
  CheckCircle,
  Check,
  Laptop,
  Loader2,
  Monitor,
  Package,
  Plus,
  Search,
  Server,
  ShoppingCart,
  Smartphone,
  Trash2,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  searchAssetsForSale,
  searchCustomers,
  processSale,
  getRemarketingWarehouseStock,
  getRemarketingPrice,
  type AssetForSale,
  type CartItem,
  type Customer
} from '../actions'

import {
  getCatalogBrands,
  getCatalogModels,
  getCatalogProductTypes,
  type CatalogBrand,
  type CatalogModel,
  type CatalogProductType
} from '@/app/dashboard/inventario/partes/actions'

const assetTypeIcons: Record<string, React.ElementType> = {
  laptop: Laptop,
  desktop: Monitor,
  smartphone: Smartphone,
  tablet: Smartphone,
  server: Server,
  other: Package
}

const gradeColors: Record<string, string> = {
  'Grade A': 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
  'Grade B': 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
  'Grade C': 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',
  Scrap: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30'
}

const hiddenModels = [
  { manufacturer: 'Dell', model: 'Vostro 3888' }
]

const matchesHiddenModel = (asset: { manufacturer?: string | null; model?: string | null }) =>
  hiddenModels.some((hidden) =>
    asset.manufacturer?.toLowerCase() === hidden.manufacturer.toLowerCase() &&
    asset.model?.toLowerCase() === hidden.model.toLowerCase()
  )

export default function NuevaVentaPage() {
  const router = useRouter()
  const [customerQuery, setCustomerQuery] = useState('')
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [productQuery, setProductQuery] = useState('')
  const [productResults, setProductResults] = useState<AssetForSale[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchingCustomers, setSearchingCustomers] = useState(false)
  const [searchingProducts, setSearchingProducts] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ orderId: string; orderNumber: string } | null>(null)
  const [remarketingCount, setRemarketingCount] = useState<number | null>(null)
  const [remarketingLoading, setRemarketingLoading] = useState(false)
  const [remarketingError, setRemarketingError] = useState<string | null>(null)
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false)
  const [catalogBrands, setCatalogBrands] = useState<CatalogBrand[]>([])
  const [catalogModels, setCatalogModels] = useState<CatalogModel[]>([])
  const [catalogProductTypes, setCatalogProductTypes] = useState<CatalogProductType[]>([])
  const [catalogFiltersLoading, setCatalogFiltersLoading] = useState(false)
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null)
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
  const [quantityForModal, setQuantityForModal] = useState(1)
  const [serialNumbers, setSerialNumbers] = useState<string[]>([''])
  const [modalError, setModalError] = useState<string | null>(null)
  const [modalProcessing, setModalProcessing] = useState(false)
  const [modalUnitPrice, setModalUnitPrice] = useState<number | null>(null)
  const [priceLoading, setPriceLoading] = useState(false)
  const [catalogPriceError, setCatalogPriceError] = useState<string | null>(null)
  const [saleDate, setSaleDate] = useState<Date | null>(null)
  const [invoiceNumber, setInvoiceNumber] = useState<string>('')

  const catalogProductTypeLookup = useMemo(
    () => new Map(catalogProductTypes.map((type) => [type.id, type.name])),
    [catalogProductTypes]
  )

  const filteredModelOptions = useMemo(
    () => (selectedBrandId ? catalogModels.filter((model) => model.brand_id === selectedBrandId) : catalogModels),
    [catalogModels, selectedBrandId]
  )

  const selectedModel = catalogModels.find((model) => model.id === selectedModelId) ?? null
  const selectedBrand = catalogBrands.find((brand) => brand.id === selectedBrandId) ?? null
  const selectedProductTypeName = selectedModel
    ? selectedModel.product_type?.name ?? catalogProductTypeLookup.get(selectedModel.product_type_id ?? '') ?? '—'
    : '—'

  const formatCurrency = useCallback((value: number) =>
    value
      .toLocaleString('es-GT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }),
    []
  )

  const customerDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const productDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setSaleDate(new Date())
    setInvoiceNumber(`FACT-${Date.now().toString().slice(-8)}`)
  }, [])

  const fetchCustomers = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setCustomerResults([])
      setSearchingCustomers(false)
      return
    }

    setSearchingCustomers(true)
    try {
      const { data, error: clientError } = await searchCustomers(query.trim())
      if (clientError) {
        setError(clientError)
        setCustomerResults([])
        return
      }
      setCustomerResults(data ?? [])
    } catch (err) {
      console.error(err)
      setError('Error buscando clientes')
    } finally {
      setSearchingCustomers(false)
    }
  }, [])

  const fetchProducts = useCallback(async (query: string) => {
    setSearchingProducts(true)
    try {
      const { data, error: clientError } = await searchAssetsForSale(query.trim())
      if (clientError) {
        setError(clientError)
        setProductResults([])
        return
      }
      const filteredData = (data ?? []).filter((asset) => !matchesHiddenModel(asset))
      setProductResults(filteredData)
    } catch (err) {
      console.error(err)
      setError('Error cargando equipos disponibles')
    } finally {
      setSearchingProducts(false)
    }
  }, [])

  useEffect(() => {
    if (customerDebounce.current) {
      clearTimeout(customerDebounce.current)
    }
    customerDebounce.current = setTimeout(() => {
      fetchCustomers(customerQuery)
    }, 300)

    return () => {
      if (customerDebounce.current) {
        clearTimeout(customerDebounce.current)
      }
    }
  }, [customerQuery, fetchCustomers])

  useEffect(() => {
    if (productDebounce.current) {
      clearTimeout(productDebounce.current)
    }
    productDebounce.current = setTimeout(() => {
      fetchProducts(productQuery)
    }, 300)

    return () => {
      if (productDebounce.current) {
        clearTimeout(productDebounce.current)
      }
    }
  }, [productQuery, fetchProducts])

  useEffect(() => {
    setSerialNumbers((prev) => {
      const normalized = Math.max(1, Math.min(20, quantityForModal))
      if (prev.length === normalized) {
        return prev
      }
      if (prev.length > normalized) {
        return prev.slice(0, normalized)
      }
      return [...prev, ...Array(normalized - prev.length).fill('')]
    })
  }, [quantityForModal])

  useEffect(() => {
    let cancelled = false

    const loadRemarketingStock = async () => {
      setRemarketingLoading(true)
      setRemarketingError(null)
      try {
        const { count, error: countError } = await getRemarketingWarehouseStock()
        if (cancelled) return
        setRemarketingCount(count)
        setRemarketingError(countError)
      } catch (err) {
        console.error(err)
        if (!cancelled) {
          setRemarketingError('Error cargando disponibilidad de Remarketing')
        }
      } finally {
        if (!cancelled) {
          setRemarketingLoading(false)
        }
      }
    }

    loadRemarketingStock()

    return () => {
      cancelled = true
    }
  }, [])

  const loadCatalogFilters = useCallback(async () => {
    if (catalogFiltersLoading) return
    setCatalogFiltersLoading(true)
    try {
      const [brandsRes, modelsRes, productTypesRes] = await Promise.all([
        getCatalogBrands(),
        getCatalogModels(),
        getCatalogProductTypes()
      ])

      setCatalogBrands(brandsRes.data ?? [])
      setCatalogModels(modelsRes.data ?? [])
      setCatalogProductTypes(productTypesRes.data ?? [])

      if (brandsRes.error || modelsRes.error || productTypesRes.error) {
        setModalError('No se pudieron cargar los catálogos. Intenta nuevamente.')
      }
    } catch (err) {
      console.error(err)
      setModalError('Error cargando los catálogos')
    } finally {
      setCatalogFiltersLoading(false)
    }
  }, [catalogFiltersLoading])

  useEffect(() => {
    if (isCatalogModalOpen && !catalogFiltersLoading && catalogBrands.length === 0) {
      loadCatalogFilters()
    }
  }, [isCatalogModalOpen, catalogFiltersLoading, catalogBrands.length, loadCatalogFilters])

  useEffect(() => {
    if (!selectedBrand || !selectedModel) {
      setModalUnitPrice(null)
      setCatalogPriceError(null)
      return
    }

    let cancelled = false

    const fetchPrice = async () => {
      setPriceLoading(true)
      try {
        const { price, error } = await getRemarketingPrice({
          manufacturer: selectedBrand.name,
          model: selectedModel.name
        })
        if (!cancelled) {
          setCatalogPriceError(error)
          setModalUnitPrice(price)
        }
      } catch (err) {
        console.error(err)
        if (!cancelled) {
          setCatalogPriceError('Error cargando el precio')
          setModalUnitPrice(null)
        }
      } finally {
        if (!cancelled) {
          setPriceLoading(false)
        }
      }
    }

    fetchPrice()

    return () => {
      cancelled = true
    }
  }, [selectedBrand, selectedModel])

  const resetCatalogForm = () => {
    setSelectedBrandId(null)
    setSelectedModelId(null)
    setQuantityForModal(1)
    setSerialNumbers([''])
    setModalUnitPrice(null)
    setCatalogPriceError(null)
    setModalError(null)
  }

  const openCatalogModal = () => {
    setModalError(null)
    setIsCatalogModalOpen(true)
  }

  const closeCatalogModal = () => {
    setIsCatalogModalOpen(false)
    resetCatalogForm()
  }

  const handleQuantityInput = (value: number) => {
    const normalized = Math.max(1, Math.min(20, Math.floor(value) || 1))
    setQuantityForModal(normalized)
  }

  const updateSerialNumber = (index: number, value: string) => {
    setSerialNumbers((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  const handleModalConfirm = async () => {
    setModalError(null)
    if (!selectedBrand || !selectedModel) {
      setModalError('Selecciona marca y modelo antes de continuar')
      return
    }
    if (serialNumbers.some((serial) => !serial.trim())) {
      setModalError('Ingresa todos los números de serie')
      return
    }

    setModalProcessing(true)
    try {
      const assetsToAdd: AssetForSale[] = []
      for (const serial of serialNumbers) {
        const trimmed = serial.trim()
        if (trimmed.length < 2) {
          setModalError('El número de serie debe tener al menos dos caracteres')
          return
        }
        const { data, error: searchError } = await searchAssetsForSale(trimmed)
        if (searchError) {
          setModalError(`Error buscando el serial ${trimmed}`)
          return
        }
        const match = (data ?? []).find((asset) => {
          const matchesSerial =
            asset.serial_number?.toLowerCase() === trimmed.toLowerCase() ||
            asset.internal_tag?.toLowerCase() === trimmed.toLowerCase()
          const matchesBrand = asset.manufacturer?.toLowerCase() === selectedBrand.name.toLowerCase()
          const matchesModel = asset.model?.toLowerCase() === selectedModel.name.toLowerCase()
          return matchesSerial && matchesBrand && matchesModel
        })
        if (!match) {
          setModalError(`No se encontró activo para el serial "${trimmed}"`)
          return
        }
        assetsToAdd.push(match)
      }

      assetsToAdd.forEach(addToCart)
      closeCatalogModal()
    } finally {
      setModalProcessing(false)
    }
  }

  const addToCart = (asset: AssetForSale) => {
    setCart((prev) => {
      if (prev.some((item) => item.asset.id === asset.id)) return prev
      const price = asset.sales_price ?? Math.round(asset.cost_amount * 1.3) ?? 100
      return [...prev, { asset, unitPrice: Math.round(price) }]
    })
    setProductResults((prev) => prev.filter((item) => item.id !== asset.id))
  }

  const removeFromCart = (assetId: string) => {
    const removedItem = cart.find((item) => item.asset.id === assetId)
    if (removedItem && !matchesHiddenModel(removedItem.asset)) {
      setProductResults((prev) => [removedItem.asset, ...prev])
    }
    setCart((prev) => prev.filter((item) => item.asset.id !== assetId))
  }

  const updatePrice = (assetId: string, price: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.asset.id === assetId
          ? {
            ...item,
            unitPrice: Math.max(0, Math.round(price))
          }
          : item
      )
    )
  }

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice, 0)
  const iva = subtotal * 0.12
  const totalWithIva = subtotal + iva
  const modalSubtotal = (modalUnitPrice ?? 0) * quantityForModal
  const modalIva = modalSubtotal * 0.12
  const modalTotal = modalSubtotal + modalIva

  const handleProcessSale = async () => {
    if (!selectedCustomer) {
      setError('Debe seleccionar un cliente')
      return
    }
    if (cart.length === 0) {
      setError('Agregue equipos al carrito')
      return
    }

    setError(null)
    setIsProcessing(true)

    const result = await processSale({
      customerId: selectedCustomer.id,
      cartItems: cart.map((item) => ({
        assetId: item.asset.id,
        unitPrice: item.unitPrice,
        description: `${item.asset.manufacturer ?? ''} ${item.asset.model ?? ''} - ${item.asset.asset_type}`,
        serialNumber: item.asset.serial_number,
        conditionGrade: item.asset.condition
      })),
      warrantyDays: 30
    })

    setIsProcessing(false)

    if (result.success && result.data) {
      setSuccess(result.data)
      fetchProducts('')
    } else {
      setError(result.error || 'Error al procesar la venta')
    }
  }

  const resetSaleForm = useCallback(() => {
    setSuccess(null)
    setSelectedCustomer(null)
    setCart([])
    setCustomerQuery('')
    setProductQuery('')
    fetchProducts('')
  }, [fetchProducts])

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer)
    setShowCustomerDropdown(false)
    setCustomerQuery('')
    setCustomerResults([])
  }

  if (success) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-surface-950 min-h-screen flex items-center justify-center">
        <div className="max-w-lg w-full text-center py-16 bg-white dark:bg-surface-900 rounded-3xl border border-gray-100 dark:border-surface-800 shadow-2xl p-10">
          <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <CheckCircle className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">¡Venta Exitosa!</h1>
          <p className="text-gray-500 dark:text-surface-400 mb-8 font-medium">La venta se procesó correctamente</p>

          <div className="bg-gray-50 dark:bg-surface-950/50 border border-gray-100 dark:border-surface-800 rounded-2xl p-8 mb-10 text-left space-y-4 shadow-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-surface-400 font-bold uppercase text-xs tracking-wider">Orden:</span>
              <span className="text-gray-900 dark:text-white font-mono font-black text-lg">{success.orderNumber}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-surface-400 font-bold uppercase text-xs tracking-wider">Cliente:</span>
              <span className="text-gray-900 dark:text-white font-bold">{selectedCustomer?.commercial_name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-surface-400 font-bold uppercase text-xs tracking-wider">Items:</span>
              <span className="text-gray-900 dark:text-white font-bold">{cart.length} equipos</span>
            </div>
            <div className="pt-4 border-t border-gray-200 dark:border-surface-800 flex justify-between items-center">
              <span className="text-gray-500 dark:text-surface-400 font-bold uppercase text-xs tracking-wider">IVA (12%):</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-black">Q{formatCurrency(iva)}</span>
            </div>
            <div className="flex justify-between items-center text-2xl pt-2">
              <span className="text-gray-900 dark:text-white font-black tracking-tight">Total:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-black tabular-nums" data-total-price>
                Q{formatCurrency(totalWithIva)}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/dashboard/ventas')}
              className="flex-1 px-8 py-4 bg-gray-100 dark:bg-surface-800 hover:bg-gray-200 dark:hover:bg-surface-700 text-gray-900 dark:text-white rounded-2xl transition-all font-black uppercase tracking-widest text-xs"
            >
              Ver Órdenes
            </button>
            <button
              onClick={resetSaleForm}
              className="flex-1 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-emerald-600/20 uppercase tracking-widest text-xs"
            >
              Nueva Venta
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-surface-950 transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-surface-900 border-b border-gray-200 dark:border-surface-800 px-8 py-5 flex items-center justify-between sticky top-0 z-40 shadow-sm transition-all">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
          <ShoppingCart className="w-7 h-7 text-emerald-600 dark:text-emerald-500" />
          Punto de Venta
        </h1>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-xs font-bold text-gray-400 dark:text-surface-500 uppercase tracking-widest">Estado Sistema</span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">EN LÍNEA</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] h-[calc(100vh-73px)]">
        {/* Left Panel - Client Search & Catalog */}
        <div className="bg-white dark:bg-surface-900 border-r border-gray-200 dark:border-surface-800 p-8 overflow-y-auto space-y-8 shadow-inner transition-all">
          {/* Client Search */}
          <div className="space-y-3">
            <label className="block text-gray-500 dark:text-surface-400 text-xs font-black uppercase tracking-widest">Cliente</label>
            <div className="relative">
              <input
                type="text"
                value={customerQuery}
                onChange={(e) => {
                  setCustomerQuery(e.target.value)
                  setShowCustomerDropdown(true)
                }}
                onFocus={() => customerResults.length > 0 && setShowCustomerDropdown(true)}
                placeholder="Buscar cliente por nombre o NIT..."
                className="w-full bg-gray-50 dark:bg-surface-950 border border-gray-200 dark:border-surface-700 rounded-2xl px-5 py-4 text-gray-900 dark:text-white text-sm placeholder:text-gray-400 dark:placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-surface-500" />

              {showCustomerDropdown && customerResults.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-surface-900 border border-gray-200 dark:border-surface-700 rounded-3xl shadow-2xl max-h-80 overflow-y-auto overflow-x-hidden transition-all animate-in fade-in slide-in-from-top-2 duration-200">
                  {customerResults.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => handleCustomerSelect(customer)}
                      className="w-full px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-surface-800 transition-colors border-b border-gray-100 dark:border-surface-800 last:border-0 group"
                    >
                      <div className="text-gray-900 dark:text-white text-sm font-black group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{customer.commercial_name}</div>
                      <div className="text-gray-400 dark:text-surface-400 text-xs font-bold uppercase tracking-wider mt-0.5">{customer.tax_id_nit}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedCustomer && (
              <div className="flex items-center gap-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full w-fit animate-in fade-in zoom-in-50 duration-300">
                <CheckCircle className="w-3.5 h-3.5" />
                Cliente seleccionado
              </div>
            )}
          </div>

          {/* Serial/Model Search */}
          <div className="space-y-3">
            <label className="block text-gray-500 dark:text-surface-400 text-xs font-black uppercase tracking-widest">Escanear serial o buscar modelo</label>
            <div className="relative">
              <input
                type="text"
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                placeholder="Buscar modelo o serial..."
                className="w-full bg-gray-50 dark:bg-surface-950 border border-gray-200 dark:border-surface-700 rounded-2xl px-5 py-4 text-gray-900 dark:text-white text-sm placeholder:text-gray-400 dark:placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-surface-500" />
            </div>
          </div>

          {/* Catalog Button */}
          <button
            onClick={openCatalogModal}
            className="w-full bg-white dark:bg-surface-900 hover:bg-gray-50 dark:hover:bg-surface-800 text-gray-900 dark:text-white border-2 border-dashed border-gray-200 dark:border-surface-700 rounded-3xl px-6 py-8 text-sm font-black uppercase tracking-widest transition-all hover:border-emerald-500/50 hover:text-emerald-600 dark:hover:text-emerald-400 flex flex-col items-center gap-3 group"
          >
            <div className="p-3 bg-gray-50 dark:bg-surface-800 rounded-2xl group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/10 transition-colors">
              <Package className="w-6 h-6 text-gray-400 dark:text-surface-400 group-hover:text-emerald-500 transition-colors" />
            </div>
            Agregar desde catálogo
          </button>

          {/* Stock Info */}
          <div className="p-5 bg-gray-50 dark:bg-surface-950/50 rounded-3xl border border-gray-100 dark:border-surface-800 shadow-sm space-y-1 transition-all">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl shadow-inner">
                <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-gray-400 dark:text-surface-500 text-[10px] font-black uppercase tracking-widest">Bodega Remarketing</span>
                <span className="text-gray-900 dark:text-white font-black text-lg tabular-nums">
                  {remarketingLoading ? '...' : `${remarketingCount ?? 0} equipos`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Cart & Summary */}
        <div className="bg-white dark:bg-surface-950 flex flex-col transition-all">
          {/* Cart Header */}
          <div className="p-8 border-b border-gray-100 dark:border-surface-800 bg-white/50 dark:bg-surface-950/50 backdrop-blur-xl">
            <div className="flex flex-col md:flex-row items-start justify-between gap-6 mb-2">
              <div className="space-y-1">
                <div className="text-gray-400 dark:text-surface-500 text-xs font-black uppercase tracking-widest">Cliente</div>
                <div className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                  {selectedCustomer ? selectedCustomer.commercial_name : 'Escanea equipos para comenzar'}
                </div>
                {selectedCustomer && (
                  <div className="text-gray-500 dark:text-surface-400 text-sm font-medium">{selectedCustomer.tax_id_nit}</div>
                )}
              </div>
              <div className="text-right grid grid-cols-2 md:grid-cols-1 gap-x-8 gap-y-2">
                <div className="space-y-0.5">
                  <div className="text-gray-400 dark:text-surface-500 text-[10px] font-bold uppercase tracking-widest">Factura</div>
                  <div className="text-gray-900 dark:text-white font-mono font-black text-sm">{invoiceNumber || '...'}</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-gray-400 dark:text-surface-500 text-[10px] font-bold uppercase tracking-widest">Fecha y Hora</div>
                  <div className="text-gray-900 dark:text-white font-black text-sm tabular-nums">
                    {saleDate ? saleDate.toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' }) : '...'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cart Table */}
          <div className="flex-1 overflow-y-auto p-8">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-surface-700 space-y-6">
                <div className="p-8 bg-gray-50 dark:bg-surface-900 rounded-full shadow-inner animate-pulse">
                  <ShoppingCart className="w-20 h-20 opacity-20" />
                </div>
                <p className="text-lg font-black uppercase tracking-widest opacity-50">Carrito vacío</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-surface-900 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-surface-800 overflow-hidden">
                <table className="w-full text-sm table-fixed">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-surface-850 border-b border-gray-100 dark:border-surface-800 text-gray-500 dark:text-surface-400 text-[10px] font-black uppercase tracking-[0.2em]">
                      <th className="text-left px-6 py-5 w-[14%]">Marca</th>
                      <th className="text-left px-6 py-5 w-[18%]">Modelo</th>
                      <th className="text-left px-6 py-5 w-[14%]">Producto</th>
                      <th className="text-center px-6 py-5 w-[8%]">QTY</th>
                      <th className="text-left px-6 py-5 w-[26%]">Series</th>
                      <th className="text-right px-6 py-5 w-[12%]">Precio</th>
                      <th className="text-center px-6 py-5 w-[8%]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-surface-800">
                    {cart.map((item, idx) => (
                      <tr key={item.asset.id} className="hover:bg-gray-50 dark:hover:bg-surface-800/50 transition-colors group">
                        <td className="px-6 py-5 text-gray-900 dark:text-white font-bold truncate">{item.asset.manufacturer || '-'}</td>
                        <td className="px-6 py-5 text-gray-900 dark:text-white font-black truncate">{item.asset.model || '-'}</td>
                        <td className="px-6 py-5">
                          <span className="bg-gray-100 dark:bg-surface-800 px-2.5 py-1 rounded-lg text-gray-500 dark:text-surface-400 font-bold text-xs uppercase tracking-wider">{item.asset.asset_type || '-'}</span>
                        </td>
                        <td className="px-6 py-5 text-center text-gray-900 dark:text-white font-black">1</td>
                        <td className="px-6 py-5">
                          <code className="text-emerald-600 dark:text-emerald-400 font-mono font-bold text-xs bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-md">{item.asset.serial_number || item.asset.internal_tag}</code>
                        </td>
                        <td className="px-6 py-5 text-right text-gray-900 dark:text-white font-black tabular-nums">
                          Q{item.unitPrice.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-5 text-center">
                          <button
                            onClick={() => removeFromCart(item.asset.id)}
                            className="p-2 text-gray-300 dark:text-surface-600 hover:text-red-500 dark:hover:text-red-400 transition-all hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Summary Footer */}
          <div className="border-t border-gray-100 dark:border-surface-800 p-8 bg-white dark:bg-surface-900 shadow-[0_-20px_50px_-20px_rgba(0,0,0,0.1)] transition-all">
            <div className="grid grid-cols-2 gap-x-12 gap-y-4 mb-8">
              <div className="flex justify-between items-center text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-surface-500">
                <span>Subtotal ({cart.length} ítems):</span>
                <span className="text-gray-900 dark:text-white font-black tabular-nums">Q{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-surface-500">
                <span>IVA (12%):</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-black tabular-nums">Q{formatCurrency(iva)}</span>
              </div>
              <div className="col-span-2 pt-6 border-t border-gray-100 dark:border-surface-800 flex justify-between items-center">
                <span className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">Total</span>
                <span className="text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums animate-in fade-in zoom-in-95 duration-500">Q{formatCurrency(totalWithIva)}</span>
              </div>
            </div>

            <button
              onClick={handleProcessSale}
              disabled={cart.length === 0 || !selectedCustomer || isProcessing}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-100 dark:disabled:bg-surface-800 disabled:text-gray-400 dark:disabled:text-surface-600 disabled:cursor-not-allowed text-white py-5 rounded-3xl font-black uppercase text-sm tracking-[0.2em] transition-all shadow-2xl shadow-emerald-500/30 flex items-center justify-center gap-3 active:scale-[0.99]"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Procesando venta...
                </>
              ) : (
                <>
                  <CheckCircle className="w-6 h-6" />
                  Confirmar y Finalizar
                </>
              )}
            </button>

            {error && (
              <div className="mt-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/30 rounded-2xl text-red-600 dark:text-red-400 text-sm font-bold flex items-center gap-3 animate-bounce">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Catalog Modal */}
      {isCatalogModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-md px-4"
          onClick={closeCatalogModal}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-lg rounded-[2.5rem] border border-gray-100 dark:border-surface-800 bg-white dark:bg-surface-900 p-8 shadow-2xl animate-in zoom-in-95 fade-in duration-300"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Agregar desde catálogo</h2>
                <p className="text-gray-500 dark:text-surface-400 text-xs font-bold uppercase tracking-widest mt-1">Selecciona productos serializados</p>
              </div>
              <button className="p-2.5 bg-gray-50 dark:bg-surface-800 text-gray-400 dark:text-surface-400 hover:text-gray-900 dark:hover:text-white rounded-2xl transition-all" onClick={closeCatalogModal}>
                <X className="w-6 h-6" />
              </button>
            </div>

            {catalogFiltersLoading && (
              <div className="flex items-center gap-3 mb-6 p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                <Loader2 className="h-5 w-5 animate-spin" />
                Cargando marcas y modelos...
              </div>
            )}

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {/* Marca */}
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-surface-500">Marca</label>
                  <select
                    value={selectedBrandId ?? ''}
                    onChange={(event) => {
                      setSelectedBrandId(event.target.value || null)
                      setSelectedModelId(null)
                      setModalError(null)
                    }}
                    className="w-full rounded-2xl border border-gray-200 dark:border-surface-700 bg-gray-50 dark:bg-surface-950 px-4 py-3 text-gray-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none transition-all"
                  >
                    <option value="" disabled>Marca</option>
                    {catalogBrands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Modelo */}
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-surface-500">Modelo</label>
                  <select
                    value={selectedModelId ?? ''}
                    onChange={(event) => setSelectedModelId(event.target.value || null)}
                    disabled={!filteredModelOptions.length}
                    className="w-full rounded-2xl border border-gray-200 dark:border-surface-700 bg-gray-50 dark:bg-surface-950 px-4 py-3 text-gray-900 dark:text-white font-black focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                  >
                    <option value="" disabled>
                      {filteredModelOptions.length ? 'Modelo' : 'Marca primero'}
                    </option>
                    {filteredModelOptions.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Tipo de producto */}
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-surface-500">Tipo</label>
                  <input
                    readOnly
                    type="text"
                    value={selectedProductTypeName}
                    className="w-full rounded-2xl border border-gray-200 dark:border-surface-700 bg-gray-100 dark:bg-surface-800/50 px-4 py-3 text-gray-500 dark:text-surface-400 font-bold"
                  />
                </div>

                {/* Cantidad */}
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-surface-500">Cantidad</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={quantityForModal}
                    onChange={(event) => handleQuantityInput(Number(event.target.value))}
                    className="w-full rounded-2xl border border-gray-200 dark:border-surface-700 bg-gray-50 dark:bg-surface-950 px-4 py-3 text-gray-900 dark:text-white font-black focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Precio unitario */}
              <div className="rounded-3xl border-2 border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-500/5 p-6 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-600/50 dark:text-emerald-400/50">Estimación Precio Unitario</span>
                  {priceLoading && <Loader2 className="h-4 w-4 animate-spin text-emerald-600 dark:text-emerald-400" />}
                </div>
                <p className="text-3xl font-black text-emerald-700 dark:text-emerald-400 tracking-tight tabular-nums">
                  {priceLoading
                    ? '...'
                    : modalUnitPrice !== null
                      ? `Q${formatCurrency(modalUnitPrice)}`
                      : '—'}
                </p>
                {catalogPriceError && <p className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded w-fit">{catalogPriceError}</p>}
              </div>

              {/* Números de serie */}
              <div className="space-y-3">
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-surface-500">Números de Serie</label>
                <div className="space-y-2 max-h-40 overflow-y-auto px-1">
                  {serialNumbers.map((serial, index) => (
                    <input
                      key={index}
                      value={serial}
                      onChange={(event) => updateSerialNumber(index, event.target.value)}
                      placeholder={`Serie ${index + 1}`}
                      className="w-full rounded-xl border border-gray-200 dark:border-surface-700 bg-gray-50 dark:bg-surface-950 px-4 py-2.5 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none transition-all"
                    />
                  ))}
                </div>
              </div>

              {/* Totales */}
              <div className="rounded-[2rem] border border-gray-100 dark:border-surface-800 bg-gray-50/50 dark:bg-surface-950/50 p-6 space-y-3 shadow-inner">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-surface-500">
                  <span>Subtotal</span>
                  <span className="text-gray-900 dark:text-white tabular-nums">Q{formatCurrency(modalSubtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-surface-500 pb-3 border-b border-gray-200 dark:border-surface-800">
                  <span>IVA (12%)</span>
                  <span className="text-gray-900 dark:text-white tabular-nums">Q{formatCurrency(modalIva)}</span>
                </div>
                <div className="flex items-center justify-between text-xl font-black text-gray-900 dark:text-white pt-1">
                  <span className="tracking-tighter">Total</span>
                  <span className="text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight">Q{formatCurrency(modalTotal)}</span>
                </div>
              </div>

              {modalError && <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-xs font-black text-center uppercase tracking-wider animate-shake">{modalError}</div>}

              {/* Botones */}
              <div className="flex items-center gap-4 pt-4">
                <button
                  onClick={closeCatalogModal}
                  className="flex-1 rounded-2xl border border-gray-200 dark:border-surface-700 px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-surface-400 hover:bg-gray-50 dark:hover:bg-surface-800 hover:border-gray-300 transition-all active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleModalConfirm}
                  disabled={modalProcessing || priceLoading || !modalUnitPrice}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-3 rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest transition-all shadow-xl active:scale-95',
                    modalProcessing || priceLoading || !modalUnitPrice
                      ? 'bg-gray-100 dark:bg-surface-800 cursor-not-allowed text-gray-400 dark:text-surface-600 shadow-none'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
                  )}
                >
                  {modalProcessing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Agregar al carrito
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
