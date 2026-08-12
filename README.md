# Smart Shelf

Smart Shelf is a full-stack web application with a Django REST Framework backend and a React + Vite + TypeScript frontend.

## Project Structure

```
Food/
├── smart-shelf-backend/    # Django 5 + Django REST Framework backend
└── smart-shelf-frontend/   # React + Vite + TypeScript frontend
```

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js v18+ & npm
- PostgreSQL (optional for local development if default SQLite fallback is used)

---

### Backend Setup (`smart-shelf-backend`)

1. Navigate to the backend directory:
   ```bash
   cd smart-shelf-backend
   ```

2. Create and activate a virtual environment:
   ```bash
   # Windows
   python -m venv .venv
   .\.venv\Scripts\activate

   # macOS/Linux
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   Copy `.env.example` to `.env` and update values if needed:
   ```bash
   cp .env.example .env
   ```

5. Run database migrations:
   ```bash
   python manage.py migrate
   ```

6. Start the development server:
   ```bash
   python manage.py runserver
   ```
   The backend API will be available at `http://localhost:8000/api/`.

---

### Frontend Setup (`smart-shelf-frontend`)

1. Navigate to the frontend directory:
   ```bash
   cd smart-shelf-frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   The frontend application will be available at `http://localhost:5173`.
