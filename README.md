# VegasDelRio - Sistema de Gestión Residencial

Sistema integral para la gestión de cobros de administración del conjunto residencial Vegas del Río. Permite generar, enviar y rastrear recibos de cobro de manera digital, reemplazando el proceso manual en papel.

## Stack Tecnológico

| Capa                | Tecnología                                                    |
| ------------------- | ------------------------------------------------------------- |
| **Frontend**        | Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| **Backend**         | Python 3.11+, FastAPI, SQLAlchemy 2.0 (async)                 |
| **Base de Datos**   | PostgreSQL (Supabase Cloud)                                   |
| **Autenticación**   | Supabase Auth (JWT)                                           |
| **Cola de Tareas**  | Celery + Redis                                                |
| **Generación PDF**  | WeasyPrint + Jinja2                                           |
| **Envío de Correo** | Resend / SMTP                                                 |

## Estructura del Proyecto

```text
VegasDelRio/
├── apps/
│   ├── backend/          # API FastAPI + Celery Workers
│   └── frontend/         # Panel Web Next.js
├── docker-compose.yml    # Redis y servicios auxiliares
└── README.md
```

## Requisitos Previos

- **Python** >= 3.11
- **Node.js** >= 18 LTS
- **Redis** (Instalado localmente o vía Docker/WSL)
- **GTK3 Runtime** (Requerido por WeasyPrint en Windows)

## Inicio Rápido

### 1. Backend

```bash
cd apps/backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp .env.example .env          # Configurar variables
uvicorn app.main:app --reload --port 8000
```

### 2. Celery Worker (en otra terminal)

```bash
cd apps/backend
.venv\Scripts\activate
celery -A app.tasks.celery_app worker --pool=solo -l info
```

### 3. Frontend

```bash
cd apps/frontend
npm install
cp .env.example .env.local    # Configurar variables
npm run dev
```

## Variables de Entorno

Revisa los archivos `.env.example` en cada carpeta (`apps/backend/` y `apps/frontend/`) para ver las variables requeridas.

---

## Backend — Documentación Detallada

### Arquitectura General

El backend es una API REST construida con **FastAPI** y **SQLAlchemy 2.0 async** que se conecta a **PostgreSQL** (Supabase Cloud). Toda la comunicación con la base de datos es asíncrona mediante `asyncpg`.

```text
apps/backend/
├── alembic/                  # Migraciones de base de datos
│   └── versions/             # Archivos de migración (Alembic)
├── app/
│   ├── api/
│   │   ├── deps.py           # Dependencias (autenticación JWT)
│   │   └── v1/
│   │       ├── router.py     # Router principal con prefijo /api/v1
│   │       └── endpoints/    # Controladores por dominio
│   │           ├── billing.py
│   │           ├── email_settings.py
│   │           ├── owners.py
│   │           └── properties.py
│   ├── core/
│   │   ├── __init__.py       # Settings (pydantic-settings)
│   │   └── security.py       # Generación / verificación JWT
│   ├── db/
│   │   ├── base.py           # DeclarativeBase de SQLAlchemy
│   │   └── session.py        # Engine async + fábrica de sesiones
│   ├── models/               # Modelos ORM (SQLAlchemy)
│   │   ├── billing.py        # BillingPeriod, Bill, BillItem, NotificationLog
│   │   ├── email_config.py   # EmailConfig (tokens OAuth cifrados)
│   │   ├── owner.py          # Owner (propietario)
│   │   ├── property.py       # Property (casa)
│   │   └── property_owner.py # PropertyOwner (relación casa ↔ propietario)
│   ├── schemas/              # Schemas Pydantic (request / response)
│   ├── services/             # Lógica de negocio
│   │   ├── billing_service.py   # Máquina de estados de facturas
│   │   ├── email_service.py     # Envío multi-proveedor (Gmail API, SMTP, Resend)
│   │   └── pdf_service.py       # Generación de recibos PDF
│   ├── tasks/                # Tareas Celery (background jobs)
│   │   ├── celery_app.py
│   │   └── billing_tasks.py
│   ├── templates/
│   │   └── bill_receipt.html # Plantilla HTML del recibo
│   └── main.py               # Punto de entrada FastAPI
├── tests/                    # Tests con pytest-asyncio
├── requirements.txt
└── pytest.ini
```

---

### Punto de Entrada — `main.py`

La aplicación FastAPI se crea con:

- **Lifespan**: Logs de inicio/apagado.
- **GZipMiddleware**: Compresión automática (mínimo 500 bytes).
- **CORSMiddleware**: Orígenes configurables vía `CORS_ORIGINS`. Incluye regex para puertos dinámicos en desarrollo.
- **Documentación**: Swagger UI (`/docs`) y ReDoc (`/redoc`) habilitados solo si `APP_ENV=development`.
- **Health Check**: `GET /health` verifica conectividad con la base de datos y retorna `healthy` o `degraded`.
- **Rutas**: Monta el router v1 en el prefijo `/api/v1`.

---

### Configuración — `app/core/__init__.py`

Usa `pydantic-settings` + `.env` para gestionar las variables de entorno:

