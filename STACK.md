# VegasDelRio — Documento de Arquitectura

> **Versión:** 1.0.0
> **Última actualización:** 22 de febrero de 2026
> **Autor:** Equipo VegasDelRio

---

## 1. Visión General

**VegasDelRio** es un sistema de gestión para un conjunto residencial de casas que digitaliza el proceso de cobro de administración. Reemplaza los recibos físicos por facturas digitales enviadas por correo electrónico (con capacidad futura de WhatsApp, Telegram, etc.) y sienta las bases para integrar pasarelas de pago colombianas (PSE, Nequi, Wompi, ePayco, MercadoPago).

### 1.1 Objetivos del Sistema

| Objetivo | Descripción |
|----------|-------------|
| **Digitalización** | Eliminar recibos en papel mediante generación automática de PDFs |
| **Automatización** | Envío masivo de cobros mensuales por email |
| **Trazabilidad** | Historial completo de cobros, pagos y notificaciones |
| **Escalabilidad** | Arquitectura preparada para pasarelas de pago y múltiples canales de notificación |
| **Seguridad** | Autenticación JWT, Row Level Security (RLS) y separación de claves públicas/privadas |

---

## 2. Arquitectura General

El sistema sigue un patrón de **Arquitectura Orientada a Servicios (SOA) Modular** organizado como un **monorepo políglota**.

```
┌─────────────────────────────────────────────────────────────────┐
│                        USUARIO / ADMIN                          │
│                     (Navegador Web / Móvil)                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────────────┐
│              CAPA DE PRESENTACIÓN (Frontend)                    │
│                                                                 │
│  Next.js 15 (App Router) + TypeScript + Tailwind CSS            │
│  Shadcn/UI + TanStack Query v5                                  │
│  Supabase Auth (JWT via cookies)                                │
│                                                                 │
│  Puerto: 3001 (desarrollo)                                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST API (JSON)
                           │ Authorization: Bearer <JWT>
┌──────────────────────────▼──────────────────────────────────────┐
│                CAPA DE NEGOCIO (Backend)                         │
│                                                                 │
│  FastAPI (Python 3.11+) + Pydantic v2                           │
│  SQLAlchemy 2.0+ (async) + asyncpg                              │
│  Jinja2 (plantillas HTML) + WeasyPrint (PDFs)                   │
│                                                                 │
│  Puerto: 8000 (desarrollo)                                      │
└───────┬─────────────────────────────────┬───────────────────────┘
        │ SQL (async)                     │ Tareas async
┌───────▼───────────┐          ┌──────────▼──────────────────────┐
│   CAPA DE DATOS   │          │  PROCESAMIENTO EN SEGUNDO PLANO │
│                   │          │                                  │
│  Supabase Cloud   │          │  Celery + Redis (broker)         │
│  PostgreSQL 15    │          │  Tareas: generar PDF, enviar     │
│  Supavisor Pooler │          │  email, notificaciones masivas   │
│  RLS habilitado   │          │                                  │
│                   │          │  Pool: solo (Windows)            │
│  Puerto: 6543     │          │  Puerto Redis: 6379              │
│  (Transaction)    │          │                                  │
│  Puerto: 5432     │          └──────────┬───────────────────────┘
│  (Session/Migr.)  │                     │
└───────────────────┘          ┌──────────▼───────────────────────┐
                               │    SERVICIOS EXTERNOS            │
                               │                                  │
                               │  Email: SMTP / Resend / SendGrid │
                               │  Pago:  Wompi / ePayco (futuro)  │
                               │  Msg:   WhatsApp API (futuro)    │
                               └──────────────────────────────────┘
```

---

## 3. Stack Tecnológico

### 3.1 Frontend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Next.js** | 15+ (App Router) | Framework React con SSR/SSG, routing basado en archivos |
| **TypeScript** | 5+ | Tipado estático para prevenir errores en tiempo de compilación |
| **Tailwind CSS** | 3.4+ | Utilidades CSS para diseño responsive sin escribir CSS manual |
| **Shadcn/UI** | latest | Componentes accesibles copiados al proyecto (no dependencia externa) |
| **TanStack Query** | v5 | Gestión de estado del servidor, caché, reintentos automáticos |
| **Axios** | 1.7+ | Cliente HTTP con interceptores para JWT automático |
| **Supabase SSR** | latest | Auth helpers para Next.js (cookies httpOnly) |
| **Lucide React** | latest | Iconografía consistente |
| **Sonner** | latest | Notificaciones toast |

