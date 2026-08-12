# Smart Shelf Project Setup

Set up a full-stack project called "Smart Shelf" with a Django 5 REST Framework backend and a React + Vite + TypeScript frontend, including environment variable management, CORS configuration, directory structures, Tailwind CSS, root documentation, git initialization, and server startup verification.

## User Review Required

> [!NOTE]
> Database Configuration: PostgreSQL configuration with `dj-database-url` will be configured in `smart-shelf-backend/smartshelf/settings.py`. To allow `python manage.py runserver` or `migrate` to work out-of-the-box locally without requiring an active local PostgreSQL instance immediately, a default fallback to SQLite (`sqlite:///db.sqlite3`) will be provided if `DATABASE_URL` is not set or PostgreSQL is unreachable.

> [!IMPORTANT]
> Tailwind CSS Setup: Tailwind CSS v4 will be installed and configured with `@tailwindcss/vite` in `smart-shelf-frontend` following modern Vite + React best practices.

## Proposed Changes

### Backend Setup (`smart-shelf-backend/`)

#### [NEW] [requirements.txt](file:///c:/Users/manya/OneDrive/Desktop/Food/smart-shelf-backend/requirements.txt)
- Include `django>=5.0`, `djangorestframework`, `django-cors-headers`, `dj-database-url`, `psycopg2-binary`, `python-dotenv`, `qrcode`, and `pillow`.

#### [NEW] [.env.example](file:///c:/Users/manya/OneDrive/Desktop/Food/smart-shelf-backend/.env.example) & [.env](file:///c:/Users/manya/OneDrive/Desktop/Food/smart-shelf-backend/.env)
- Environment variable keys: `SECRET_KEY`, `DEBUG`, `DATABASE_URL`, `ALLOWED_HOSTS`.

#### [NEW] Django Project `smartshelf` & App `core`
- `smart-shelf-backend/manage.py`
- `smart-shelf-backend/smartshelf/settings.py`:
  - Load variables using `python-dotenv`.
  - Add `rest_framework`, `corsheaders`, and `core` to `INSTALLED_APPS`.
  - Add `corsheaders.middleware.CorsMiddleware` to `MIDDLEWARE`.
  - Configure `CORS_ALLOWED_ORIGINS = ["http://localhost:5173"]`.
  - Configure `DATABASES` using `dj_database_url.config(default=...)`.
- `smart-shelf-backend/smartshelf/urls.py`: Include `api/` endpoint routes.

---

### Frontend Setup (`smart-shelf-frontend/`)

#### [NEW] Scaffold React + Vite + TypeScript App
- Run `npm create vite@latest smart-shelf-frontend -- --template react-ts`.
- Install dependencies: `axios`, `react-router-dom`, `@tailwindcss/vite`, `tailwindcss`.
- Set up Tailwind CSS plugin in `vite.config.ts` and `@import "tailwindcss";` in `src/index.css`.

#### [NEW] Basic Folder Structure & Axios Client
- Create directories: `src/pages/`, `src/components/`, `src/api/`, `src/hooks/`.
- [NEW] `src/api/client.ts`: Create and export `axios` instance configured with `baseURL: 'http://localhost:8000/api'`.

---

### Root Configuration & Git Setup

#### [NEW] [README.md](file:///c:/Users/manya/OneDrive/Desktop/Food/README.md)
- Instructions to run backend (`python manage.py runserver`) and frontend (`npm run dev`).

#### [NEW] [.gitignore](file:///c:/Users/manya/OneDrive/Desktop/Food/.gitignore)
- Standard ignore rules for Python (`__pycache__`, `.venv`, `*.pyc`, `.env`, `db.sqlite3`) and Node (`node_modules`, `dist`, `.env.local`).

#### Git Repository Initialization
- Execute `git init`, `git add .`, and make initial commit: `"Initial commit: Smart Shelf project setup"`.

## Verification Plan

### Automated / Diagnostic Checks
1. Test Django backend configuration:
   - Run `python manage.py check` inside `smart-shelf-backend`.
   - Run backend dev server `python manage.py runserver 8000` in background and test root/API endpoint response via HTTP request.
2. Test React frontend build & dev server:
   - Run `npm run build` inside `smart-shelf-frontend`.
   - Start Vite dev server `npm run dev` and verify server starts cleanly on port 5173.
3. Verify git repository status & commit log.
