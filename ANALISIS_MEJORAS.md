# Análisis Completo: Mejoras y Rendimiento — VegasDelRio

> **Fecha:** 14 de marzo de 2026
> **Alcance:** Backend (FastAPI) + Frontend (Next.js) + Infraestructura

---

## Índice

1. [Problemas de Rendimiento Detectados](#1-problemas-de-rendimiento-detectados)
2. [Problemas de Arquitectura y Código](#2-problemas-de-arquitectura-y-código)
3. [Problemas de Seguridad](#3-problemas-de-seguridad)
4. [Mejoras para un Sistema Profesional](#4-mejoras-para-un-sistema-profesional)
5. [Resumen de Prioridades](#5-resumen-de-prioridades)

---

## 1. Problemas de Rendimiento Detectados

### 1.1 — CRÍTICO: Tarea Celery (`billing_tasks.py`) Desactualizada y Rota

**Archivo:** `apps/backend/app/tasks/billing_tasks.py`

La tarea Celery `generate_period_bills` utiliza nombres de columnas/tablas **en inglés** (`property_id`, `owner_id`, `full_name`, `house_number`, `is_active`, `is_primary`, `end_date`, etc.) mientras que los modelos ORM actuales están **todos en español** (`propiedad_id`, `propietario_id`, `nombre_completo`, `numero_casa`, `activo`, `es_principal`, `fecha_fin`, etc.).

**Impacto:** Esta tarea **no funciona**. Cualquier intento de generar facturas por Celery lanzará `AttributeError` o `SQLAlchemy column not found`. Esto explica directamente un mal rendimiento si el sistema intenta usar Celery y falla constantemente.

**Solución:** Reescribir `billing_tasks.py` alineando todos los nombres de columnas con los modelos españoles actuales.

---

### 1.2 — CRÍTICO: Motor de Base de Datos Síncronos Creados Repetidamente

**Archivo:** `apps/backend/app/tasks/billing_tasks.py` — línea `engine = create_engine(sync_url, pool_pre_ping=True)`

Cada invocación de la tarea Celery crea un `engine` nuevo con `create_engine()`. El engine de SQLAlchemy es un recurso pesado que gestiona un pool de conexiones; crearlo en cada tarea y descartarlo es muy ineficiente.

**Impacto:** Latencia innecesaria al abrir conexiones TCP nuevas a PostgreSQL en cada ejecución. Si hay muchas tareas concurrentes, se agotan las conexiones del servidor.

**Solución:** Crear el engine síncronos como un **singleton a nivel de módulo** (fuera de la tarea), o usar un patrón de fábrica cacheado.

---

### 1.3 — ALTO: Queries N+1 en la Tarea Celery

**Archivo:** `apps/backend/app/tasks/billing_tasks.py`

```python
prop = db.query(Property).get(assignment.property_id)
owner = db.query(Owner).get(assignment.owner_id)
```

Ya se tienen las `active_assignments` pero se hacen consultas individuales por cada propiedad y propietario dentro del loop. Esto genera **2 queries SQL adicionales por cada casa**.

**Impacto:** Para 100 casas = 200 queries extra innecesarias.

**Solución:** Usar `joinedload` / `selectinload` en la query original de `active_assignments` o pre-cargar con un diccionario como ya se hizo correctamente en `billing.py` (endpoint `generate_bills`).

---

### 1.4 — ALTO: Generación de PDFs Bloquea el Event Loop

**Archivo:** `apps/backend/app/api/v1/endpoints/billing.py` — `send_period_emails`

`generate_bill_pdf` es una función síncrona intensiva (Jinja2 render + xhtml2pdf HTML→PDF). Aunque se usa `asyncio.to_thread()` correctamente para moverla a un thread pool, `send_bill_email` (que hace HTTP requests síncronas a Gmail API) **también se ejecuta con `asyncio.to_thread()`** en secuencia.

El problema real es que `asyncio.gather()` lanza TODOS los `_process_bill` concurrentemente, pero el semáforo sólo controla la parte del envío de email, no la generación de PDF. Si hay 100 facturas, se generan 100 PDFs **simultáneamente** en el thread pool.

**Impacto:** Picos de CPU y RAM al crear muchos PDFs en paralelo.

**Solución:** Mover el semáforo para que cubra **todo** el proceso (PDF + email), no solo el envío.

---

### 1.5 — ALTO: Frontend Carga Todas las Propiedades y Propietarios en Bills Page

**Archivo:** `apps/frontend/src/app/(dashboard)/dashboard/bills/page.tsx`

```tsx
const { data: propertiesData } = useQuery({
  queryKey: ["properties", "all"],
  queryFn: () => propertiesService.list({ page_size: 100 }),
});

const { data: ownersData } = useQuery({
  queryKey: ["owners", "all"],
  queryFn: () => ownersService.list({ page_size: 100 }),
});
```

Se cargan **100 propiedades** y **100 propietarios** en cada visita a la página de facturas, incluso si la tabla solo muestra 20 facturas. Esto es para construir lookup maps (`propertyMap`, `ownerMap`).

**Impacto:** 3 llamadas API paralelas innecesarias por cada carga de la página. Si hay más de 100 registros, los lookups serán incompletos y mostrarán datos vacíos.

**Solución:** El backend debería devolver las facturas ya con los datos de propiedad y propietario embebidos (ya lo hace parcialmente con `selectinload`). Ajustar el schema `BillResponse` para incluir `numero_casa` y `nombre_propietario` directamente, eliminando la necesidad de lookups en el frontend.

---

### 1.6 — MEDIO: Dashboard Stats Ejecuta 4 Queries Separadas

**Archivo:** `apps/backend/app/api/v1/endpoints/billing.py` — `get_dashboard_stats`

Cuatro `SELECT COUNT(*)` independientes van a la base de datos. Cada uno requiere round-trip de red al Supabase PostgreSQL (que puede tener ~20-100ms de latencia).

**Impacto:** ~80-400ms de latencia solo por el dashboard.

**Solución:** Combinar las estadísticas en una sola query CTE o usar `asyncio.gather()` para ejecutar las 4 queries en paralelo.

---

### 1.7 — MEDIO: `pool_size=5` Puede Ser Insuficiente

**Archivo:** `apps/backend/app/db/session.py`

Con solo 5 conexiones base y `max_overflow=10`, si llegan más de 15 requests concurrentes, las conexiones se agotarán. Además, `send_period_emails` puede usar muchas sesiones concurrentemente.

**Solución:** Evaluar aumentar `pool_size` a 10-20 para producción. Configurarlo vía variable de entorno.

---

### 1.8 — MEDIO: `requests` Síncrono Donde Se Puede Usar `httpx` Async

**Archivo:** `apps/backend/app/services/email_service.py`

Se usa `requests` (síncrono) para las llamadas a Gmail API y OAuth token refresh. Aunque se envuelve en `asyncio.to_thread()`, esto consume hilos del thread pool. `httpx` ya es dependencia del proyecto y soporta async nativamente.

**Solución:** Refactorizar `email_service.py` para usar `httpx.AsyncClient` en las funciones que se llaman desde el contexto async de FastAPI.

---

## 2. Problemas de Arquitectura y Código

### 2.1 — Lógica de Negocio en los Endpoints (Violación de SRP)

**Archivos:**

- `billing.py` — `generate_bills()` (~80 líneas de lógica)
- `billing.py` — `send_period_emails()` (~90 líneas de lógica)
- `properties.py` — `assign_property_owner()` (~50 líneas)

Los endpoints contienen toda la lógica de negocio directamente. No existe una capa `services/` para billing que encapsule la generación de facturas o el envío de emails.

**Impacto:** Dificulta el testing unitario, la reutilización y el mantenimiento. La tarea Celery duplica gran parte de esta lógica.

**Solución:** Crear `services/billing_service.py` con funciones como:

- `generate_bills_for_period(db, period_id) -> GenerateBillsResponse`
- `send_bills_by_email(db, period_id) -> SendEmailsResponse`

Y que tanto los endpoints como las tareas Celery llamen a estos servicios.

---

### 2.2 — Duplicación de Lógica entre Endpoints y Celery Tasks

**Archivos:**

- `billing.py` → `generate_bills()` (async, usa modelos españoles)
- `billing_tasks.py` → `generate_period_bills()` (sync, usa modelos ingleses ❌)

La misma operación está implementada **dos veces** con convenciones diferentes. Una no funciona.

**Solución:** Un único `billing_service.py` con dos variantes (sync/async) o usar la versión sync como función base.

---

### 2.3 — Imports Tardíos y Desordenados

**Archivo:** `apps/backend/app/api/v1/endpoints/properties.py`

```python
from datetime import datetime, timezone as tz  # dentro de la función
```

Hay imports dentro de funciones (`assign_property_owner`, `remove_property_owner`). Esto no sigue PEP 8.

**Solución:** Mover todos los imports al inicio del archivo.

---

### 2.4 — No Hay Validación de Transiciones de Estado en Facturas

**Archivo:** `billing.py` — `update_bill()`

Se puede cambiar el estado de una factura a cualquier valor sin validar transiciones. Un `draft` no debería poder pasar a `paid` directamente; un `cancelled` no debería poder reactivarse.

**Solución:** Implementar una máquina de estados:

```
draft → pending → paid
draft → cancelled
pending → overdue → paid
pending → cancelled
```

---

### 2.5 — Ausencia de Logging Estructurado

La aplicación usa `logger.info/warning/error` con strings formateados manualmente. No hay correlación de requests, ni trazas de operaciones críticas (generación masiva, envío de emails).

**Solución:** Configurar logging estructurado con `structlog` o al menos añadir `request_id` como context variable.

---

### 2.6 — No Hay Rate Limiting ni Protección Anti-Abuso

Los endpoints de generación masiva (`/generate`) y envío de emails (`/send-emails`) no tienen ningún rate limiting. Un usuario podría disparar múltiples generaciones masivas simultáneamente.

**Solución:** Añadir `slowapi` para rate limiting global, y un lock distribuido (Redis) para operaciones masivas.

---

### 2.7 — Paginación con Hardcoded `page_size: 100` en Frontend

**Archivos:** Bills page, assign-owner-dialog

Se asume que nunca habrá más de 100 propiedades, propietarios, etc. Esto no escala.

**Solución:** O se implementa un endpoint de búsqueda/autocompletado, o se paginan los lookups con scroll infinito.

---

## 3. Problemas de Seguridad

### 3.1 — Secret Key por Defecto en Producción

**Archivo:** `apps/backend/app/core/__init__.py`

```python
secret_key: str = "cambiar-por-una-clave-segura-de-32-caracteres"
```

Si `SECRET_KEY` no está en `.env`, se usa este valor por defecto. Esto permitiría a un atacante descifrar tokens de Gmail almacenados en la BD.

**Solución:** Eliminar el valor por defecto o lanzar una excepción si `app_env != "development"` y no hay secret_key configurada.

---

### 3.2 — Modo Desarrollo Permite Acceso Sin Autenticación

**Archivo:** `apps/backend/app/api/deps.py` (según análisis)

Sin `JWT_SECRET` configurado, la dependencia `get_current_user` permite acceso como `dev-user`. Esto es potencialmente peligroso si se despliega accidentalmente sin la variable.

**Solución:** Condicionar estrictamente a `app_env == "development"`.

---

### 3.3 — Inyección SQL Potencial en Filtro de Búsqueda

**Archivos:** `owners.py`, `properties.py`

```python
search_term = f"%{search}%"
query = query.where(Owner.nombre_completo.ilike(search_term))
```

Aunque SQLAlchemy parameteriza las queries, el `%` wildcard podría usarse para denial-of-service con patterns como `%%%%%`. Considerar limitar la longitud del search y sanitizar wildcards.

---

### 3.4 — Email de Destino No Validado en Envío

En `send_period_emails`, se usa `owner.correos[0]` directamente sin validar que sea un email válido. Si contiene datos malformados, podría causar errores inesperados.

**Solución:** Validar formato de email antes de intentar enviar.

---

## 4. Mejoras para un Sistema Profesional

### 4.1 — Crear Capa de Servicios para Billing

```
app/services/
├── billing_service.py   ← NUEVO: lógica de generación y envío
├── email_service.py     ← existente
├── pdf_service.py       ← existente
└── owner_service.py     ← NUEVO (opcional): lógica de propietarios
```

Esto centraliza la lógica de negocio, facilita el testing y elimina la duplicación.

---

### 4.2 — Enriquecer BillResponse desde el Backend

Que `BillResponse` incluya directamente `numero_casa` y `nombre_propietario` para que el frontend no necesite hacer 2 queries extra de lookup.

```python
class BillResponse(BaseModel):
    # ... campos existentes ...
    numero_casa: str | None = None
    nombre_propietario: str | None = None
    periodo_descripcion: str | None = None
```

---

### 4.3 — Combinar Dashboard Stats en Una Sola Query o Paralelizar

```python
# Opción A: asyncio.gather
total_props, total_owners, bills_month, bills_pending = await asyncio.gather(
    db.execute(query1),
    db.execute(query2),
    db.execute(query3),
    db.execute(query4),
)
```

**Nota:** Con una sola sesión, las queries async de SQLAlchemy se ejecutan secuencialmente; la verdadera paralelización requiere sesiones separadas o una CTE.

```sql
-- Opción B: Una sola query
SELECT
  (SELECT COUNT(*) FROM propiedades WHERE activo = true) AS total_propiedades,
  (SELECT COUNT(*) FROM propietarios WHERE activo = true) AS total_propietarios,
  ...
```

---

### 4.4 — Mover Configuración de Pool a Variables de Entorno

```python
# db/session.py
engine = create_async_engine(
    settings.database_url,
    pool_size=settings.db_pool_size,       # ENV: DB_POOL_SIZE=10
    max_overflow=settings.db_max_overflow, # ENV: DB_MAX_OVERFLOW=20
    ...
)
```

---

### 4.5 — Añadir Health Check Profundo

El health check actual solo retorna `"healthy"`. No verifica la base de datos ni Redis.

```python
@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception:
        db_status = "error"
    return {"status": "healthy", "db": db_status}
```

---

### 4.6 — Testing: Añadir Tests de Integración para Endpoints

Los tests del frontend cubren los servicios API (mocks), pero los tests del backend deben cubrir:

- Flujo completo de generación de facturas
- Flujo de envío de emails (con mocks)
- Validación de transiciones de estado
- Paginación y filtros

---

### 4.7 — Frontend: Debounce en Búsqueda

Las búsquedas en propietarios y propiedades disparan queries en cada cambio de filtro sin debounce.

**Solución:** Añadir `useDeferredValue` o un custom hook `useDebounce(value, 300)`.

---

### 4.8 — Frontend: Error Boundaries

No hay `error.tsx` en las rutas del dashboard. Si una página falla, se rompe todo el layout.

**Solución:** Añadir archivos `error.tsx` en las rutas principales.

---

### 4.9 — Manejo de Concurrencia en Generación Masiva

Si dos usuarios hacen clic en "Generar Cobros" simultáneamente para el mismo periodo, se podrían crear facturas duplicadas (race condition). La validación `existing_property_ids` no es atómica.

**Solución:** Usar `SELECT ... FOR UPDATE` en el periodo, o un lock distribuido con Redis al iniciar la generación.

---

### 4.10 — Documentación de API con Ejemplos

Los endpoints tienen docstrings, pero los schemas no tienen `model_config` con `json_schema_extra` (examples). Swagger/Redoc serían más útiles con ejemplos concretos.

---

## 5. Resumen de Prioridades

| Prioridad  | Problema                                        | Impacto                              | Esfuerzo |
| ---------- | ----------------------------------------------- | ------------------------------------ | -------- |
| 🔴 Crítico | Celery task rota (nombres en inglés)            | La generación por Celery no funciona | Medio    |
| 🔴 Crítico | Engine creado en cada tarea Celery              | Fugas de conexiones, latencia        | Bajo     |
| 🟠 Alto    | N+1 queries en Celery task                      | Lentitud en generación masiva        | Bajo     |
| 🟠 Alto    | 100 PDFs generados en paralelo sin control      | Picos de CPU/RAM                     | Bajo     |
| 🟠 Alto    | Frontend carga all props+owners en bills page   | 3 requests extras, no escala > 100   | Medio    |
| 🟠 Alto    | Lógica de negocio duplicada endpoints vs Celery | Mantenibilidad rota                  | Alto     |
| 🟡 Medio   | Dashboard stats: 4 queries secuenciales         | ~400ms de latencia extra             | Bajo     |
| 🟡 Medio   | `requests` síncrono en email_service            | Consume hilos del pool               | Medio    |
| 🟡 Medio   | Secret key por defecto                          | Riesgo de seguridad en producción    | Bajo     |
| 🟡 Medio   | No rate limiting en operaciones masivas         | Posible DoS accidental               | Medio    |
| 🟡 Medio   | No hay validación de transiciones de estado     | Datos inconsistentes                 | Bajo     |
| 🟡 Medio   | Race condition en generación masiva             | Facturas duplicadas                  | Medio    |
| 🟢 Bajo    | Imports tardíos en properties.py                | Estilo de código                     | Bajo     |
| 🟢 Bajo    | No hay error boundaries en frontend             | UX degradada en errores              | Bajo     |
| 🟢 Bajo    | No hay debounce en búsquedas frontend           | Requests innecesarias                | Bajo     |
| 🟢 Bajo    | Health check superficial                        | Problemas no detectados              | Bajo     |
| 🟢 Bajo    | Falta coverage de tests de integración          | Regresiones posibles                 | Alto     |

---

### Orden de Acción Recomendado

1. **Arreglar `billing_tasks.py`** — Alinear nombres de columnas con los modelos actuales en español.
2. **Crear `services/billing_service.py`** — Centralizar lógica y eliminar duplicación.
3. **Enriquecer `BillResponse`** — Eliminar lookups innecesarios en el frontend.
4. **Controlar concurrencia de PDFs** — Mover semáforo para cubrir PDF + email.
5. **Singleton del engine síncrono** — Para las tareas Celery.
6. **Paralelizar/combinar dashboard stats** — Reducir latencia.
7. **Validación de secret_key en producción** — Seguridad básica.
8. **Rate limiting y locks en operaciones masivas** — Protección anti-abuso.