### 3.2 Backend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Python** | 3.11+ | Lenguaje principal del backend |
| **FastAPI** | 0.110+ | Framework API REST con documentación automática (Swagger) |
| **Pydantic** | v2 | Validación estricta de datos de entrada/salida |
| **SQLAlchemy** | 2.0+ | ORM asíncrono para interacción con PostgreSQL |
| **asyncpg** | latest | Driver PostgreSQL asíncrono de alto rendimiento |
| **psycopg2-binary** | latest | Driver síncrono para migraciones (Alembic) |
| **Alembic** | latest | Migraciones de base de datos versionadas |
| **WeasyPrint** | latest | Generación de PDFs desde plantillas HTML/CSS |
| **Jinja2** | latest | Motor de plantillas para recibos HTML |
| **Celery** | 5.3+ | Cola de tareas asíncronas (envío masivo, PDFs) |
| **Redis** | 7+ | Broker de mensajería para Celery |
| **python-jose** | latest | Verificación de tokens JWT de Supabase |
| **httpx** | latest | Cliente HTTP async para llamar Supabase desde Python |

### 3.3 Base de Datos y Autenticación

| Tecnología | Propósito |
|------------|-----------|
| **Supabase** | Plataforma BaaS (PostgreSQL + Auth + Storage) |
| **PostgreSQL 15** | Base de datos relacional principal |
| **Supavisor** | Connection pooler de Supabase |
| **Supabase Auth** | Autenticación con JWT (email/password) |
| **Row Level Security (RLS)** | Seguridad a nivel de fila (futuro portal residente) |

### 3.4 Infraestructura y Servicios Externos

| Servicio | Propósito | Estado |
|----------|-----------|--------|
| **Redis (local)** | Broker para Celery | ✅ Activo |
| **SMTP / Resend / SendGrid** | Envío de correos transaccionales | 🔜 Pendiente |
| **Wompi / ePayco / MercadoPago** | Pasarelas de pago (PSE, Nequi) | 🔮 Futuro |
| **WhatsApp Business API** | Notificaciones por WhatsApp | 🔮 Futuro |
| **Telegram Bot API** | Notificaciones por Telegram | 🔮 Futuro |

---

## 4. Estructura del Proyecto