| Grupo              | Variables                                                                                  | Descripción                                                       |
| ------------------ | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| **Aplicación**     | `APP_NAME`, `APP_ENV`, `DEBUG`, `SECRET_KEY`, `API_V1_PREFIX`                              | Configuración general. `SECRET_KEY` es obligatorio en producción. |
| **Base de Datos**  | `DATABASE_URL`, `DATABASE_URL_DIRECT`, `DB_POOL_SIZE`, `DB_MAX_OVERFLOW`                   | URI asyncpg para Supabase Pooler (sesión, puerto 5432).           |
| **Supabase Auth**  | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`    | Claves RSA ES256 (JWK) para verificar tokens JWT.                 |
| **Google OAuth**   | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FRONTEND_URL`                                 | Para vincular Gmail (envío de correos via Gmail API).             |
| **Redis / Celery** | `REDIS_URL`, `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`                                  | Broker y backend para tareas en segundo plano.                    |
| **Email**          | `EMAIL_PROVIDER`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `RESEND_API_KEY` | Configuración del proveedor de correo.                            |
| **CORS**           | `CORS_ORIGINS`                                                                             | Lista de orígenes permitidos.                                     |

---

### Base de Datos — `app/db/`

- **Engine**: `create_async_engine` con `asyncpg`, `pool_pre_ping=True`, `pool_recycle=300`.
- **Fábrica de sesiones**: `async_sessionmaker(expire_on_commit=False)`.
- **Dependencia**: `get_db()` inyecta una `AsyncSession` por cada request y la cierra al finalizar.
- **Migraciones**: Alembic con driver síncrono (`psycopg2`) apuntando a `DATABASE_URL_DIRECT`.

---

### Modelos ORM — `app/models/`

#### Property (tabla: `propiedades`)

| Campo                          | Tipo               | Descripción                      |
| ------------------------------ | ------------------ | -------------------------------- |
| `id`                           | UUID (PK)          | Identificador único              |
| `numero_casa`                  | String(20), unique | Número de casa ("1", "2A", "15") |
| `direccion`                    | String(300)        | Dirección completa (opcional)    |
| `area_m2`                      | Numeric(10,2)      | Área en m²                       |
| `alicuota`                     | Numeric(6,4)       | % participación áreas comunes    |
| `notas`                        | Text               | Notas internas                   |
| `activo`                       | Boolean            | Estado del inmueble              |
| `creado_en` / `actualizado_en` | DateTime(tz)       | Auditoría                        |

**Relaciones**: `propiedad_propietarios` → PropertyOwner, `facturas` → Bill.

#### Owner (tabla: `propietarios`)

| Campo              | Tipo               | Descripción                          |
| ------------------ | ------------------ | ------------------------------------ |
| `id`               | UUID (PK)          | Identificador único                  |
| `id_usuario_auth`  | UUID               | Vínculo con Supabase Auth (opcional) |
| `nombre_completo`  | String(200)        | Nombre del propietario               |
| `tipo_documento`   | String(20)         | CC, CE, NIT, Pasaporte               |
| `numero_documento` | String(30), unique | Documento de identidad               |
| `correos`          | ARRAY(String)      | Lista de emails para notificaciones  |
| `telefonos`        | ARRAY(String)      | Lista de teléfonos (+573001234567)   |
| `notas`            | Text               | Notas internas                       |
| `activo`           | Boolean            | Estado del propietario               |

**Relaciones**: `propiedad_propietarios` → PropertyOwner, `facturas` → Bill.

#### PropertyOwner (tabla: `propiedad_propietarios`)

Tabla pivote muchos-a-muchos con soporte de historial:

| Campo            | Tipo      | Descripción                        |
| ---------------- | --------- | ---------------------------------- |
| `propiedad_id`   | UUID (FK) | Inmueble                           |
| `propietario_id` | UUID (FK) | Propietario                        |
| `es_principal`   | Boolean   | Recibe los cobros                  |
| `fecha_inicio`   | Date      | Inicio de la relación              |
| `fecha_fin`      | Date      | Fin de la relación (NULL = actual) |

**Constraint**: `UNIQUE(propiedad_id, propietario_id, fecha_inicio)`.

#### BillingPeriod (tabla: `periodos_facturacion`)

| Campo               | Tipo           | Descripción                   |
| ------------------- | -------------- | ----------------------------- |
| `mes`               | Integer (1-12) | Mes del periodo               |
| `anio`              | Integer        | Año                           |
| `descripcion`       | String(100)    | "Febrero 2026"                |
| `monto_base`        | Numeric(12,2)  | Monto base de administración  |
| `fecha_vencimiento` | Date           | Fecha límite de pago          |
| `estado`            | Enum           | `OPEN`, `CLOSED`, `CANCELLED` |

**Constraint**: `UNIQUE(mes, anio)`.

#### Bill (tabla: `facturas`)

| Campo                    | Tipo               | Descripción                                        |
| ------------------------ | ------------------ | -------------------------------------------------- |
| `numero_factura`         | String(30), unique | Formato: `VDR-2026-02-001`                         |
| `propiedad_id`           | UUID (FK)          | Casa facturada                                     |
| `periodo_facturacion_id` | UUID (FK)          | Periodo al que pertenece                           |
| `propietario_id`         | UUID (FK)          | Propietario destinatario                           |
| `monto_total`            | Numeric(12,2)      | Suma de items                                      |
| `estado`                 | Enum               | `DRAFT`, `PENDING`, `PAID`, `OVERDUE`, `CANCELLED` |
| `url_pdf`                | String(500)        | URL del PDF generado                               |
| `enviado_en`             | DateTime           | Fecha de envío del email                           |
| `pagado_en`              | DateTime           | Fecha de pago                                      |

