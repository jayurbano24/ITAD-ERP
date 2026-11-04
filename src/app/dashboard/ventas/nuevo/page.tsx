'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
  createCustomerQuick,
  processSale,
  persistAssetRetailSalePrice,
  getSalesOrderById,
  getRemarketingWarehouseStock,
  type AssetForSale,
  type CartItem,
  type Customer,
  type SalePaymentMethod,
} from '../actions'
import {
  printWarrantyPolicy,
  buildWarrantyPayloadFromSaleOrder,
} from '@/lib/ventas/printWarrantyPolicy'

const PAYMENT_OPTIONS: { id: SalePaymentMethod; label: string }[] = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'tarjeta', label: 'Tarjeta' },
  { id: 'visacuota', label: 'Visacuota' },
]

const VISACUOTA_CUOTAS = [3, 6, 10, 12, 18, 24]
const IVA_RATE = 0.12

type ServiceLine = {
  id: string
  description: string
  unitPrice: number
  listedPrice: number
  priceIncludesIva: boolean
}

/** Convierte precio digitado → base sin IVA para el carrito */
function toBasePrice(price: number, includesIva: boolean): number {
  const n = Math.max(0, Number(price) || 0)
  if (!includesIva) return Math.round(n * 100) / 100
  return Math.round((n / (1 + IVA_RATE)) * 100) / 100
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

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
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const productInputRef = useRef<HTMLInputElement | null>(null)
  const [searchingCustomers, setSearchingCustomers] = useState(false)
  const [searchingProducts, setSearchingProducts] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ orderId: string; orderNumber: string; invoiceNumber?: string } | null>(null)
  const [quickClientName, setQuickClientName] = useState('')
  const [quickClientNit, setQuickClientNit] = useState('')
  const [isClienteFinal, setIsClienteFinal] = useState(true)
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>('efectivo')
  const [visacuotaCuotas, setVisacuotaCuotas] = useState(6)
  const [savingQuickClient, setSavingQuickClient] = useState(false)
  const [remarketingCount, setRemarketingCount] = useState<number | null>(null)
  const [remarketingLoading, setRemarketingLoading] = useState(false)
  const [remarketingError, setRemarketingError] = useState<string | null>(null)
  const [ivaPrompt, setIvaPrompt] = useState<{
    asset: AssetForSale
    inputPrice: number
  } | null>(null)
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>([])
  const [serviceName, setServiceName] = useState('')
  const [serviceAmount, setServiceAmount] = useState('')
  const [serviceIncludesIva, setServiceIncludesIva] = useState(false)
  const [saleNotes, setSaleNotes] = useState('')
  const [saleInvoiceNumber, setSaleInvoiceNumber] = useState('')
  const [saleSatInvoiceNumber, setSaleSatInvoiceNumber] = useState('')
  const [saleDate, setSaleDate] = useState<Date | null>(null)
  const [isNewClientOpen, setIsNewClientOpen] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientNit, setNewClientNit] = useState('')
  const [newClientPhone, setNewClientPhone] = useState('')
  const [newClientEmail, setNewClientEmail] = useState('')
  const [savingClient, setSavingClient] = useState(false)
  const [clientFormError, setClientFormError] = useState<string | null>(null)

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
        setShowProductDropdown(false)
        return
      }
      const filteredData = (data ?? []).filter((asset) => !matchesHiddenModel(asset))
      setProductResults(filteredData)
      // Autocomplete while typing; exact Enter uses tryAddSerialToCart
      setShowProductDropdown(query.trim().length >= 2 && filteredData.length > 0)
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

  const addServiceLine = () => {
    const description = serviceName.trim()
    const listed = Math.max(0, Number(serviceAmount) || 0)
    if (!description) {
      setError('Escribe el nombre del servicio')
      return
    }
    if (listed <= 0) {
      setError('Ingresa un monto válido para el servicio')
      return
    }
    const base = toBasePrice(listed, serviceIncludesIva)
    setServiceLines((prev) => [
      ...prev,
      {
        id: `svc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        description,
        unitPrice: base,
        listedPrice: listed,
        priceIncludesIva: serviceIncludesIva,
      },
    ])
    setServiceName('')
    setServiceAmount('')
    setServiceIncludesIva(false)
    setError(null)
  }

  const removeServiceLine = (id: string) => {
    setServiceLines((prev) => prev.filter((s) => s.id !== id))
  }

  const handleCreateClient = async () => {
    setClientFormError(null)
    setSavingClient(true)
    try {
      const { data, error: createError } = await createCustomerQuick({
        commercial_name: newClientName,
        tax_id_nit: newClientNit,
        phone: newClientPhone || null,
        email: newClientEmail || null,
      })
      if (createError || !data) {
        setClientFormError(createError || 'No se pudo crear el cliente')
        return
      }
      setSelectedCustomer(data)
      setIsNewClientOpen(false)
      setNewClientName('')
      setNewClientNit('')
      setNewClientPhone('')
      setNewClientEmail('')
    } finally {
      setSavingClient(false)
    }
  }

  const buildWarrantyPayload = useCallback(
    (customer: Customer) => {
      const soldAt = saleDate || new Date()
      const warrantyEnd = new Date(soldAt)
      warrantyEnd.setDate(warrantyEnd.getDate() + 90)
      return {
        customerName: customer.commercial_name,
        taxId: customer.tax_id_nit,
        phone: customer.phone,
        email: customer.email,
        saleDate: soldAt.toLocaleDateString('es-GT'),
        deliveryDate: soldAt.toLocaleDateString('es-GT'),
        warrantyEnd: warrantyEnd.toLocaleDateString('es-GT'),
        items: cart.map((item) => ({
          manufacturer: item.asset.manufacturer || '—',
          model: item.asset.model || '—',
          serialNumber: item.asset.serial_number || item.asset.internal_tag,
          grade: item.asset.condition || 'Grade B',
          specs: (item.asset.specsSummary || item.asset.asset_type || '').trim(),
        })),
        commentsDetail: saleNotes.trim() || null,
      }
    },
    [cart, saleDate, saleNotes]
  )

  const handlePrintWarranty = async () => {
    if (!selectedCustomer || !success) return
    await printWarrantyPolicy(buildWarrantyPayload(selectedCustomer))
  }

  const saveQuickClientName = async () => {
    const name = quickClientName.trim()
    if (!name) {
      setError('Escribe el nombre del cliente')
      return
    }
    const nit = isClienteFinal ? 'CF' : quickClientNit.trim()
    if (!isClienteFinal && !nit) {
      setError('Ingresa el NIT del cliente o marca Cliente Final')
      return
    }
    setSavingQuickClient(true)
    setError(null)
    try {
      const { data, error: createError } = await createCustomerQuick({
        commercial_name: name,
        tax_id_nit: nit,
      })
      if (createError || !data) {
        setError(createError || 'No se pudo guardar el cliente')
        return
      }
      setSelectedCustomer(data)
      setQuickClientName('')
      setQuickClientNit('')
    } finally {
      setSavingQuickClient(false)
    }
  }

  const resolveUnitPrice = useCallback((asset: AssetForSale) => {
    if (asset.sales_price != null && Number.isFinite(Number(asset.sales_price)) && Number(asset.sales_price) > 0) {
      return Math.round(Number(asset.sales_price) * 100) / 100
    }
    if (asset.cost_amount != null && Number(asset.cost_amount) > 0) {
      return Math.round(Number(asset.cost_amount) * 1.3 * 100) / 100
    }
    return 100
  }, [])

  const openIvaPrompt = useCallback((asset: AssetForSale) => {
    setError(null)
    setIvaPrompt({ asset, inputPrice: resolveUnitPrice(asset) })
    setProductResults((prev) => prev.filter((item) => item.id !== asset.id))
    setShowProductDropdown(false)
    setProductQuery('')
  }, [resolveUnitPrice])

  const confirmIvaPrompt = useCallback((includesIva: boolean) => {
    if (!ivaPrompt) return
    const listed = Math.max(0, Number(ivaPrompt.inputPrice) || 0)
    const base = toBasePrice(listed, includesIva)
    setCart((prev) => {
      if (prev.some((item) => item.asset.id === ivaPrompt.asset.id)) return prev
      return [
        ...prev,
        {
          asset: ivaPrompt.asset,
          unitPrice: base,
          listedPrice: listed,
          priceIncludesIva: includesIva,
        },
      ]
    })
    setIvaPrompt(null)
    setError(null)
    void persistAssetRetailSalePrice(ivaPrompt.asset.id, listed).catch((err) => {
      console.warn('No se pudo guardar P. venta en inventario:', err)
    })
    productInputRef.current?.focus()
  }, [ivaPrompt])

  const tryAddSerialToCart = useCallback(async (raw: string) => {
    const serial = raw.trim()
    if (serial.length < 2) return false
    setSearchingProducts(true)
    try {
      const { data, error: searchError } = await searchAssetsForSale(serial)
      if (searchError) {
        setError(searchError)
        return false
      }
      const list = (data ?? []).filter((asset) => !matchesHiddenModel(asset))
      const exact =
        list.find((a) => a.serial_number?.toLowerCase() === serial.toLowerCase()) ||
        (list.length === 1 ? list[0] : null)

      if (exact) {
        if (cart.some((item) => item.asset.id === exact.id)) {
          setError(`El serial ${exact.serial_number} ya está en el carrito`)
          setProductQuery('')
          return true
        }
        openIvaPrompt(exact)
        return true
      }

      setProductResults(list)
      setShowProductDropdown(list.length > 0)
      if (list.length === 0) {
        setError(`No se encontró equipo listo para venta con serial "${serial}"`)
      }
      return list.length > 0
    } catch (err) {
      console.error(err)
      setError('Error buscando el equipo')
      return false
    } finally {
      setSearchingProducts(false)
    }
  }, [openIvaPrompt, cart])

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
            unitPrice: Math.max(0, roundMoney(price)),
            listedPrice: Math.max(0, roundMoney(price)),
            priceIncludesIva: false,
          }
          : item
      )
    )
  }

  const subtotal = roundMoney(
    cart.reduce((sum, item) => sum + item.unitPrice, 0) +
      serviceLines.reduce((sum, item) => sum + item.unitPrice, 0)
  )
  const iva = roundMoney(subtotal * IVA_RATE)
  const totalWithIva = roundMoney(subtotal + iva)
  const lineCount = cart.length + serviceLines.length

  const handleProcessSale = async () => {
    if (!selectedCustomer) {
      setError('Agrega el nombre del cliente antes de finalizar')
      return
    }
    if (lineCount === 0) {
      setError('Agrega equipos o servicios al carrito')
      return
    }

    setError(null)
    setIsProcessing(true)

    if (paymentMethod === 'visacuota' && (!visacuotaCuotas || visacuotaCuotas < 1)) {
      setError('Selecciona el número de cuotas Visacuota')
      return
    }

    const result = await processSale({
      customerId: selectedCustomer.id,
      cartItems: [
        ...cart.map((item) => ({
          assetId: item.asset.id,
          unitPrice: item.unitPrice,
          listedPrice: item.listedPrice ?? item.unitPrice,
          priceIncludesIva: item.priceIncludesIva ?? false,
          description: `${item.asset.manufacturer ?? ''} ${item.asset.model ?? ''} - ${item.asset.asset_type}`,
          serialNumber: item.asset.serial_number,
          conditionGrade: item.asset.condition,
        })),
        ...serviceLines.map((svc) => ({
          assetId: null,
          unitPrice: svc.unitPrice,
          description: `Servicio: ${svc.description}`,
          serialNumber: null,
          conditionGrade: null,
        })),
      ],
      warrantyDays: 90,
      paymentMethod,
      installments: paymentMethod === 'visacuota' ? visacuotaCuotas : undefined,
      notes: saleNotes.trim() || undefined,
      invoiceNumber: saleInvoiceNumber.trim() || undefined,
      satInvoiceNumber: saleSatInvoiceNumber.trim() || undefined,
    })

    setIsProcessing(false)

    if (result.success && result.data) {
      setSuccess(result.data)
      // Al cerrar la venta: descarga PDF de política de garantía (sin FACT/SO)
      try {
        const { getWarrantyPrintPayloadForOrder } = await import('../actions')
        const { payload } = await getWarrantyPrintPayloadForOrder(result.data.orderId, {
          registerIfMissing: true,
        })
        if (payload) {
          await printWarrantyPolicy(payload)
        } else {
          await printWarrantyPolicy(buildWarrantyPayload(selectedCustomer))
        }
      } catch (pdfErr) {
        console.error('Error generando PDF de garantía:', pdfErr)
        setError('Venta guardada, pero no se pudo descargar el PDF de garantía. Usa “Reimprimir” en el detalle.')
      }
      fetchProducts('')
    } else {
      setError(result.error || 'Error al procesar la venta')
    }
  }

  const resetSaleForm = useCallback(() => {
    setSuccess(null)
    setSelectedCustomer(null)
    setCart([])
    setServiceLines([])
    setSaleNotes('')
    setSaleInvoiceNumber('')
    setSaleSatInvoiceNumber('')
    setServiceName('')
    setServiceAmount('')
    setCustomerQuery('')
    setProductQuery('')
    setQuickClientName('')
    setQuickClientNit('')
    setIsClienteFinal(true)
    setPaymentMethod('efectivo')
    setVisacuotaCuotas(6)
    fetchProducts('')
  }, [fetchProducts])

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer)
    const nit = (customer.tax_id_nit || '').trim().toUpperCase()
    setIsClienteFinal(nit === 'CF' || nit === 'C/F' || nit === 'CONSUMIDOR FINAL' || !nit)
    setShowCustomerDropdown(false)
    setCustomerQuery('')
    setCustomerResults([])
  }

  const paymentLabel =
    paymentMethod === 'visacuota'
      ? `Visacuota · ${visacuotaCuotas} cuotas`
      : PAYMENT_OPTIONS.find((p) => p.id === paymentMethod)?.label || paymentMethod

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
              <span className="text-gray-500 dark:text-surface-400 font-bold uppercase text-xs tracking-wider">Cliente:</span>
              <span className="text-gray-900 dark:text-white font-bold">{selectedCustomer?.commercial_name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-surface-400 font-bold uppercase text-xs tracking-wider">Tipo:</span>
              <span className="text-gray-900 dark:text-white font-bold">
                {isClienteFinal ? 'Cliente Final (CF)' : `NIT ${selectedCustomer?.tax_id_nit || '—'}`}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-surface-400 font-bold uppercase text-xs tracking-wider">Pago:</span>
              <span className="text-gray-900 dark:text-white font-bold">{paymentLabel}</span>
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

          <div className="flex flex-col gap-3 justify-center">
            <button
              onClick={handlePrintWarranty}
              className="w-full px-8 py-4 bg-[#1e3a5f] hover:bg-[#274b7a] text-white font-black rounded-2xl transition-all uppercase tracking-widest text-xs"
            >
              Descargar política de garantía (PDF para firmar)
            </button>
            <button
              onClick={() => router.push(`/dashboard/ventas/${success.orderId}`)}
              className="w-full px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-emerald-600/20 uppercase tracking-widest text-xs"
            >
              Cerrar factura · Ver detalle
            </button>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => router.push('/dashboard/ventas')}
                className="flex-1 px-8 py-4 bg-gray-100 dark:bg-surface-800 hover:bg-gray-200 dark:hover:bg-surface-700 text-gray-900 dark:text-white rounded-2xl transition-all font-black uppercase tracking-widest text-xs"
              >
                Historial de ventas
              </button>
              <button
                onClick={resetSaleForm}
                className="flex-1 px-8 py-4 border border-emerald-600 text-emerald-700 dark:text-emerald-400 font-black rounded-2xl transition-all uppercase tracking-widest text-xs"
              >
                Nueva Venta
              </button>
            </div>
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
        {/* Left Panel - Cliente, serial y servicios */}
        <div className="bg-white dark:bg-surface-900 border-r border-gray-200 dark:border-surface-800 p-8 overflow-y-auto space-y-8 shadow-inner transition-all">
          {/* Client Search */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="block text-gray-500 dark:text-surface-400 text-xs font-black uppercase tracking-widest">Cliente</label>
              <button
                type="button"
                onClick={() => {
                  setClientFormError(null)
                  setIsNewClientOpen(true)
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white"
              >
                <Plus className="h-3 w-3" />
                Nuevo
              </button>
            </div>
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
            <label className="block text-gray-500 dark:text-surface-400 text-xs font-black uppercase tracking-widest">
              Escanear serial o buscar modelo
            </label>
            <div className="relative">
              <input
                ref={productInputRef}
                type="text"
                value={productQuery}
                onChange={(e) => {
                  setProductQuery(e.target.value)
                  setShowProductDropdown(true)
                  setError(null)
                }}
                onFocus={() => {
                  if (productResults.length > 0) setShowProductDropdown(true)
                }}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    await tryAddSerialToCart(productQuery)
                    productInputRef.current?.focus()
                  }
                }}
                placeholder="Escribe serial y Enter..."
                className="w-full bg-gray-50 dark:bg-surface-950 border border-gray-200 dark:border-surface-700 rounded-2xl px-5 py-4 pr-12 text-gray-900 dark:text-white text-sm placeholder:text-gray-400 dark:placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium font-mono"
                autoComplete="off"
              />
              {searchingProducts ? (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500 animate-spin" />
              ) : (
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-surface-500" />
              )}

              {showProductDropdown && productResults.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-surface-900 border border-gray-200 dark:border-surface-700 rounded-3xl shadow-2xl max-h-80 overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  {productResults.map((asset) => {
                    const price = resolveUnitPrice(asset)
                    const alreadyInCart = cart.some((item) => item.asset.id === asset.id)
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        disabled={alreadyInCart}
                        onClick={() => {
                          if (!alreadyInCart) openIvaPrompt(asset)
                        }}
                        className={cn(
                          'w-full px-5 py-3.5 text-left border-b border-gray-100 dark:border-surface-800 last:border-0 transition-colors',
                          alreadyInCart
                            ? 'opacity-40 cursor-not-allowed'
                            : 'hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400 truncate">
                              {asset.serial_number || asset.internal_tag}
                            </div>
                            <div className="text-xs font-bold text-gray-900 dark:text-white truncate mt-0.5">
                              {[asset.manufacturer, asset.model].filter(Boolean).join(' · ') || 'Sin modelo'}
                            </div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-surface-500 mt-0.5">
                              {asset.condition || asset.asset_type || 'Equipo'}
                              {alreadyInCart ? ' · En carrito' : ''}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-black tabular-nums text-gray-900 dark:text-white">
                              Q {formatCurrency(price)}
                            </div>
                            <div className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                              {alreadyInCart ? 'Agregado' : 'Agregar'}
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            <p className="text-[10px] text-gray-400 dark:text-surface-500 font-medium px-1">
              Escanea o escribe el serial y pulsa <span className="font-black text-emerald-600 dark:text-emerald-400">Enter</span> para facturar
            </p>
          </div>

          {/* Servicios con monto */}
          <div className="rounded-3xl border-2 border-dashed border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-4 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-surface-400">
              Agregar servicio con monto
            </p>
            <input
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="Ej. Instalación, Diagnóstico, Configuración…"
              className="w-full rounded-xl border border-gray-200 dark:border-surface-700 bg-gray-50 dark:bg-surface-950 px-3 py-2.5 text-sm font-bold text-gray-900 dark:text-white"
            />
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                step="0.01"
                value={serviceAmount}
                onChange={(e) => setServiceAmount(e.target.value)}
                placeholder="Monto Q"
                className="flex-1 rounded-xl border border-gray-200 dark:border-surface-700 bg-gray-50 dark:bg-surface-950 px-3 py-2.5 text-sm font-black tabular-nums text-gray-900 dark:text-white"
              />
              <button
                type="button"
                onClick={addServiceLine}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-[10px] font-black uppercase tracking-wide text-white"
              >
                Agregar
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setServiceIncludesIva(true)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border',
                  serviceIncludesIva
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : 'bg-gray-50 dark:bg-surface-950 border-gray-300 dark:border-surface-600 text-gray-600 dark:text-surface-300'
                )}
              >
                IVA incluido
              </button>
              <button
                type="button"
                onClick={() => setServiceIncludesIva(false)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border',
                  !serviceIncludesIva
                    ? 'bg-amber-600 border-amber-500 text-white'
                    : 'bg-gray-50 dark:bg-surface-950 border-gray-300 dark:border-surface-600 text-gray-600 dark:text-surface-300'
                )}
              >
                + IVA 12%
              </button>
            </div>
            {serviceLines.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {serviceLines.map((svc) => (
                  <div
                    key={svc.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-500/10 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{svc.description}</p>
                      <p className="text-[10px] text-gray-500 dark:text-surface-400">
                        Q{formatCurrency(svc.unitPrice)}
                        {svc.priceIncludesIva ? ' · base c/IVA' : ' · +IVA'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeServiceLine(svc.id)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

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
              <div className="text-right">
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
            {lineCount === 0 ? (
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
                    {cart.map((item) => (
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
                        <td className="px-6 py-5 text-right">
                          <div className="text-gray-900 dark:text-white font-black tabular-nums">
                            Q{item.unitPrice.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-[9px] font-bold uppercase tracking-wide text-gray-400 dark:text-surface-500 mt-0.5">
                            {item.priceIncludesIva
                              ? `Base · de Q${(item.listedPrice ?? item.unitPrice).toLocaleString('es-GT', { minimumFractionDigits: 2 })} c/IVA`
                              : 'Sin IVA · +12%'}
                          </div>
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
                    {serviceLines.map((svc) => (
                      <tr key={svc.id} className="hover:bg-gray-50 dark:hover:bg-surface-800/50 transition-colors group">
                        <td className="px-6 py-5 text-gray-900 dark:text-white font-bold truncate">Servicio</td>
                        <td className="px-6 py-5 text-gray-900 dark:text-white font-black truncate" colSpan={1}>{svc.description}</td>
                        <td className="px-6 py-5">
                          <span className="bg-emerald-100 dark:bg-emerald-500/20 px-2.5 py-1 rounded-lg text-emerald-700 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">Servicio</span>
                        </td>
                        <td className="px-6 py-5 text-center text-gray-900 dark:text-white font-black">1</td>
                        <td className="px-6 py-5 text-gray-400 dark:text-surface-500 text-xs font-bold">—</td>
                        <td className="px-6 py-5 text-right">
                          <div className="text-gray-900 dark:text-white font-black tabular-nums">
                            Q{svc.unitPrice.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-[9px] font-bold uppercase tracking-wide text-gray-400 dark:text-surface-500 mt-0.5">
                            {svc.priceIncludesIva
                              ? `Base · de Q${svc.listedPrice.toLocaleString('es-GT', { minimumFractionDigits: 2 })} c/IVA`
                              : 'Sin IVA · +12%'}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <button
                            onClick={() => removeServiceLine(svc.id)}
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
          <div className="border-t border-gray-100 dark:border-surface-800 p-4 md:p-5 bg-white dark:bg-surface-900 shadow-[0_-12px_40px_-16px_rgba(0,0,0,0.12)] transition-all">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-4">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-surface-500">
                <span>Subtotal ({lineCount})</span>
                <span className="text-gray-900 dark:text-white font-black tabular-nums text-sm">Q{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-surface-500">
                <span>IVA 12%</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-black tabular-nums text-sm">Q{formatCurrency(iva)}</span>
              </div>
              <div className="col-span-2 pt-2 border-t border-gray-100 dark:border-surface-800 flex justify-between items-center">
                <span className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Total</span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">Q{formatCurrency(totalWithIva)}</span>
              </div>
            </div>

            <div className="mb-3 space-y-2.5 rounded-xl border border-gray-200 dark:border-surface-700 bg-gray-50 dark:bg-surface-950/60 p-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 dark:text-surface-400 mb-1">
                    Tipo de cliente
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => setIsClienteFinal(true)}
                      className={cn(
                        'px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wide border transition-colors',
                        isClienteFinal
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-white dark:bg-surface-900 border-gray-300 dark:border-surface-600 text-gray-600 dark:text-surface-300'
                      )}
                    >
                      CF
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsClienteFinal(false)}
                      className={cn(
                        'px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wide border transition-colors',
                        !isClienteFinal
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-white dark:bg-surface-900 border-gray-300 dark:border-surface-600 text-gray-600 dark:text-surface-300'
                      )}
                    >
                      NIT / Factura
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 dark:text-surface-400 mb-1">
                    Forma de pago
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {PAYMENT_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPaymentMethod(opt.id)}
                        className={cn(
                          'px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wide border transition-colors',
                          paymentMethod === opt.id
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-white dark:bg-surface-900 border-gray-300 dark:border-surface-600 text-gray-600 dark:text-surface-300'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                    {paymentMethod === 'visacuota' && (
                      <select
                        value={visacuotaCuotas}
                        onChange={(e) => setVisacuotaCuotas(Number(e.target.value))}
                        className="h-7 rounded-md border border-gray-300 dark:border-surface-700 bg-white dark:bg-surface-950 px-1.5 text-[10px] font-bold text-gray-900 dark:text-white"
                      >
                        {VISACUOTA_CUOTAS.map((n) => (
                          <option key={n} value={n}>
                            {n} cuotas
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {!selectedCustomer && (
                <div className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-300">
                    Agregar nombre de cliente
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      value={quickClientName}
                      onChange={(e) => setQuickClientName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          void saveQuickClientName()
                        }
                      }}
                      placeholder="Nombre o razón social"
                      className="flex-1 rounded-xl border border-gray-300 dark:border-surface-700 bg-white dark:bg-surface-950 px-3 py-2 text-sm font-bold text-gray-900 dark:text-white"
                    />
                    {!isClienteFinal && (
                      <input
                        value={quickClientNit}
                        onChange={(e) => setQuickClientNit(e.target.value)}
                        placeholder="NIT"
                        className="sm:w-36 rounded-xl border border-gray-300 dark:border-surface-700 bg-white dark:bg-surface-950 px-3 py-2 text-sm font-bold text-gray-900 dark:text-white font-mono"
                      />
                    )}
                    <button
                      type="button"
                      disabled={savingQuickClient || !quickClientName.trim()}
                      onClick={() => void saveQuickClientName()}
                      className="rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-white"
                    >
                      {savingQuickClient ? '…' : 'Guardar'}
                    </button>
                  </div>
                  <p className="text-[10px] text-amber-700/80 dark:text-amber-200/70">
                    {isClienteFinal
                      ? 'Se guarda como Consumidor Final (CF).'
                      : 'Se guarda con el NIT indicado para facturación.'}
                  </p>
                </div>
              )}

              {selectedCustomer && (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 truncate">
                      {selectedCustomer.commercial_name}
                    </p>
                    <p className="text-[10px] font-mono text-emerald-600/80 dark:text-emerald-400/70">
                      {selectedCustomer.tax_id_nit || 'CF'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(null)}
                    className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-300 hover:underline shrink-0"
                  >
                    Cambiar
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 dark:text-surface-400 mb-1">
                    Invoice
                  </p>
                  <input
                    value={saleInvoiceNumber}
                    onChange={(e) => setSaleInvoiceNumber(e.target.value)}
                    placeholder="Opcional · auto FACT-…"
                    className="w-full rounded-lg border border-gray-300 dark:border-surface-700 bg-white dark:bg-surface-950 px-2.5 py-1.5 text-xs font-bold font-mono text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 dark:text-surface-400 mb-1">
                    Factura SAT
                  </p>
                  <input
                    value={saleSatInvoiceNumber}
                    onChange={(e) => setSaleSatInvoiceNumber(e.target.value)}
                    placeholder="Nº FEL / DTE SAT"
                    className="w-full rounded-lg border border-sky-400/50 dark:border-sky-500/40 bg-white dark:bg-surface-950 px-2.5 py-1.5 text-xs font-bold font-mono text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 dark:text-surface-400 mb-1">
                  Nota · detalle en política de garantía
                </p>
                <textarea
                  value={saleNotes}
                  onChange={(e) => setSaleNotes(e.target.value)}
                  rows={3}
                  placeholder="Ej.: rayón en tapa, tecla Fn floja, batería ~2 h, sin cargador original…"
                  className="w-full rounded-lg border border-gray-300 dark:border-surface-700 bg-white dark:bg-surface-950 px-2.5 py-1.5 text-xs font-medium text-gray-900 dark:text-white resize-none"
                />
              </div>
            </div>

            <button
              onClick={handleProcessSale}
              disabled={lineCount === 0 || !selectedCustomer || isProcessing}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-100 dark:disabled:bg-surface-800 disabled:text-gray-400 dark:disabled:text-surface-600 disabled:cursor-not-allowed text-white py-3.5 rounded-2xl font-black uppercase text-xs tracking-[0.15em] transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Cerrando factura...
                </>
              ) : (
                <>
                  <CheckCircle className="w-6 h-6" />
                  Finalizar venta · Descargar política PDF
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

      {/* Nuevo cliente */}
      {isNewClientOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-300 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 bg-emerald-600 px-4 py-3 text-white">
              <p className="text-sm font-black uppercase tracking-wide">Nuevo cliente</p>
              <button type="button" onClick={() => setIsNewClientOpen(false)} className="rounded p-1 hover:bg-white/20">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 p-4 bg-white text-black">
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase text-gray-800">Nombre o razón social</label>
                <input
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full rounded-lg border-2 border-gray-400 bg-white px-3 py-2 text-sm font-bold text-black"
                  placeholder="Ej. Empresa SA"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase text-gray-800">NIT</label>
                <input
                  value={newClientNit}
                  onChange={(e) => setNewClientNit(e.target.value)}
                  className="w-full rounded-lg border-2 border-gray-400 bg-white px-3 py-2 text-sm font-bold text-black"
                  placeholder="CF o NIT"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase text-gray-800">Teléfono</label>
                <input
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  className="w-full rounded-lg border-2 border-gray-400 bg-white px-3 py-2 text-sm font-bold text-black"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase text-gray-800">Correo</label>
                <input
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  className="w-full rounded-lg border-2 border-gray-400 bg-white px-3 py-2 text-sm font-bold text-black"
                />
              </div>
              {clientFormError && <p className="text-xs font-bold text-rose-700">{clientFormError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewClientOpen(false)}
                  className="rounded-lg border-2 border-gray-500 px-3 py-2 text-xs font-bold text-black"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={savingClient}
                  onClick={() => void handleCreateClient()}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-black uppercase text-white disabled:opacity-50"
                >
                  {savingClient ? 'Guardando…' : 'Guardar cliente'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ivaPrompt && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-3xl border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-2xl overflow-hidden">
            <div className="bg-emerald-700 px-6 py-4 text-white">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Precio e IVA</p>
              <p className="text-lg font-black truncate">
                {ivaPrompt.asset.manufacturer} {ivaPrompt.asset.model}
              </p>
              <p className="font-mono text-sm opacity-90">
                {ivaPrompt.asset.serial_number || ivaPrompt.asset.internal_tag}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-surface-400 mb-2">
                  Precio a cobrar (Q)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  autoFocus
                  value={ivaPrompt.inputPrice}
                  onChange={(e) =>
                    setIvaPrompt((prev) =>
                      prev
                        ? { ...prev, inputPrice: Math.max(0, Number(e.target.value) || 0) }
                        : prev
                    )
                  }
                  className="w-full rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/40 dark:bg-surface-950 px-4 py-3 text-2xl font-black text-gray-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
                <p className="mt-2 text-[10px] font-bold text-emerald-700 dark:text-emerald-400/90">
                  Este monto se guarda como precio de venta (P. base) en Bodega Remarketing.
                </p>
              </div>
              <p className="text-xs font-bold text-gray-600 dark:text-surface-300">
                ¿Este precio ya incluye IVA (12%)?
              </p>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => confirmIvaPrompt(true)}
                  className="rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 text-left transition-colors"
                >
                  <span className="block text-sm font-black uppercase tracking-wide">Sí · IVA incluido</span>
                  <span className="block text-[11px] opacity-90 mt-0.5">
                    Total cliente Q{formatCurrency(ivaPrompt.inputPrice)} · base Q
                    {formatCurrency(toBasePrice(ivaPrompt.inputPrice, true))} + IVA Q
                    {formatCurrency(roundMoney(ivaPrompt.inputPrice - toBasePrice(ivaPrompt.inputPrice, true)))}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => confirmIvaPrompt(false)}
                  className="rounded-2xl bg-amber-600 hover:bg-amber-500 text-white px-4 py-3 text-left transition-colors"
                >
                  <span className="block text-sm font-black uppercase tracking-wide">No · sumar IVA 12%</span>
                  <span className="block text-[11px] opacity-90 mt-0.5">
                    Base Q{formatCurrency(ivaPrompt.inputPrice)} + IVA Q
                    {formatCurrency(roundMoney(ivaPrompt.inputPrice * IVA_RATE))} = Total Q
                    {formatCurrency(roundMoney(ivaPrompt.inputPrice * (1 + IVA_RATE)))}
                  </span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setIvaPrompt(null)}
                className="w-full rounded-xl border border-gray-300 dark:border-surface-600 py-2.5 text-xs font-black uppercase tracking-wider text-gray-600 dark:text-surface-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