```
VegasDelRio/
│
├── apps/
│   ├── backend/                          # ── API Python (FastAPI) ──
│   │   ├── alembic/                      # Migraciones de BD
│   │   │   ├── env.py                    # Config de Alembic (lee DATABASE_URL_DIRECT)
│   │   │   ├── script.py.mako           # Plantilla de migración
│   │   │   └── versions/                # Archivos de migración generados
│   │   │
│   │   ├── app/
│   │   │   ├── api/                      # Capa de API
│   │   │   │   └── v1/
│   │   │   │       ├── router.py         # Router principal (agrupa endpoints)
│   │   │   │       └── endpoints/        # Endpoints por dominio
│   │   │   │           ├── properties.py # CRUD de casas
│   │   │   │           ├── owners.py     # CRUD de propietarios
│   │   │   │           └── billing.py    # Periodos y facturas
│   │   │   │
│   │   │   ├── core/                     # Configuración central
│   │   │   │   ├── config.py             # Settings (Pydantic BaseSettings)
│   │   │   │   └── security.py           # Verificación JWT de Supabase
│   │   │   │
│   │   │   ├── db/                       # Capa de datos
│   │   │   │   ├── base.py               # DeclarativeBase de SQLAlchemy
│   │   │   │   └── session.py            # AsyncSession + engine factory
│   │   │   │
│   │   │   ├── models/                   # Modelos SQLAlchemy (tablas)
│   │   │   │   ├── __init__.py           # Exporta todos los modelos
│   │   │   │   ├── owner.py              # owners
│   │   │   │   ├── property.py           # properties
│   │   │   │   ├── property_owner.py     # property_owners (M:N)
│   │   │   │   ├── billing_period.py     # billing_periods
│   │   │   │   ├── bill.py               # bills (facturas)
│   │   │   │   ├── bill_item.py          # bill_items (conceptos)
│   │   │   │   └── notification_log.py   # notification_logs (auditoría)
│   │   │   │
│   │   │   ├── schemas/                  # Esquemas Pydantic (validación)
│   │   │   │   ├── property.py           # PropertyCreate, PropertyUpdate, PropertyOut
│   │   │   │   ├── owner.py
│   │   │   │   ├── billing.py
│   │   │   │   └── common.py             # Esquemas compartidos (paginación, etc.)
│   │   │   │
│   │   │   ├── services/                 # Lógica de negocio
│   │   │   │   ├── pdf_service.py        # Generación de recibos PDF
│   │   │   │   └── email_service.py      # Envío de correos
│   │   │   │
│   │   │   ├── tasks/                    # Tareas Celery
│   │   │   │   ├── celery_app.py         # Configuración de Celery
│   │   │   │   └── billing_tasks.py      # Tareas de facturación masiva
│   │   │   │
│   │   │   ├── templates/                # Plantillas HTML
│   │   │   │   └── bill_receipt.html     # Recibo de cobro (Jinja2 → PDF)
│   │   │   │
│   │   │   └── main.py                   # Punto de entrada FastAPI
│   │   │
│   │   ├── alembic.ini                   # Config de Alembic
│   │   ├── requirements.txt              # Dependencias Python
│   │   ├── .env                          # Variables de entorno (NO en Git)
│   │   └── .env.example                  # Plantilla de variables
│   │
│   └── frontend/                         # ── Panel Web (Next.js) ──
│       ├── src/
│       │   ├── app/                      # App Router
│       │   │   ├── (auth)/               # Grupo de rutas públicas
│       │   │   │   └── login/
│       │   │   │       └── page.tsx      # Página de login
│       │   │   │
│       │   │   ├── (dashboard)/          # Grupo de rutas protegidas
│       │   │   │   └── dashboard/
│       │   │   │       ├── layout.tsx     # Layout con sidebar + header
│       │   │   │       ├── page.tsx       # Dashboard principal
│       │   │   │       ├── properties/   # Gestión de casas
│       │   │   │       ├── owners/       # Gestión de propietarios
│       │   │   │       ├── periods/      # Periodos de cobro
│       │   │   │       ├── bills/        # Facturas
│       │   │   │       └── settings/     # Configuración
│       │   │   │
│       │   │   ├── auth/callback/        # Supabase OAuth callback
│       │   │   ├── layout.tsx            # Layout raíz
│       │   │   ├── page.tsx              # Redirect a /dashboard
│       │   │   └── globals.css           # Estilos globales (Tailwind)
│       │   │
│       │   ├── components/
│       │   │   ├── layout/               # Sidebar, Header
│       │   │   ├── properties/           # Componentes de casas (formularios, etc.)
│       │   │   ├── providers/            # React Query Provider
│       │   │   └── ui/                   # Componentes Shadcn/UI
│       │   │
│       │   ├── hooks/                    # Hooks personalizados
│       │   │
│       │   ├── lib/
│       │   │   ├── api-client.ts         # Axios con JWT automático
│       │   │   ├── services/             # Servicios por dominio
│       │   │   │   └── properties.ts     # API calls de casas
│       │   │   ├── supabase/
│       │   │   │   ├── client.ts         # Supabase browser client
│       │   │   │   └── server.ts         # Supabase server client
│       │   │   └── utils.ts              # Utilidades (cn, formatters)
│       │   │
│       │   ├── types/
│       │   │   └── index.ts              # Tipos TS sincronizados con backend
│       │   │
│       │   └── proxy.ts                  # Protección de rutas (middleware)
│       │
│       ├── public/                       # Assets estáticos
│       ├── .env                          # Variables públicas (NEXT_PUBLIC_*)
│       ├── .env.example
│       ├── package.json
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       └── next.config.ts
│
├── docker-compose.yml                    # Redis para Celery (desarrollo)
├── .gitignore
├── ARCHITECTURE.md                       # ← Este archivo
└── README.md
```

---

## 5. Modelo de Base de Datos

### 5.1 Diagrama Entidad-Relación

