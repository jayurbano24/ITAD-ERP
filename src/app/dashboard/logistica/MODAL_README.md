# Modal de Gestión de Tickets - Sistema de Logística

## 📋 Descripción

Sistema de modales reutilizables para la gestión de tickets de logística con interfaz moderna y funcionalidades completas.

## 🎯 Características

### Modal Principal
- ✅ **Overlay oscuro con blur** para mejor experiencia visual
- ✅ **Responsive design** que se adapta a diferentes tamaños de pantalla
- ✅ **Animaciones suaves** al abrir/cerrar (fade in/out)
- ✅ **Cierre al hacer clic fuera** del modal
- ✅ **Botón X** para cierre manual
- ✅ **Validación de datos** antes de iniciar carga
- ✅ **Manejo de errores** con mensajes claros

### Funcionalidades del Sistema
- 📊 **Información completa del ticket** (ID, cliente, unidades, fecha, estado)
- 📦 **Gestión de equipos** con tabla interactiva
- 👤 **Asignación de recolector** con opción de recolectar sin nombre
- 📝 **Notas adicionales** para observaciones especiales
- ✅ **Validaciones inteligentes** antes de procesar

## 📁 Estructura de Archivos

```
src/app/dashboard/logistica/
├── components/
│   ├── Modal.tsx                    # Modal reutilizable base
│   ├── TicketManagementModal.tsx    # Modal específico para tickets
│   ├── TicketTableWithModal.tsx     # Ejemplo de integración
│   └── LogisticaModule.tsx          # Módulo principal (existente)
├── hooks/
│   └── useModal.ts                  # Hook personalizado para manejo de estado
├── types/
│   └── modal.ts                     # Tipos TypeScript
└── README.md                        # Este archivo
```

## 🚀 Instalación y Uso

### 1. Importar componentes necesarios

```typescript
import { useModal } from '../hooks/useModal'
import { TicketManagementModal } from '../components/TicketManagementModal'
import type { TicketData } from '../types/modal'
```

### 2. Configurar el hook del modal

```typescript
const ticketModal = useModal<TicketData>()
```

### 3. Integrar en la tabla

```typescript
// En el botón de acción
<button
  onClick={() => ticketModal.open(ticketData)}
  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-lg"
>
  Gestionar
</button>

// Al final del componente
<TicketManagementModal
  isOpen={ticketModal.isOpen}
  onClose={ticketModal.close}
  ticket={ticketModal.data!}
  onStartLoading={() => handleStartLoading(ticketModal.data!)}
/>
```

## 🎨 Personalización

### Colores y Estilos

El sistema usa una paleta de colores oscura con acentos verdes:

```css
/* Fondo principal */
--bg-primary: #0a0e1a;

/* Verde principal (botones, acentos) */
--primary-green: #10b981;

/* Bordes y grises */
--border-color: #374151;
--gray-800: #1f2937;
--gray-700: #374151;
```

### Tamaños del Modal

```typescript
<Modal maxWidth="sm">  {/* max-w-sm */}
<Modal maxWidth="md">  {/* max-w-md */}
<Modal maxWidth="lg">  {/* max-w-lg */}
<Modal maxWidth="xl">  {/* max-w-xl */}
<Modal maxWidth="2xl"> {/* max-w-2xl (default) */}
```

## 🔧 Tipos TypeScript

### TicketData
```typescript
interface TicketData {
  id: string
  client: string
  description?: string
  status: 'Pendiente' | 'Completado' | 'En Progreso'
  date: string
  receivedUnits: number
  totalUnits: number
  items?: TicketItem[]
}
```

### TicketItem
```typescript
interface TicketItem {
  id: string
  brandName?: string
  modelName?: string
  productTypeName?: string
  expectedQuantity: number
  receivedQuantity?: number
}
```

## 📱 Ejemplo de Uso Completo

```typescript
import React from 'react'
import { useModal } from '../hooks/useModal'
import { TicketManagementModal } from '../components/TicketManagementModal'

const MyTicketPage: React.FC = () => {
  const ticketModal = useModal<TicketData>()

  const handleStartLoading = (ticket: TicketData) => {
    // Lógica para iniciar la carga de equipos
    console.log('Iniciando carga para:', ticket.id)
    // Redireccionar o procesar el ticket
  }

  return (
    <div>
      {/* Tu tabla o lista de tickets */}
      <button onClick={() => ticketModal.open(ticketData)}>
        Gestionar Ticket
      </button>

      {/* Modal */}
      <TicketManagementModal
        isOpen={ticketModal.isOpen}
        onClose={ticketModal.close}
        ticket={ticketModal.data!}
        onStartLoading={() => handleStartLoading(ticketModal.data!)}
      />
    </div>
  )
}
```

## 🎯 Funcionalidades Detalladas

### 1. Gestión de Equipos
- ✅ **Tabla interactiva** con información completa
- ✅ **Botón de eliminar** para cada equipo
- ✅ **Contadores** de cantidad esperada vs recibida
- ✅ **Visualización** de marca, modelo y tipo

### 2. Asignación de Recolector
- ✅ **Checkbox** para recolectar sin nombre
- ✅ **Formulario expandido** para datos del recolector
- ✅ **Validación** de datos requeridos
- ✅ **Campos**: Nombre, Teléfono, Vehículo, Placa

### 3. Validaciones
- ✅ **Recolector asignado** o marcado "sin nombre"
- ✅ **Al menos un equipo** en la lista
- ✅ **Mensajes de error** claros y específicos

### 4. Estados Visuales
- ✅ **Badges de estado** con colores diferenciados
- ✅ **Indicadores de progreso** (unidades recibidas/total)
- ✅ **Animaciones** suaves en todas las interacciones
- ✅ **Hover states** en todos los elementos interactivos

## 🔍 Debugging y Troubleshooting

### Problemas Comunes

1. **Modal no abre**
   - Verificar que `ticketModal.data` no sea null
   - Revisar que el componente esté importado correctamente

2. **Errores de TypeScript**
   - Asegurarse de importar los tipos desde `../types/modal`
   - Verificar que los datos del ticket cumplan con la interfaz `TicketData`

3. **Estilos no aplicados**
   - Confirmar que Tailwind CSS esté configurado
   - Revisar las clases CSS en los componentes

### Console Logs para Debug

```typescript
// En el hook useModal
console.log('Modal state:', { isOpen, data })

// En el componente principal
console.log('Ticket data:', ticketModal.data)
```

## 🚀 Mejoras Futuras

- [ ] **Autocompletado** de datos de recolectores frecuentes
- [ ] **Carga masiva** de equipos desde archivo CSV
- [ ] **Fotos** de los equipos
- [ ] **Firma digital** del recolector
- [ ] **Notificaciones** en tiempo real
- [ ] **Historial** de cambios del ticket

## 📞 Soporte

Para cualquier problema o sugerencia, contactar al equipo de desarrollo.

---

**Versión**: 1.0.0  
**Última actualización**: Enero 2026  
**Tecnologías**: React 18+, Next.js 14+, TypeScript, Tailwind CSS
