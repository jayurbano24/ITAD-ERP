# ITAD ERP Guatemala 🇬🇹

Sistema ERP para gestión de activos ITAD y reciclaje electrónico.  
Cumplimiento normativa **R2v3** | ISO 14001 | NIST 800-88

## 🚀 Inicio Rápido

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Configurar Variables de Entorno

Crear archivo `.env.local` en la raíz del proyecto:

```env
# URL de tu proyecto Supabase
NEXT_PUBLIC_SUPABASE_URL=https://lnuduhpsmdqjwyhhirba.supabase.co

# Clave anónima pública (obtener de Supabase Dashboard > Settings > API)
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui

# URL de la aplicación
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> ⚠️ **Importante:** La `ANON_KEY` se obtiene desde el Dashboard de Supabase:  
> Settings > API > Project API keys > `anon` `public`

### 3. Iniciar Servidor de Desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

## 📁 Estructura del Proyecto

```
src/
├── app/
│   ├── globals.css      # Estilos globales + Tailwind
│   ├── layout.tsx       # Layout principal
│   └── page.tsx         # Página de Login
├── lib/
│   ├── supabase/
│   │   ├── client.ts    # Cliente Supabase (navegador)
│   │   ├── server.ts    # Cliente Supabase (servidor)
│   │   └── types.ts     # Tipos TypeScript de la BD
│   └── utils.ts         # Utilidades (cn, formatDate, etc.)
└── middleware.ts        # Middleware de autenticación
```

## 🛠️ Stack Tecnológico

- **Framework:** Next.js 14 (App Router)
- **Estilos:** Tailwind CSS
- **Iconos:** Lucide React
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Deploy:** Vercel

## 📋 Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia servidor de desarrollo |
| `npm run build` | Compila para producción |
| `npm run start` | Inicia servidor de producción |
| `npm run lint` | Ejecuta linter ESLint |

## 🔐 Roles del Sistema

| Rol | Permisos |
|-----|----------|
| `super_admin` | Acceso total |
| `account_manager` | Gestión de clientes y tickets |
| `logistics` | Recepción y movimiento de activos |
| `tech_lead` | Diagnóstico y borrado de datos |
| `sales_agent` | Ventas y cotizaciones |
| `client_b2b` | Solo ver sus propios activos |

## 📦 Deploy en Vercel

1. Conectar repositorio con Vercel
2. Configurar variables de entorno en Vercel Dashboard
3. Deploy automático en cada push a `main`

---

**ITAD ERP Guatemala** © 2024