```
┌──────────────┐       ┌───────────────────┐       ┌──────────────┐
│   owners     │       │ property_owners   │       │  properties  │
├──────────────┤       ├───────────────────┤       ├──────────────┤
│ PK id (UUID) │◄──┐   │ PK id (UUID)      │   ┌──►│ PK id (UUID) │
│ auth_user_id │   └───│ FK owner_id       │   │   │ number       │
│ full_name    │       │ FK property_id    │───┘   │ address      │
│ id_number    │       │ is_primary        │       │ area_m2      │
│ email        │       │ start_date        │       │ aliquot_pct  │
│ phone        │       │ end_date          │       │ notes        │
│ is_active    │       │ is_active         │       │ is_active    │
│ created_at   │       │ created_at        │       │ created_at   │
│ updated_at   │       │ updated_at        │       │ updated_at   │
└──────────────┘       └───────────────────┘       └──────┬───────┘
                                                          │
                       ┌───────────────────┐              │
                       │ billing_periods   │              │
                       ├───────────────────┤              │
                       │ PK id (UUID)      │              │
                       │ month             │              │
                       │ year              │              │
                       │ base_amount       │              │
                       │ due_date          │              │
                       │ status            │              │
                       │ created_at        │              │
                       │ updated_at        │              │
                       └────────┬──────────┘              │
                                │                         │
                       ┌────────▼──────────────────────────▼──────┐
                       │              bills                       │
                       ├─────────────────────────────────────────┤
                       │ PK id (UUID)                             │
                       │ FK property_id  → properties.id          │
                       │ FK period_id    → billing_periods.id     │
                       │ FK owner_id     → owners.id              │
                       │ total_amount                              │
                       │ status (pending/paid/overdue/cancelled)  │
                       │ pdf_url                                   │
                       │ created_at                                │
                       │ updated_at                                │
                       └────────┬──────────────────────────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                                   │
     ┌────────▼─────────┐              ┌──────────▼───────────┐
     │   bill_items     │              │ notification_logs    │
     ├──────────────────┤              ├──────────────────────┤
     │ PK id (UUID)     │              │ PK id (UUID)         │
     │ FK bill_id       │              │ FK bill_id           │
     │ description      │              │ channel (email/sms)  │
     │ amount           │              │ recipient            │
     │ quantity         │              │ status (sent/failed) │
     │ created_at       │              │ error_message        │
     │                  │              │ sent_at              │
     └──────────────────┘              │ created_at           │
                                       └──────────────────────┘
```

### 5.2 Tablas — Detalle

| # | Tabla | Registros esperados | Propósito |
|---|-------|---------------------|-----------|
| 1 | `owners` | ~50-200 | Propietarios del conjunto (datos personales, contacto) |
| 2 | `properties` | ~50-200 | Casas del conjunto (número, área, alícuota) |
| 3 | `property_owners` | ~50-300 | Relación M:N entre casas y propietarios (con historial) |
| 4 | `billing_periods` | ~12/año | Periodos mensuales de cobro |
| 5 | `bills` | ~600-2400/año | Facturas individuales por casa por periodo |
| 6 | `bill_items` | ~1-5 por factura | Conceptos desglosados (administración, multas, extras) |
| 7 | `notification_logs` | ~600-2400/año | Auditoría de envíos (cada email/WhatsApp enviado) |

### 5.3 Convenciones de Base de Datos

| Convención | Regla | Ejemplo |
|------------|-------|---------|
| **Nombres de tabla** | snake_case, plural | `billing_periods` |
| **Primary Key** | UUID v4, columna `id` | `id UUID DEFAULT gen_random_uuid()` |
| **Foreign Key** | `{tabla_singular}_id` | `property_id`, `owner_id` |
| **Timestamps** | Siempre `created_at` y `updated_at` | `TIMESTAMP WITH TIME ZONE` |
| **Soft Delete** | Campo `is_active` (boolean) en lugar de DELETE | `is_active DEFAULT true` |
| **Índices** | En todas las FK y campos de búsqueda frecuente | `ix_bills_status` |
| **Constraints** | UNIQUE donde aplique | `UNIQUE(month, year)` en `billing_periods` |
| **Enums** | Strings manejados con CHECK constraints | `status IN ('pending', 'paid', ...)` |

---

## 6. Patrones y Convenciones de Código

### 6.1 Backend (Python)

| Aspecto | Convención |
|---------|------------|
| **Estilo** | PEP 8 + Black formatter |
| **Naming** | `snake_case` para variables/funciones, `PascalCase` para clases |
| **Validación** | Toda entrada pasa por esquemas Pydantic antes de llegar al ORM |
| **Respuestas** | Siempre devolver esquemas Pydantic (nunca modelos ORM directamente) |
| **Errores** | `HTTPException` con códigos estándar (400, 401, 403, 404, 422, 500) |
| **Async** | Todas las operaciones de BD usan `async/await` |
| **Inyección** | Dependencias via `Depends()` de FastAPI (session, auth, etc.) |
| **Versionado API** | Prefijo `/api/v1/` — cuando haya breaking changes, crear `/api/v2/` |

