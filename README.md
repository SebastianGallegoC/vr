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

## Licencia

Proyecto privado - Todos los derechos reservados.