**Relaciones**: `items` → BillItem, `notificaciones` → NotificationLog.
**Constraint**: `UNIQUE(propiedad_id, periodo_facturacion_id)`.

#### BillItem (tabla: `items_factura`)

Conceptos individuales de cada factura: `concepto` (ej: "Administración"), `descripcion`, `monto`.

#### NotificationLog (tabla: `registro_notificaciones`)

Registro de cada envío: `canal` (EMAIL, WHATSAPP, SMS), `destinatario`, `estado` (PENDING, SENT, DELIVERED, FAILED), `mensaje_error`.

#### EmailConfig (tabla: `configuracion_email`)

Almacena credenciales OAuth de Gmail cifradas con **Fernet** (AES-128-CBC + HMAC). Campos: `proveedor`, `email_vinculado`, `access_token_enc`, `refresh_token_enc`, `token_expiry`.

---

### Autenticación — `app/api/deps.py`

1. El frontend hace login contra **Supabase Auth** y obtiene un JWT firmado con ES256.
2. Cada request al backend envía el header `Authorization: Bearer {token}`.
3. La dependencia `get_current_user()`:
   - Decodifica el JWT usando `SUPABASE_JWT_SECRET` (JWK en formato JSON).
   - Verifica firma (ES256), audience (`authenticated`) y expiración.
   - Retorna `CurrentUser(id, email, role)`.
4. **Modo desarrollo**: Sin `SUPABASE_JWT_SECRET` configurado → retorna un usuario mock (permite desarrollar sin Supabase Auth real).

---

### Endpoints — API REST v1

Todos los endpoints requieren autenticación JWT. Prefijo: `/api/v1`.

#### Propietarios — `/api/v1/owners`

| Método   | Ruta          | Descripción                                                                            |
| -------- | ------------- | -------------------------------------------------------------------------------------- |
| `GET`    | `/`           | Lista con paginación, búsqueda (nombre/documento), filtros (`activo`, `sin_propiedad`) |
| `GET`    | `/{owner_id}` | Detalle con casa actual asignada                                                       |
| `POST`   | `/`           | Crear (valida documento único)                                                         |
| `PUT`    | `/{owner_id}` | Actualizar campos parciales                                                            |
| `DELETE` | `/{owner_id}` | Soft delete (`activo = false`)                                                         |

#### Propiedades — `/api/v1/properties`

| Método   | Ruta                   | Descripción                                                        |
| -------- | ---------------------- | ------------------------------------------------------------------ |
| `GET`    | `/`                    | Lista con paginación, búsqueda por número de casa, filtro `activo` |
| `GET`    | `/{property_id}`       | Detalle de la propiedad                                            |
| `POST`   | `/`                    | Crear (valida `numero_casa` único)                                 |
| `PUT`    | `/{property_id}`       | Actualizar campos parciales                                        |
| `DELETE` | `/{property_id}`       | Soft delete                                                        |
| `GET`    | `/{property_id}/owner` | Obtener propietario principal actual                               |
| `POST`   | `/{property_id}/owner` | Asignar propietario (cierra el anterior automáticamente)           |
| `DELETE` | `/{property_id}/owner` | Desasociar propietario                                             |

#### Facturación — `/api/v1/billing`

| Método | Ruta                               | Descripción                                            |
| ------ | ---------------------------------- | ------------------------------------------------------ |
| `GET`  | `/periods`                         | Lista periodos (filtrable por año)                     |
| `POST` | `/periods`                         | Crear periodo (valida mes/año único)                   |
| `PUT`  | `/periods/{period_id}`             | Actualizar periodo                                     |
| `GET`  | `/bills`                           | Lista facturas con filtros (periodo, estado, búsqueda) |
| `GET`  | `/bills/{bill_id}`                 | Detalle con items y notificaciones                     |
| `PUT`  | `/bills/{bill_id}`                 | Cambiar estado (valida transiciones)                   |
| `POST` | `/generate`                        | **Genera facturas masivas** para un periodo            |
| `POST` | `/periods/{period_id}/send-emails` | **Envía PDFs por email** a todos los propietarios      |
| `GET`  | `/dashboard-stats`                 | Estadísticas del dashboard (totales, pendientes)       |

#### Configuración de Email — `/api/v1/settings`

| Método | Ruta                    | Descripción                                                    |
| ------ | ----------------------- | -------------------------------------------------------------- |
| `GET`  | `/email/status`         | Verifica si hay Gmail vinculado                                |
| `GET`  | `/email/gmail/auth-url` | Genera URL de consentimiento OAuth Google                      |
| `POST` | `/email/gmail/callback` | Recibe código OAuth, intercambia por tokens y almacena cifrado |

---

### Procesos Clave

#### Generación Masiva de Facturas (`POST /api/v1/billing/generate`)