#### Estructura de un endpoint típico:

```python
# app/api/v1/endpoints/{dominio}.py

@router.get("/", response_model=list[PropertyOut])
async def list_items(
    db: AsyncSession = Depends(get_session),     # Inyección de BD
    skip: int = Query(0, ge=0),                  # Paginación
    limit: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),            # Filtros opcionales
):
    query = select(Model).where(Model.is_active == True)
    if search:
        query = query.where(Model.field.ilike(f"%{search}%"))
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()
```

### 6.2 Frontend (TypeScript/React)

| Aspecto | Convención |
|---------|------------|
| **Naming archivos** | `kebab-case.tsx` para componentes, `camelCase.ts` para utilidades |
| **Naming componentes** | `PascalCase` | `PropertyForm`, `ConfirmDialog` |
| **Naming hooks** | `use` + `PascalCase` | `useProperties`, `useAuth` |
| **Estado servidor** | TanStack Query (nunca `useState` para datos remotos) |
| **Estado local** | `useState` / `useReducer` solo para UI (modales, formularios) |
| **Formularios** | Estado controlado con `useState` + validación inline |
| **Estilos** | Solo Tailwind CSS (nunca CSS modules ni styled-components) |
| **Imports** | Absolutos desde `@/` (alias configurado en `tsconfig.json`) |
| **Tipos** | Definidos en `src/types/index.ts`, sincronizados con esquemas Pydantic |

#### Estructura de una página típica:

```typescript
// src/app/(dashboard)/dashboard/{dominio}/page.tsx
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { servicio } from "@/lib/services/{dominio}";

export default function DominioPage() {
  const queryClient = useQueryClient();

  // Lectura
  const { data, isLoading } = useQuery({
    queryKey: ["{dominio}", filtros],
    queryFn: () => servicio.list(filtros),
  });

  // Escritura
  const createMutation = useMutation({
    mutationFn: servicio.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["{dominio}"] });
      toast.success("Creado exitosamente");
    },
  });

  // Render
  return ( /* Tabla + Formulario + Acciones */ );
}
```

### 6.3 Servicios del Frontend

```typescript
// src/lib/services/{dominio}.ts

import apiClient from "@/lib/api-client";
import { Tipo, TipoCreate, TipoUpdate } from "@/types";

export const servicioNombre = {
  list:   (params?) => apiClient.get<Tipo[]>("/{dominio}", { params }).then(r => r.data),
  get:    (id: string) => apiClient.get<Tipo>(`/{dominio}/${id}`).then(r => r.data),
  create: (data: TipoCreate) => apiClient.post<Tipo>("/{dominio}", data).then(r => r.data),
  update: (id: string, data: TipoUpdate) => apiClient.put<Tipo>(`/{dominio}/${id}`, data).then(r => r.data),
  delete: (id: string) => apiClient.delete(`/{dominio}/${id}`).then(r => r.data),
};
```

---

## 7. Flujo de Autenticación

```
┌──────────┐     ┌───────────┐     ┌──────────────┐     ┌──────────┐
│ Usuario  │────►│ Login Page│────►│ Supabase Auth│────►│ JWT Token│
│          │     │ (email +  │     │ (verifica    │     │ (cookie  │
│          │     │  password)│     │  credenciales│     │  httpOnly)│
└──────────┘     └───────────┘     └──────────────┘     └─────┬────┘
                                                              │
                                              ┌───────────────▼─────┐
                                              │   proxy.ts          │
                                              │   (Next.js)         │
                                              │                     │
                                              │ ¿Tiene session?     │
                                              │   SÍ → /dashboard   │
                                              │   NO → /login       │
                                              └───────────────┬─────┘
                                                              │
                                              ┌───────────────▼─────┐
                                              │   api-client.ts     │
                                              │   (Axios)           │
                                              │                     │
                                              │ Interceptor:        │
                                              │ Authorization:      │
                                              │ Bearer <JWT>        │
                                              └───────────────┬─────┘
                                                              │
                                              ┌───────────────▼─────┐
                                              │   FastAPI Backend   │
                                              │   security.py       │
                                              │                     │
                                              │ Verifica JWT con    │
                                              │ SUPABASE_JWT_SECRET │
                                              └─────────────────────┘
```

