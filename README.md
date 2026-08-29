# Smart Shelf Project Documentation

Smart Shelf is a full-stack inventory management system designed to automate product categorization, shelf tracking, expiry monitoring, automated POS billing, and WhatsApp messaging for retail store environments.

---

## 🚀 Live Production Deployed Services

| Service | Deployed Live URL | Description |
| :--- | :--- | :--- |
| 🌐 **Frontend Application** | [https://smart-shelf-frontend-grxl.onrender.com](https://smart-shelf-frontend-grxl.onrender.com) | Customer & Staff Web Portal |
| ⚙️ **Django REST API** | [https://smart-shelf-backend-79li.onrender.com/api/](https://smart-shelf-backend-79li.onrender.com/api/) | Core Backend & ML Predictor API |
| 📱 **WhatsApp QR Link** | [https://whatsapp-service-04k8.onrender.com/qr](https://whatsapp-service-04k8.onrender.com/qr) | WhatsApp Pairing Portal |

---

## 🔑 Demo Credentials

- 👑 **Admin Portal**: Username: `admin` | Password: `adminpass`
- 👨‍🍳 **Staff POS Login**: Username: `staff` | Password: `staffpass`
- 📱 **Customer OTP Login**: Phone Number: `9876543210`

## Technical Stack Overview

### Backend Framework
- Python 3.10+
- Django 5.2 (Web Framework)
- Django REST Framework (DRF for API Endpoints)
- Pillow & qrcode (Image processing and QR code rendering)
- dj-database-url & sqlite3/PostgreSQL (Database connectivity)
- django-cors-headers (Cross-Origin Resource Sharing middleware)

### Frontend Framework
- React 19 (User Interface Library)
- TypeScript (Static Type Checking)
- Vite (Build Tool & Dev Server)
- TailwindCSS v4 (Styling Framework)
- Axios (HTTP Client for API requests)
- React Router DOM (Single Page Application Routing)

---

## Detailed File-by-File Explanation

### Backend Repository (`smart-shelf-backend/`)

1. **`manage.py`**
   - The primary command-line utility for the Django backend. Used to run the development server (`runserver`), execute database migrations (`migrate`, `makemigrations`), create admin accounts (`createsuperuser`), and run automated tests (`test`).

2. **`requirements.txt`**
   - Specifies all Python package dependencies required by the backend, including `Django`, `djangorestframework`, `django-cors-headers`, `qrcode`, `Pillow`, `python-dotenv`, and `dj-database-url`.

3. **`.env` & `.env.example`**
   - Configuration files storing environment variables such as `SECRET_KEY`, `DEBUG` mode toggle, `ALLOWED_HOSTS`, and `DATABASE_URL` connection strings to prevent hardcoding sensitive credentials in source code.

4. **`smartshelf/settings.py`**
   - Main configuration file for the Django project. Defines `INSTALLED_APPS` (Admin, DRF, CORS, Core app), middleware chain, database engine connection parameters, CORS origins allowed for the React frontend, static asset URLs, and `MEDIA_ROOT` settings for uploaded QR images.

5. **`smartshelf/urls.py`**
   - Root URL dispatcher for the backend. Routes incoming requests to `/admin/` (Django Admin Portal), `/api/` (Core REST API endpoints), and handles static media file serving in development mode.

6. **`smartshelf/wsgi.py`**
   - Web Server Gateway Interface configuration entry point, allowing WSGI-compliant web application servers (like Gunicorn or uWSGI) to serve the Django backend in production deployments.

7. **`smartshelf/asgi.py`**
   - Asynchronous Server Gateway Interface configuration entry point, preparing the application for asynchronous handling, WebSockets, or async views if enabled.

8. **`core/apps.py`**
   - Application configuration class (`CoreConfig`) registering the `core` app within Django's application registry.

9. **`core/models.py`**
   - Defines the object-relational mapping (ORM) database tables:
     - `Category`: Stores product classifications (ID, name).
     - `Product`: Stores product inventory details (name, category relationship, manufacturing date, expiry date, price, stock quantity, unique `qr_code_id`, and `qr_code_image` path).
     - `Customer`: Stores customer profile information and contact details.
     - `Purchase`: Represents customer purchase transactions.
     - `PurchaseItem`: Represents individual line items in a purchase, linked to products and prices at purchase time.

10. **`core/serializers.py`**
    - Converts complex Django Model instances into native Python primitives that are rendered as JSON by Django REST Framework.
    - Contains `generate_qr_code_image()` logic.
    - `ProductSerializer`: Serializes product attributes, performs date validation (ensures expiry date is after manufacturing date), and triggers QR code generation on product creation.

11. **`core/views.py`**
    - Contains API viewsets and endpoint logic:
      - `health_check()`: Simple health probe returning server operational status.
      - `CategoryViewSet`: Provides full CRUD operations for category management.
      - `ProductViewSet`: Provides full CRUD operations for products, handles query filtering (`?category=` and `?near_expiry=true`), and exposes a detail action endpoint `@action(detail=True, methods=['get'], url_path='qr-code')` to stream product QR code PNG images.

12. **`core/urls.py`**
    - Uses Django REST Framework `DefaultRouter` to automatically map standard RESTful routes (`/categories/`, `/products/`, `/products/<id>/qr-code/`) to their corresponding viewsets.

13. **`core/admin.py`**
    - Customizes the Django Administration Interface (`/admin/`), configuring searchable columns, filters, list displays, and inline editors for Categories, Products, Customers, and Purchases.

14. **`core/tests.py`**
    - Automated unit tests covering product creation, QR code generation validation, date range validation, near-expiry query filtering, and QR image endpoint retrieval. Configured with isolated temporary media storage to avoid polluting production directories during test execution.

---

### Frontend Repository (`smart-shelf-frontend/`)

1. **`package.json`**
   - Project configuration manifest defining project metadata, build scripts (`dev`, `build`, `preview`), and installed npm package dependencies (React 19, TypeScript, Vite, TailwindCSS, Axios, React Router).

2. **`vite.config.ts`**
   - Configuration file for Vite build tool. Defines plugin integrations (`@vitejs/plugin-react`, `@tailwindcss/vite`) and dev server options.

3. **`tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json`**
   - TypeScript compiler configurations establishing strict type-checking rules, target ECMAScript versions, and module resolution settings across application files and node scripts.

4. **`index.html`**
   - HTML5 entry point template containing root `<div id="root"></div>` element where the React application mounts.

5. **`src/main.tsx`**
   - JavaScript/TypeScript entry point file. Mounts the root `App` component into the DOM tree wrapped in `React.StrictMode`.

6. **`src/App.tsx`**
   - Root application component configuring application state, layouts, and page routing.

7. **`src/index.css` & `src/App.css`**
   - Global stylesheets defining CSS reset rules, typography fonts, layout utilities, custom CSS variables, and Tailwind directives.

8. **`src/api/client.ts`**
   - Configures an Axios HTTP client instance configured with base backend URL (`http://127.0.0.1:8000/api`) and default JSON headers for smooth communication with the Django API.

9. **`src/components/Header.tsx`**
   - Navigation header component providing application branding and top bar navigation actions.

10. **`src/pages/HomePage.tsx`**
    - Main landing dashboard page rendering inventory overview summaries, quick access panels, and shelf status indicators.

---

## Detailed Step-by-Step Mechanism of QR Code Generation

The system automates QR code creation from the moment a product record is initialized until it is stored and served to clients.

```
[Client / Admin Creates Product]
               |
               v
[1. Generate UUID4] -> "447a6284-ab1c-4be0-98d8-c96c70d124b0"
               |
               v
[2. Initialize QR Matrix] -> qrcode.QRCode(version=1, error_correction=L)
               |
               v
[3. Render to PNG Buffer] -> Pillow renders matrix to BytesIO PNG buffer
               |
               v
[4. Attach to Django Model] -> product.qr_code_image.save("qr_<uuid>.png", ...)
               |
               v
[5. Write to File Storage] -> Saved in media/qr_codes/
               |
               v
[6. Stream via REST API] -> Accessible via /api/products/<id>/qr-code/
```

### Detailed Breakdown of Execution Steps

1. **Trigger Condition**:
   A user submits product creation data via `POST /api/products/` or via Django Admin.

2. **UUID Generation (`uuid.uuid4()`)**:
   In `ProductSerializer.create()`, Django inspects the product instance. If `qr_code_id` is empty, Python's `uuid` module generates a universally unique 128-bit identifier formatted as a 36-character string (for example, `"447a6284-ab1c-4be0-98d8-c96c70d124b0"`).

3. **QR Code Matrix Encoding (`qrcode.QRCode`)**:
   The `generate_qr_code_image()` function initializes a `qrcode.QRCode` instance with:
   - `version=1`: Standard 21x21 grid size.
   - `error_correction=ERROR_CORRECT_L`: Low error correction level suitable for clean digital displays.
   - `box_size=10`: Specifies pixel dimensions per module box.
   - `border=4`: 4-module silent margin surrounding the code.
   The UUID string is appended via `.add_data()`, and `.make(fit=True)` compiles the boolean matrix representing black and white modules.

4. **Image Canvas Rendering (`Pillow` & `BytesIO`)**:
   The matrix is converted into a standard image using `Pillow`'s raster graphics engine (`img = qr.make_image(fill_color="black", back_color="white")`). Instead of writing directly to disk immediately, the raw PNG byte stream is stored in an in-memory byte buffer using Python's `io.BytesIO()` module.

5. **Model Attachment & Media File Persistence**:
   The buffer content is wrapped inside a Django `ContentFile` named `qr_<uuid>.png`. Django's file storage layer receives the `ContentFile` and writes it to the local file system under `smart-shelf-backend/media/qr_codes/`. The relative file path is saved in the database column `qr_code_image`.

6. **API Response & Image Streaming Endpoint**:
   - In standard API endpoints (`GET /api/products/`), the `qr_code_image` field returns the absolute URL pointing to the static media file (e.g. `http://127.0.0.1:8000/media/qr_codes/qr_447a6284-ab1c-4be0-98d8-c96c70d124b0.png`).
   - In addition, the dedicated endpoint `GET /api/products/<id>/qr-code/` fetches the product model instance, reads the file binary stream from storage, and returns an HTTP response with header `Content-Type: image/png` for immediate browser rendering or hardware scanner integration.

---

## Complete Laptop Setup Instructions for Teammates

### System Prerequisites
1. **Python 3.10+**: Must be installed on host system. Check "Add Python to PATH" during installation on Windows.
2. **Node.js v18+ & npm**: Required for running the frontend Vite development server.
3. **Git**: Version control system to clone the repository.

---

### Step 1: Clone Repository
Open terminal or PowerShell:
```bash
git clone <REPOSITORY_URL>
cd Food
```

---

### Step 2: Set Up Backend (`smart-shelf-backend`)

Open **Terminal 1**:
```bash
# Navigate to backend directory
cd smart-shelf-backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows (PowerShell):
.\.venv\Scripts\activate
# Mac / Linux:
source .venv/bin/activate

# Install all backend dependencies
pip install -r requirements.txt

# Create environment configuration file
# Windows:
copy .env.example .env
# Mac / Linux:
cp .env.example .env

# Execute database migrations
python manage.py migrate

# Create admin user account
python manage.py createsuperuser

# Start Django Development Server
python manage.py runserver
```
- Backend REST API will be available at `http://127.0.0.1:8000/api/`
- Django Admin Portal will be available at `http://127.0.0.1:8000/admin/`

---

### Step 3: Set Up Frontend (`smart-shelf-frontend`)

Open **Terminal 2** (keep Terminal 1 running):
```bash
# Navigate to frontend directory from root
cd smart-shelf-frontend

# Install npm package dependencies
npm install

# Start Vite Frontend Development Server
npm run dev
```
- Frontend Application will be available at `http://localhost:5173`

---

### Step 4: Verification
1. Open `http://localhost:5173` in a web browser to verify frontend rendering.
2. Open `http://127.0.0.1:8000/admin/` to log into the administrative portal.
3. Create a test Category and Product to verify automated QR code generation and API responses.