```
1. Verificar que el periodo existe y está en estado OPEN
2. Obtener todas las propiedades activas con propietario principal
3. Para cada propiedad (omitir si ya tiene factura en ese periodo):
   a. Crear Bill (estado DRAFT)
   b. Crear BillItem con concepto "Administración" y monto_base del periodo
   c. Generar número secuencial: VDR-YYYY-MM-NNN
4. Retornar: { facturas_generadas, facturas_omitidas, errores }
```

#### Envío Masivo de Emails (`POST /api/v1/billing/periods/{id}/send-emails`)

```
1. Obtener todas las facturas del periodo
2. Para cada factura (concurrencia limitada a 5 con Semaphore):
   a. Generar PDF del recibo con datos del propietario e items
   b. Enviar email al primer correo del propietario
   c. Registrar NotificationLog con el resultado
   d. Si envío exitoso: actualizar estado a PENDING
3. Retornar: { total_facturas, emails_enviados, emails_fallidos, errores }
```

**Prioridad de envío de emails:**

1. **Gmail API** (si hay cuenta vinculada con OAuth)
2. **SMTP** (Gmail, Outlook u otro servidor configurado)
3. **Resend** (API transaccional como fallback)

#### Máquina de Estados de Facturas

```
DRAFT ──→ PENDING ──→ PAID ✓ (final)
  │          │
  │          ├──→ OVERDUE ──→ PAID ✓
  │          │       │
  │          └──→ CANCELLED ✓ (final)
  │                  ▲
  └──────────────────┘
```

**Efectos automáticos:**

- Al pasar a `PAID`: establece `pagado_en = now()`.
- Al pasar a `PENDING`: establece `enviado_en = now()`.

#### Vinculación de Gmail (OAuth 2.0)

```
Frontend                    Backend                     Google
   │                           │                           │
   │── GET /auth-url ─────────→│                           │
   │←── URL de consentimiento ─│                           │
   │                           │                           │
   │── Abre popup ─────────────────────────────────────────→│
   │←── Código OAuth ──────────────────────────────────────│
   │                           │                           │
   │── POST /callback {code} ─→│── Intercambia código ────→│
   │                           │←── access + refresh token │
   │                           │── Cifra con Fernet ──────→│ (almacena en DB)
   │←── { vinculado: true } ──│                           │
```

Los tokens se cifran con **Fernet** usando `SHA256(SECRET_KEY)` como clave.

---

### Servicios — `app/services/`

| Servicio               | Responsabilidad                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| **billing_service.py** | Validación de transiciones de estado de facturas y aplicación de side effects automáticos.  |
| **email_service.py**   | Envío multi-proveedor (Gmail API → SMTP → Resend) con refresh automático de tokens OAuth.   |
| **pdf_service.py**     | Generación de recibos PDF usando Jinja2 + xhtml2pdf desde la plantilla `bill_receipt.html`. |

---

### Tareas Celery — `app/tasks/`

Worker configurado con **Redis** como broker. Timezone: `America/Bogota`.

| Tarea                           | Descripción                                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `billing.generate_period_bills` | Genera facturas + PDFs + emails en segundo plano. Incluye pre-carga de propietarios para evitar N+1 queries. |

Ejecución:

```bash
celery -A app.tasks.celery_app worker --pool=solo -l info
```

> **Nota**: `--pool=solo` es requerido en Windows.

---

### Migraciones — Alembic

| Migración    | Descripción                                                  |
| ------------ | ------------------------------------------------------------ |
| `2026-02-22` | Esquema inicial (todas las tablas)                           |
| `2026-02-23` | Renombramiento de columnas English → Spanish                 |
| `2026-03-11` | `correo`/`telefono` (string) → `correos`/`telefonos` (ARRAY) |
| `2026-03-12` | Tabla `configuracion_email` para credenciales OAuth          |
| `2026-03-14` | Índices de performance                                       |

```bash
cd apps/backend
alembic upgrade head      # Aplicar migraciones
alembic revision --autogenerate -m "descripcion"  # Nueva migración
```

---

### Tests

Framework: **pytest** + **pytest-asyncio** con SQLite async in-memory.

```bash
cd apps/backend
pytest                    # Ejecutar todos los tests
pytest --cov=app          # Con cobertura
```

| Archivo                  | Cobertura                                             |
| ------------------------ | ----------------------------------------------------- |
| `test_health.py`         | Health check y conectividad                           |
| `test_owners.py`         | CRUD propietarios, búsqueda, validación de duplicados |
| `test_properties.py`     | CRUD propiedades, paginación, soft delete             |
| `test_property_owner.py` | Asignación/desasociación propietario ↔ casa           |
| `test_billing.py`        | Generación masiva, transiciones de estado             |
| `test_email_settings.py` | Configuración Gmail OAuth                             |
| `test_auth.py`           | Validación JWT, rechazo sin token                     |

La autenticación se mockea automáticamente en tests inyectando un usuario de prueba.

---

### Dependencias Principales

| Categoría      | Paquetes                                      |
| -------------- | --------------------------------------------- |
| **Web**        | fastapi, uvicorn                              |
| **ORM**        | sqlalchemy[asyncio], asyncpg, alembic         |
| **Validación** | pydantic, pydantic-settings                   |
| **Auth**       | python-jose[cryptography]                     |
| **Email**      | google-auth, google-api-python-client, resend |
| **PDF**        | weasyprint, jinja2                            |
| **Celery**     | celery[redis], redis                          |
| **Testing**    | pytest, pytest-asyncio, pytest-cov, aiosqlite |

