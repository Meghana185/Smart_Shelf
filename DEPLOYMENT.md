# Smart Shelf Complete Deployment Guide

Complete guide for deploying all 3 service folders (**`smart-shelf-backend`**, **`smart-shelf-frontend`**, and **`whatsapp-service`**).

---

## 🏗️ Project Architecture (3 Folders)

| Service Folder | Tech Stack | Role | Container Port |
| :--- | :--- | :--- | :--- |
| `smart-shelf-backend` | Django 5 + REST Framework + Celery + PostgreSQL | Core REST API, Auth, AI Predictor & POS Billing Engine | `8000` |
| `smart-shelf-frontend` | React 19 + TypeScript + Vite + TailwindCSS + Nginx | Web App & Mobile Portal (POS, Admin & Customer Dashboards) | `80` |
| `whatsapp-service` | Node.js 20 + Express + Puppeteer / `whatsapp-web.js` | WhatsApp Automated SMS, Bill Messaging & OTP Microservice | `3001` |

---

## ⚡ Option 1: Unified Docker Deployment (All 3 Folders - Recommended)

Deploy all 3 folders plus PostgreSQL and Redis simultaneously with **one command**:

```bash
docker-compose up --build -d
```

### Accessing Containers:
- 🌐 **Frontend Application**: `http://localhost/` (Port 80)
- ⚙️ **Backend REST API**: `http://localhost:8000/api/`
- 💬 **WhatsApp QR Pair Portal**: `http://localhost:3001/qr`
- 🛡️ **Django Admin Portal**: `http://localhost:8000/admin/`

---

## ☁️ Option 2: Cloud Deployment (Folder by Folder)

### Folder 1: Backend Deployment (`smart-shelf-backend`)
- **Host Platforms**: Render / Railway / Heroku / DigitalOcean App Platform
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `gunicorn smartshelf.wsgi:application --bind 0.0.0.0:$PORT`
- **Environment Variables**:
  - `SECRET_KEY`: `[Your 50-character random key]`
  - `DEBUG`: `0`
  - `ALLOWED_HOSTS`: `backend.yourdomain.com`
  - `DATABASE_URL`: `postgres://user:password@host:5432/dbname`
  - `REDIS_URL`: `redis://host:6379/0`
  - `WHATSAPP_SERVICE_URL`: `https://whatsapp.yourdomain.com`
  - `GROQ_API_KEY`: `[Your Groq API Key]`
- **Background Workers**:
  - Celery Worker command: `celery -A smartshelf worker -l info`
  - Celery Beat Scheduler command: `celery -A smartshelf beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler`

---

### Folder 2: Frontend Deployment (`smart-shelf-frontend`)
- **Host Platforms**: Vercel / Netlify / Cloudflare Pages / AWS Amplify
- **Root Directory**: `smart-shelf-frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**:
  - `VITE_API_BASE_URL`: `https://backend.yourdomain.com/api`

---

### Folder 3: WhatsApp Microservice Deployment (`whatsapp-service`)
- **Host Platforms**: Render / Railway / DigitalOcean Droplet / Docker VPS
- **Root Directory**: `whatsapp-service`
- **Build Command**: `npm ci`
- **Start Command**: `node index.js`
- **Environment Variables**:
  - `PORT`: `3001`
  - `CHROMIUM_PATH`: `/usr/bin/chromium` (if running inside Docker / Linux VPS)
- **Session Persistence**: Ensure `/app/wwebjs_auth` directory is mounted to persistent storage so WhatsApp authentication survives restarts.

---

## 🔑 Pre-Seeded Demo Credentials

- 👑 **Admin Portal**: Username: `admin` | Password: `adminpass`
- 👨‍🍳 **Staff POS Login**: Username: `staff` | Password: `staffpass`
- 📱 **Customer OTP Login**: Phone Number: `9876543210` (OTP outputs to WhatsApp & server logs)