### 7.1 Reglas de Autenticación

| Regla | Implementación |
|-------|----------------|
| Las rutas `/dashboard/*` requieren sesión | `proxy.ts` verifica cookie con `getSession()` |
| Cada request al backend lleva JWT | Interceptor de Axios en `api-client.ts` |
| El backend valida el JWT | `security.py` decodifica con la clave de Supabase |
| Tokens expirados redirigen a login | Respuesta 401 → redirect automático |
| Claves privadas nunca van al frontend | `SUPABASE_SERVICE_ROLE_KEY` solo en backend `.env` |

---

## 8. Flujo de Datos (Ejemplo: Generar Cobros)

```
Admin hace clic en                    FastAPI recibe
"Generar Cobros Febrero"              POST /api/v1/billing/generate
         │                                    │
         │                            Valida periodo y casas
         │                                    │
         │                            Crea registros en tabla
         │                            bills + bill_items
         │                                    │
         │                            Encola tarea Celery:
         │                            generate_and_send_bills
         │                                    │
         │                            Responde 202 Accepted
         │                            { task_id: "abc123" }
         │                                    │
         ▼                                    ▼
Frontend muestra                      Redis recibe tarea
"Procesando..." con                           │
polling del estado                    Celery Worker consume:
         │                            ┌───────▼────────┐
         │                            │ Por cada casa:  │
         │                            │ 1. Render HTML  │
         │                            │    (Jinja2)     │
         │                            │ 2. HTML → PDF   │
         │                            │    (WeasyPrint) │
         │                            │ 3. Upload PDF   │
         │                            │    (Supabase    │
         │                            │     Storage)    │
         │                            │ 4. Enviar email │
         │                            │    con adjunto  │
         │                            │ 5. Log en       │
         │                            │    notification │
         │                            │    _logs        │
         │                            └────────────────┘
         │                                    │
         ▼                                    ▼
Frontend muestra                      Tarea completada
"100 recibos enviados ✅"             status → completed
```

---

## 9. Variables de Entorno

### 9.1 Backend (`apps/backend/.env`)

| Variable | Tipo | Descripción |
|----------|------|-------------|
| `APP_NAME` | string | Nombre de la aplicación |
| `APP_ENV` | string | `development` / `production` |
| `DEBUG` | bool | Modo debug |
| `SECRET_KEY` | string | Clave para firmar tokens internos |
| `API_V1_PREFIX` | string | Prefijo de la API (`/api/v1`) |
| `DATABASE_URL` | string | PostgreSQL async (puerto 6543, Transaction Mode) |
| `DATABASE_URL_DIRECT` | string | PostgreSQL sync (puerto 5432, para migraciones) |
| `SUPABASE_URL` | string | URL del proyecto Supabase |
| `SUPABASE_ANON_KEY` | string | Clave pública de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | **🔒 SECRET** | Clave admin (bypasea RLS) |
| `REDIS_URL` | string | URL de Redis |
| `CELERY_BROKER_URL` | string | Redis como broker de Celery |
| `CELERY_RESULT_BACKEND` | string | Redis para resultados de Celery |
| `EMAIL_PROVIDER` | string | `smtp` o `resend` |
| `SMTP_HOST`, `SMTP_PORT`, etc. | string | Configuración de correo |
| `CORS_ORIGINS` | JSON array | Orígenes permitidos |

### 9.2 Frontend (`apps/frontend/.env`)

| Variable | Tipo | Descripción |
|----------|------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | string | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | string | Clave pública (segura para el browser) |
| `NEXT_PUBLIC_API_URL` | string | URL del backend (`http://localhost:8000/api/v1`) |

### 9.3 Regla de Oro

> ⚠️ **NUNCA** colocar `SUPABASE_SERVICE_ROLE_KEY`, `SECRET_KEY`, `SMTP_PASSWORD` ni cualquier credencial privada en el archivo `.env` del frontend. Las variables `NEXT_PUBLIC_*` son **visibles** en el código JavaScript del navegador.

---

## 10. Comandos de Desarrollo

### 10.1 Backend