---

## Frontend — Documentación Detallada

### Arquitectura General

El frontend es un panel de administración SPA construido con **Next.js 14+ (App Router)**, **TypeScript**, **Tailwind CSS** y **shadcn/ui**. Usa **Supabase Auth** para autenticación y **TanStack React Query** para gestión de estado y caché del lado del servidor.

```text
apps/frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/                 # Rutas públicas (login, recovery)
│   │   │   ├── layout.tsx
│   │   │   ├── login/page.tsx
│   │   │   └── update-password/page.tsx
│   │   ├── (dashboard)/            # Rutas protegidas (panel admin)
│   │   │   ├── layout.tsx          # Sidebar + Header + protección de rutas
│   │   │   └── dashboard/
│   │   │       ├── page.tsx        # Dashboard principal
│   │   │       ├── bills/          # Gestión de cobros
│   │   │       ├── owners/         # Gestión de propietarios
│   │   │       ├── properties/     # Gestión de casas
│   │   │       ├── periods/        # Periodos de facturación
│   │   │       └── settings/       # Configuración (Gmail OAuth)
│   │   ├── auth/callback/route.ts  # Callback de Supabase Auth
│   │   ├── layout.tsx              # Root layout (providers)
│   │   ├── page.tsx                # Redirige a /dashboard
│   │   └── globals.css             # Tailwind + variables CSS
│   ├── components/
│   │   ├── bills/                  # BillDetail, BillTableRow
│   │   ├── layout/                 # Header, Sidebar
│   │   ├── owners/                 # OwnerForm
│   │   ├── periods/                # PeriodForm
│   │   ├── properties/             # PropertyForm, AssignOwnerDialog, OwnerInfoDialog
│   │   ├── providers/              # AuthProvider, QueryProvider
│   │   └── ui/                     # shadcn/ui + componentes custom
│   ├── lib/
│   │   ├── api-client.ts           # Cliente Axios → Backend FastAPI
│   │   ├── utils.ts                # Helpers (formatCurrency, formatDate, cn)
│   │   ├── supabase/               # Clientes Supabase (browser + server)
│   │   └── services/               # Capa de servicios HTTP
│   ├── types/index.ts              # Interfaces TypeScript
│   ├── proxy.ts                    # Middleware de protección de rutas
│   └── __tests__/                  # Tests con Vitest
├── package.json
├── tsconfig.json
├── next.config.ts
└── vitest.config.ts
```

---

### Root Layout y Providers — `src/app/layout.tsx`

La aplicación se envuelve en dos providers anidados:

```
<html lang="es">
  <body>
    <QueryProvider>          ← TanStack React Query (caché, revalidación)
      <AuthProvider>         ← Gestión de sesión Supabase
        {children}
        <Toaster />          ← Notificaciones toast (sonner)
      </AuthProvider>
    </QueryProvider>
  </body>
</html>
```

- **Fuente**: Inter (Google Fonts).
- **Metadata**: "Vegas del Río - Administración".

---

### Protección de Rutas — `src/proxy.ts`

Actúa como middleware en cada navegación:

1. Refresca la sesión de Supabase (`getSession()`) en cada request.
2. **Sin sesión** + accede a `/dashboard/*` → redirige a `/login`.
3. **Con sesión** + accede a `/login` → redirige a `/dashboard`.
4. Excluye assets estáticos (`_next/static`, imágenes, favicon).

---

### Autenticación — `src/app/(auth)/`

#### Layout de Auth

Diseño centrado sin sidebar — fondo gris, card centrada de `max-w-md`.

#### Login — `/login`

1. El usuario ingresa email y contraseña.
2. Llama a `supabase.auth.signInWithPassword()`.
3. Si hay error → muestra "Credenciales inválidas".
4. Si éxito → redirige a `/dashboard`.
5. Si el hash de la URL contiene `type=recovery` → redirige a `/update-password`.
6. Si recibe evento `PASSWORD_RECOVERY` de Supabase → redirige a `/update-password`.

#### Recuperar Contraseña — `/update-password`

1. Supabase procesa el token de recovery del hash de la URL.
2. El usuario ingresa nueva contraseña (mínimo 8 caracteres) y confirmación.
3. Validaciones: longitud mínima, coincidencia, que no sea la contraseña anterior.
4. Tras éxito, cierra sesión y redirige a `/login` en 2 segundos.

#### Callback de Auth — `/auth/callback`

Route handler server-side que intercambia códigos de autorización de Supabase (magic links, email verification, OAuth) por sesiones activas.

---

### AuthProvider — `src/components/providers/auth-provider.tsx`

Context API que gestiona el estado de autenticación global:

- Se subscribe a `supabase.auth.onAuthStateChange()` al montar.
- Evento `INITIAL_SESSION` carga la sesión existente.
- Cada cambio de sesión actualiza `user` y pasa el JWT al `apiClient` via `setAuthToken()`.
- Expose: `useAuth()` → `{ user, loading, signOut }`.

---

### QueryProvider — `src/components/providers/query-provider.tsx`

Configura TanStack React Query con:

