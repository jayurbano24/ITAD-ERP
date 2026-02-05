# Equipment Loading Modal

Modal full-screen para "Iniciar carga de equipos" en el sistema de logística.

## 🎯 Características

### Diseño
- **Full-screen**: Modal que ocupa toda la pantalla
- **Header**: Botón volver, info del ticket, número de caja
- **Sidebar izquierdo**: Información del ticket y responsable
- **Área principal**: Formulario de carga de equipos
- **Tema oscuro**: Esquema de colores oscuro con acentos verdes y morados

### Funcionalidades
- ✅ **Formulario completo**: Tipo producto, marca, modelo, cantidad
- ✅ **Validaciones**: Campos obligatorios y límites
- ✅ **Notificaciones**: Feedback visual para el usuario
- ✅ **Responsive**: Adaptado para móviles con sidebar deslizante
- ✅ **Keyboard shortcuts**: Cerrar con ESC
- ✅ **Gestión de equipos**: Agregar y eliminar equipos de la caja

## 📱 Responsive Design

### Desktop (>768px)
- Sidebar fijo de 300px
- Header con navegación completa
- Área principal con formulario completo

### Móvil (<768px)
- Sidebar deslizante con overlay
- Botón hamburguesa para menú
- Header optimizado con texto truncado
- Botón volver dentro del sidebar

## 🎨 Estilos

### Colores
- **Background primario**: `#0a0a0a`
- **Cards**: `#141414`
- **Inputs**: `#1a1a1a`
- **Bordes**: `#2a2a2a`
- **Acento verde**: `#10b981` (emerald-500)
- **Acento morado**: `#8b5cf6` (purple-600)

### Tipografía
- **Títulos**: Outfit (font-bold)
- **Labels**: Uppercase, tracking-widest
- **Textos**: System fonts

### Animaciones
- **Fade in**: Entrada suave del modal
- **Slide in**: Notificaciones desde abajo
- **Transform**: Sidebar móvil deslizante

## 🔧 Uso

### Importación
```tsx
import { EquipmentLoadingModal } from './EquipmentLoadingModal'
```

### Estado requerido
```tsx
const [equipmentLoadingModalOpen, setEquipmentLoadingModalOpen] = useState(false)
```

### Props
```tsx
interface EquipmentLoadingModalProps {
  isOpen: boolean
  onClose: () => void
  ticketId: string
  clientName: string
  location: string
  currentBoxNumber: number
  totalBoxes: number
  totalUnits: number
  responsibleName: string
  responsibleType: string
  vehicleModel: string
  vehiclePlate: string
  onFinalizeLogistics: (equipmentData: any[]) => void
}
```

### Ejemplo de implementación
```tsx
<EquipmentLoadingModal
  isOpen={equipmentLoadingModalOpen}
  onClose={() => setEquipmentLoadingModalOpen(false)}
  ticketId={ticket.id}
  clientName={ticket.client || 'Sin cliente'}
  location={ticket.location || 'Sin ubicación'}
  currentBoxNumber={currentBox.boxNumber}
  totalBoxes={boxes.length}
  totalUnits={ticket.totalUnits || 0}
  responsibleName={collectorName || 'Sin asignar'}
  responsibleType={collector || 'Internas'}
  vehicleModel={vehicleModel || 'Sin vehículo'}
  vehiclePlate={vehiclePlate || 'Sin placa'}
  onFinalizeLogistics={handleFinalizeLogisticsFromModal}
/>
```

## 📋 Formulario

### Campos
1. **Tipo de Producto** (requerido)
   - Desktop
   - Laptop
   - Monitor
   - Periférico
   - Servidor

2. **Marca** (requerido)
   - Dell
   - HP
   - Lenovo
   - Apple
   - Asus

3. **Modelo** (requerido, depende de marca)
   - Se actualiza dinámicamente según marca seleccionada

4. **Cantidad** (número, mínimo 1)
   - Validación automática

### Validaciones
- Todos los campos obligatorios deben estar completos
- La cantidad debe ser mayor a 0
- Se muestran notificaciones de error/amistoso

## 🔄 Flujo de Usuario

1. **Apertura**: Usuario hace clic en "Iniciar carga de equipos"
2. **Carga**: Modal se abre con información del ticket
3. **Formulario**: Usuario completa datos del equipo
4. **Validación**: Sistema verifica campos obligatorios
5. **Agregar**: Equipo se añade a la lista de la caja
6. **Finalización**: Usuario finaliza logística o cierra modal

## 🎯 Interacciones

### Teclado
- **ESC**: Cerrar modal
- **Tab**: Navegación entre campos
- **Enter**: Submit de formulario

### Mouse/Touch
- **Click fuera**: No cierra (modal full-screen)
- **Botón Volver**: Cierra modal
- **Botón Agregar**: Añade equipo a la lista
- **Botón Finalizar**: Completa el proceso

### Móvil
- **Menú hamburguesa**: Abre/cierra sidebar
- **Overlay**: Cierra sidebar al tocar fuera
- **Deslizamiento**: Sidebar con animación suave

## 📊 Datos

### Estructura del equipo
```tsx
{
  id: number,
  productType: string,
  brand: string,
  model: string,
  quantity: number,
  timestamp: string
}
```

### Callback de finalización
```tsx
onFinalizeLogistics: (equipmentData: any[]) => {
  // Procesar datos de equipos
  // Actualizar estado de la aplicación
  // Navegar a siguiente vista
}
```

## 🛠️ Personalización

### Colores
Modificar variables CSS en `EquipmentLoadingModal.css`:
```css
:root {
  --bg-primary: #0a0a0a;
  --bg-card: #141414;
  --bg-input: #1a1a1a;
  --border-color: #2a2a2a;
  --accent-green: #10b981;
  --accent-purple: #8b5cf6;
}
```

### Modelos por marca
Extender el objeto `getModelOptions()`:
```tsx
const getModelOptions = () => {
  const models = {
    'Dell': ['OptiPlex 7090', 'Latitude 5420', ...],
    'HP': ['EliteBook 840 G8', 'ProBook 450 G9', ...],
    // Agregar más marcas y modelos
  }
  return models[formData.brand] || []
}
```

## 🚀 Mejoras Futuras

- [ ] Carga de imágenes de equipos
- [ ] Códigos QR para equipos
- [ ] Búsqueda avanzada de modelos
- [ ] Historial de cajas anteriores
- [ ] Exportación a PDF/Excel
- [ ] Integración con API de inventario
- [ ] Modo offline con sincronización
- [ ] Cámara para escanear seriales

## 📝 Notas

- El modal es full-screen para mejor experiencia en tablets
- El sidebar móvil usa transform para mejor performance
- Las notificaciones tienen auto-dismiss después de 3 segundos
- El formulario se resetea automáticamente después de agregar equipo
- El número de caja se genera automáticamente con padding de 5 dígitos