```bash
# Entrar al directorio
cd apps/backend

# Activar entorno virtual
.venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Ejecutar servidor de desarrollo
uvicorn app.main:app --reload --port 8000

# Ejecutar Celery Worker (Windows)
celery -A app.tasks.celery_app worker --pool=solo -l info

# Crear migración
alembic revision --autogenerate -m "descripcion del cambio"

# Aplicar migraciones
alembic upgrade head

# Ver documentación API
# http://localhost:8000/docs (Swagger)
# http://localhost:8000/redoc (ReDoc)
```

### 10.2 Frontend

```bash
# Entrar al directorio
cd apps/frontend

# Instalar dependencias
npm install

# Ejecutar servidor de desarrollo
npm run dev

# Build de producción
npm run build

# Verificar tipos
npx tsc --noEmit
```

### 10.3 Redis (Docker)

```bash
# Desde la raíz del proyecto
docker-compose up -d redis

# Verificar que está corriendo
docker-compose ps
```

---

## 11. Guía para Agregar Nuevos Módulos

Cuando necesites agregar una nueva funcionalidad (ej: "Pagos", "Reportes"), sigue esta lista:

### 11.1 Backend

1. **Modelo** → Crear `app/models/{modulo}.py` con la tabla SQLAlchemy
2. **Migración** → `alembic revision --autogenerate -m "add {modulo} table"`
3. **Esquema** → Crear `app/schemas/{modulo}.py` con `Create`, `Update`, `Out`
4. **Endpoint** → Crear `app/api/v1/endpoints/{modulo}.py` con el CRUD
5. **Router** → Registrar en `app/api/v1/router.py`
6. **Servicio** (si aplica) → Crear `app/services/{modulo}_service.py`
7. **Tarea** (si aplica) → Crear tarea en `app/tasks/`

### 11.2 Frontend

1. **Tipos** → Agregar interfaces en `src/types/index.ts`
2. **Servicio** → Crear `src/lib/services/{modulo}.ts`
3. **Página** → Crear `src/app/(dashboard)/dashboard/{modulo}/page.tsx`
4. **Componentes** → Crear en `src/components/{modulo}/`
5. **Sidebar** → Agregar enlace en `src/components/layout/sidebar.tsx`

### 11.3 Checklist Antes de Commit

- [ ] Migración creada y aplicada (`alembic upgrade head`)
- [ ] Endpoint probado en Swagger (`/docs`)
- [ ] Tipos TS sincronizados con esquemas Pydantic
- [ ] Página accesible desde el sidebar
- [ ] Sin credenciales expuestas en el código
- [ ] Sin `console.log` olvidados en producción

---

## 12. Consideraciones de Seguridad

| Capa | Medida | Estado |
|------|--------|--------|
| **Frontend** | Solo claves públicas en `.env` | ✅ Implementado |
| **Frontend** | Protección de rutas con `proxy.ts` | ✅ Implementado |
| **Backend** | JWT verificado en cada request | ✅ Implementado |
| **Backend** | Validación estricta con Pydantic | ✅ Implementado |
| **Backend** | CORS restringido a orígenes conocidos | ✅ Implementado |
| **BD** | Conexión via pooler (Supavisor) | ✅ Implementado |
| **BD** | Soft delete (nunca DELETE real) | ✅ Implementado |
| **BD** | Row Level Security (RLS) | 🔜 Cuando haya portal residente |
| **Infra** | HTTPS en producción | 🔜 Deploy |
| **Infra** | Rate limiting | 🔜 Futuro |
| **Pagos** | Webhooks con firma verificada | 🔮 Futuro |

---

## 13. Roadmap Técnico

| Fase | Funcionalidad | Estado |
|------|---------------|--------|
| **MVP** | CRUD de Casas | ✅ Completo |
| **MVP** | CRUD de Propietarios | 🔜 Próximo |
| **MVP** | Periodos de Cobro | 🔜 Próximo |
| **MVP** | Generación de Facturas PDF | 🔜 Próximo |
| **MVP** | Envío masivo por Email | 🔜 Próximo |
| **v1.1** | Dashboard con métricas | 🔜 Planificado |
| **v1.2** | Portal de Residente (solo lectura) | 🔮 Futuro |
| **v2.0** | Pasarelas de Pago (PSE, Nequi) | 🔮 Futuro |
| **v2.1** | Notificaciones WhatsApp/Telegram | 🔮 Futuro |
| **v3.0** | App móvil (React Native o PWA) | 🔮 Futuro |