| Opción                 | Valor   | Efecto                                    |
| ---------------------- | ------- | ----------------------------------------- |
| `refetchOnWindowFocus` | `false` | No recarga al cambiar de pestaña          |
| `retry`                | `1`     | Reintenta 1 vez si falla                  |
| `staleTime`            | `5 min` | Los datos se consideran frescos 5 minutos |

---

### Panel de Administración — `src/app/(dashboard)/`

#### Layout del Dashboard

```
┌──────────────────────────────────────────┐
│ ┌──────────┐ ┌──────────────────────────┐│
│ │          │ │ Header (título + usuario) ││
│ │ Sidebar  │ ├──────────────────────────┤│
│ │          │ │                          ││
│ │ - Panel  │ │     Contenido principal  ││
│ │ - Casas  │ │     (children)           ││
│ │ - Propie.│ │                          ││
│ │ - Period.│ │                          ││
│ │ - Cobros │ │                          ││
│ │          │ │                          ││
│ │ ──────── │ │                          ││
│ │ Config   │ │                          ││
│ │ Salir    │ │                          ││
│ └──────────┘ └──────────────────────────┘│
└──────────────────────────────────────────┘
```

**Sidebar** (fijo a la izquierda):

- Logo "Vegas del Río" con ícono Building2.
- Navegación: Panel Principal, Casas, Propietarios, Periodos, Cobros.
- Footer: Configuración, Cerrar Sesión.
- El ítem activo se resalta con fondo azul.

**Header** (barra superior):

- Muestra el título de la página actual (mapeado por pathname).
- Email del usuario logueado.

---

### Páginas del Dashboard

#### Dashboard Principal — `/dashboard`

Muestra 4 tarjetas de estadísticas en grid responsive:

| Tarjeta        | Ícono       | Color   | Dato                         |
| -------------- | ----------- | ------- | ---------------------------- |
| Total Casas    | Building2   | Azul    | `total_propiedades`          |
| Propietarios   | Users       | Verde   | `total_propietarios_activos` |
| Cobros del Mes | Receipt     | Púrpura | `facturas_mes`               |
| Pendientes     | AlertCircle | Naranja | `facturas_pendientes`        |

Datos obtenidos via `useQuery` → `billsService.getDashboardStats()`.

---

#### Gestión de Cobros — `/dashboard/bills`

**Lo que puede hacer el usuario:**

- **Ver** lista de facturas con paginación (20 por página).
- **Filtrar** por período y estado (borrador, pendiente, pagada, vencida, cancelada).
- **Ver detalle** de una factura en modal (ítems, montos, fechas, notificaciones).
- **Cambiar estado** con confirmación (marcar como pagada, pendiente, vencida, cancelar).

**Tabla:**

| Columna     | Contenido                                 |
| ----------- | ----------------------------------------- |
| N° Factura  | `VDR-2026-02-001`                         |
| Casa        | Número de casa                            |
| Propietario | Nombre                                    |
| Período     | Descripción del periodo                   |
| Monto       | Formato COP                               |
| Estado      | Badge con color según estado              |
| Fecha       | Fecha de creación                         |
| Acciones    | Dropdown con opciones según estado actual |

**Componentes involucrados:** `BillTableRow`, `BillDetail` (modal), `TablePagination`, `ConfirmDialog`.

---

#### Gestión de Propietarios — `/dashboard/owners`

**Lo que puede hacer el usuario:**

- **Buscar** propietarios por nombre o documento.
- **Crear** nuevo propietario (nombre, tipo/número documento, correos, teléfonos, notas).
- **Editar** datos de un propietario existente.
- **Activar/Desactivar** propietarios (soft delete).

**Tabla:**

| Columna     | Contenido                  |
| ----------- | -------------------------- |
| Nombre      | Nombre completo            |
| Documento   | Tipo + número              |
| Correos     | Lista de emails            |
| Teléfonos   | Lista de teléfonos         |
| Casa Actual | Número de casa (si tiene)  |
| Estado      | Badge Activo/Inactivo      |
| Acciones    | Editar, Activar/Desactivar |

**Formulario (`OwnerForm`):** Soporta arrays dinámicos de correos y teléfonos con botones +/- para agregar o quitar. Valida al menos 1 correo obligatorio con formato email válido.

---

#### Gestión de Casas — `/dashboard/properties`

**Lo que puede hacer el usuario:**

- **Buscar** casas por número.
- **Crear** nueva casa (número, dirección, área, alícuota, notas).
- **Editar** datos de una casa.
- **Activar/Desactivar** casas.
- **Asignar propietario** buscando entre los propietarios existentes.
- **Desasignar propietario** actual.
- **Ver información** del propietario asignado (modal read-only).

**Tabla:**

| Columna     | Contenido                                           |
| ----------- | --------------------------------------------------- |
| N° Casa     | Número identificador                                |
| Dirección   | Dirección completa                                  |
| Alícuota    | Porcentaje de participación                         |
| Propietario | Nombre del propietario actual                       |
| Estado      | Badge Activo/Inactivo                               |
| Acciones    | Editar, Asignar/Ver Propietario, Activar/Desactivar |

**Componentes:**

- `PropertyForm` — Crear/editar casa.
- `AssignOwnerDialog` — Buscar y asignar propietario con filtros (todos, sin casa, con casa).
- `OwnerInfoDialog` — Ver detalles del propietario (documento, correos como links `mailto:`, teléfonos como links `tel:`).

---

#### Periodos de Facturación — `/dashboard/periods`

**Lo que puede hacer el usuario:**

- **Ver** periodos de facturación (filtrable por año, últimos 6 años).
- **Crear** nuevo periodo (mes, año, descripción auto-generada, monto base, fecha vencimiento).
- **Editar** periodo existente.
- **Generar facturas masivas** — Crea una factura para cada casa activa del periodo.
- **Enviar emails masivos** — Genera PDFs y envía por correo a cada propietario.

**Tabla:**

| Columna     | Contenido                                                |
| ----------- | -------------------------------------------------------- |
| Mes/Año     | Periodo (ej: Febrero 2026)                               |
| Descripción | Texto descriptivo                                        |
| Monto Base  | Formato COP                                              |
| Vencimiento | Fecha límite                                             |
| Estado      | Badge: Abierto (verde), Cerrado (gris), Cancelado (rojo) |
| Acciones    | Editar, Generar Facturas, Enviar Emails                  |

**Acciones masivas:**

- "Generar Facturas" → muestra confirmación con resultado (X generadas, Y omitidas, Z errores).
- "Enviar por Email" → muestra resultado (X enviados, Y fallidos, errores detallados).

**Formulario (`PeriodForm`):** auto-genera la descripción ("Cuota Enero 2026") al seleccionar mes/año. El campo de monto formatea separadores de miles en tiempo real.

---

#### Configuración — `/dashboard/settings`

**Lo que puede hacer el usuario:**

- **Ver** estado de vinculación de Gmail (proveedor, email vinculado, fecha).
- **Vincular Gmail** — Abre popup OAuth de Google.
- **Desvincular Gmail** — Con diálogo de confirmación.

**Flujo de vinculación Gmail:**

```
Settings Page         Popup (Gmail OAuth)         Backend
     │                        │                      │
     │── Click "Vincular" ───→│                      │
     │   GET /auth-url ──────────────────────────────→│
     │←── auth_url ──────────────────────────────────│
     │── window.open(url) ──→│                       │
     │                        │── Google OAuth ──→    │
     │                        │←── code ──────────   │
     │←── postMessage(code) ─│ (se cierra)           │
     │── POST /callback ────────────────────────────→│
     │←── { vinculado } ────────────────────────────│
```

---

### Cliente API — `src/lib/api-client.ts`

Cliente Axios preconfigurado para comunicarse con el backend:

| Configuración | Valor                                                  |
| ------------- | ------------------------------------------------------ |
| Base URL      | `NEXT_PUBLIC_API_URL` o `http://localhost:8000/api/v1` |
| Timeout       | 30 segundos                                            |
| Content-Type  | `application/json`                                     |

**Interceptores:**

- **Request**: Agrega automáticamente el header `Authorization: Bearer {token}` con el JWT de Supabase cacheado en memoria.
- **Response**: Si recibe status `401` → limpia el token y redirige a `/login`.

---

### Capa de Servicios — `src/lib/services/`

Cada módulo encapsula las llamadas HTTP al backend:

#### `billsService`

| Método                | Endpoint                       | Descripción                                       |
| --------------------- | ------------------------------ | ------------------------------------------------- |
| `list(filters)`       | `GET /billing/bills`           | Lista con filtros (period_id, status, paginación) |
| `get(id)`             | `GET /billing/bills/{id}`      | Detalle con ítems y notificaciones                |
| `create(payload)`     | `POST /billing/bills`          | Crear factura individual                          |
| `update(id, payload)` | `PUT /billing/bills/{id}`      | Actualizar estado/notas                           |
| `getDashboardStats()` | `GET /billing/dashboard-stats` | Estadísticas del dashboard                        |

#### `ownersService`

| Método                | Endpoint           | Descripción                                      |
| --------------------- | ------------------ | ------------------------------------------------ |
| `list(filters)`       | `GET /owners`      | Lista con búsqueda, filtros activo/sin_propiedad |
| `get(id)`             | `GET /owners/{id}` | Detalle con casa actual                          |
| `create(payload)`     | `POST /owners`     | Crear propietario                                |
| `update(id, payload)` | `PUT /owners/{id}` | Actualizar datos                                 |
| `deactivate(id)`      | `PUT /owners/{id}` | Desactivar (`activo: false`)                     |
| `activate(id)`        | `PUT /owners/{id}` | Reactivar (`activo: true`)                       |

#### `propertiesService`

| Método                             | Endpoint                        | Descripción                     |
| ---------------------------------- | ------------------------------- | ------------------------------- |
| `list(filters)`                    | `GET /properties`               | Lista con búsqueda y paginación |
| `get(id)`                          | `GET /properties/{id}`          | Detalle de la casa              |
| `create(payload)`                  | `POST /properties`              | Crear casa                      |
| `update(id, payload)`              | `PUT /properties/{id}`          | Actualizar datos                |
| `deactivate(id)`                   | `PUT /properties/{id}`          | Desactivar                      |
| `activate(id)`                     | `PUT /properties/{id}`          | Reactivar                       |
| `assignOwner(propertyId, ownerId)` | `POST /properties/{id}/owner`   | Asignar propietario             |
| `removeOwner(propertyId)`          | `DELETE /properties/{id}/owner` | Desasignar propietario          |

#### `periodsService`

| Método                    | Endpoint                                 | Descripción              |
| ------------------------- | ---------------------------------------- | ------------------------ |
| `list(filters)`           | `GET /billing/periods`                   | Lista (filtro por año)   |
| `create(payload)`         | `POST /billing/periods`                  | Crear periodo            |
| `update(id, payload)`     | `PUT /billing/periods/{id}`              | Actualizar periodo       |
| `generateBills(periodId)` | `POST /billing/generate`                 | Generar facturas masivas |
| `sendEmails(periodId)`    | `POST /billing/periods/{id}/send-emails` | Enviar emails masivos    |

#### `settingsService`

| Método              | Endpoint                              | Descripción                    |
| ------------------- | ------------------------------------- | ------------------------------ |
| `getEmailStatus()`  | `GET /settings/email/status`          | ¿Gmail vinculado?              |
| `getGmailAuthUrl()` | `GET /settings/email/gmail/auth-url`  | URL de consentimiento OAuth    |
| `linkGmail(code)`   | `POST /settings/email/gmail/callback` | Intercambiar código por tokens |
| `unlinkGmail()`     | `DELETE /settings/email/gmail/unlink` | Desvincular Gmail              |

---

### Utilidades — `src/lib/utils.ts`

| Función                  | Descripción                                 | Ejemplo                              |
| ------------------------ | ------------------------------------------- | ------------------------------------ |
| `cn(...inputs)`          | Merge de clases CSS (clsx + tailwind-merge) | `cn("px-4", active && "bg-blue-50")` |
| `formatCurrency(amount)` | Formato moneda colombiana (COP)             | `1234567` → `"1.234.567 COP"`        |
| `formatDate(date)`       | Formato fecha es-CO                         | `"2026-03-15"` → `"15/03/2026"`      |

---

### Tipos TypeScript — `src/types/index.ts`

Interfaces principales del sistema:

| Tipo              | Campos clave                                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| `Owner`           | id, nombre_completo, tipo_documento, numero_documento, correos[], telefonos[], activo, casa_actual |
| `Property`        | id, numero_casa, direccion, area_m2, alicuota, activo, propietario_actual                          |
| `BillingPeriod`   | id, mes, anio, descripcion, monto_base, fecha_vencimiento, estado                                  |
| `Bill`            | id, numero_factura, monto_total, estado, items[], numero_casa, nombre_propietario                  |
| `BillItem`        | id, concepto, descripcion, monto                                                                   |
| `NotificationLog` | id, canal, destinatario, estado, mensaje_error                                                     |

**Enums como union types:**

- `BillStatus` = `"draft" | "pending" | "paid" | "overdue" | "cancelled"`
- `PeriodStatus` = `"open" | "closed" | "cancelled"`
- `NotificationChannel` = `"email" | "whatsapp" | "telegram" | "sms"`

**Tipos genéricos:**

- `PaginatedResponse<T>` = `{ items: T[], total, page, page_size }`
- `GenerateBillsResponse` = `{ facturas_generadas, facturas_omitidas, errores[] }`
- `SendEmailsResponse` = `{ total_facturas, emails_enviados, emails_fallidos, errores[] }`

---

### Componentes UI — shadcn/ui

Componentes base de [shadcn/ui](https://ui.shadcn.com/) (Radix UI + Tailwind):

`Badge`, `Button`, `Card`, `Dialog`, `DropdownMenu`, `Input`, `Label`, `ScrollArea`, `Select`, `Separator`, `Sheet`, `Skeleton`, `Table`.

**Componentes custom adicionales:**

- `TablePagination` — Paginación reutilizable (prev/next + total de páginas). Oculta cuando hay 1 sola página.
- `ConfirmDialog` — Diálogo de confirmación genérico para acciones destructivas.
- `Sonner` — Wrapper de notificaciones toast (posición top-right, modo richColors).

---

### Tests — Vitest

**Framework**: Vitest con jsdom + @testing-library.

```bash
cd apps/frontend
npm test            # Ejecutar en modo watch
npm run test:run    # Ejecutar una vez
```

| Archivo              | Cobertura                       |
| -------------------- | ------------------------------- |
| `bills.test.ts`      | CRUD + getDashboardStats        |
| `owners.test.ts`     | CRUD + activate/deactivate      |
| `properties.test.ts` | CRUD + assignOwner/removeOwner  |
| `periods.test.ts`    | CRUD + generateBills/sendEmails |
| `settings.test.ts`   | Email status + Gmail OAuth flow |

Todos los tests mockean `apiClient` y verifican que los servicios construyen los requests correctamente (URL, método, payload, query params).

---

### Dependencias Principales

| Categoría     | Paquetes                                               |
| ------------- | ------------------------------------------------------ |
| **Framework** | next, react, react-dom                                 |
| **Auth**      | @supabase/ssr, @supabase/supabase-js                   |
| **Estado**    | @tanstack/react-query                                  |
| **HTTP**      | axios                                                  |
| **UI**        | tailwindcss, @radix-ui/\*, lucide-react, sonner        |
| **Testing**   | vitest, @testing-library/{react, jest-dom, user-event} |

## Licencia

Proyecto privado - Todos los derechos reservados.
