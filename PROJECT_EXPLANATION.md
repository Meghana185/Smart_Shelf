# Smart Shelf - Complete Project Explanation (Basic to Advanced)

> Written in simple language so you can confidently explain it to your professor, friends, or interview panel.

---

## What is Smart Shelf?

**Smart Shelf** is a **smart retail store management system** built for supermarkets and grocery stores.

Imagine walking into a store. Products are sitting on shelves with expiry dates. The shopkeeper does not know which items are about to expire. Billing is slow. Customers do not get receipts on WhatsApp. There is no way to know which products sell fast or which ones are going to expire in 3 days.

**Smart Shelf solves ALL of this automatically.**

---

## What Problem Does it Solve?

| Problem (Without Smart Shelf) | Solution (With Smart Shelf) |
| :--- | :--- |
| Shopkeeper does not know about expiring products | AI predicts expiry risk automatically |
| Manual billing is slow and error-prone | QR code scan-based POS billing system |
| Customers do not get receipts | WhatsApp receipt sent automatically after purchase |
| Customer needs password to login | WhatsApp OTP login — no password needed! |
| No idea what recipes to make with leftover stock | Chef Smarty AI chatbot suggests recipes |
| Hard to track inventory manually | Real-time dashboard with live analytics |

---

## Tech Stack (Tools Used to Build It)

Think of tech stacks like the **tools in a toolbox**. Each tool does a specific job.

### Frontend - What the USER SEES on Screen

- **React 19** (JavaScript Library) — Builds interactive web pages. Think of it as the paintbrush that draws everything on your screen.
- **TypeScript** (Programming Language) — A smarter, safer version of JavaScript. Catches mistakes before the code even runs.
- **Vite** (Build Tool) — Like a super-fast oven that compiles all your code into one fast bundle for the browser.
- **TailwindCSS** (Styling Framework) — Gives beautiful colors, layouts, and animations to the UI.
- **Axios** (HTTP Library) — The messenger that talks to the backend and fetches data.
- **React Router DOM** (Navigation Library) — Controls which page appears when you click a button.

### Backend - The Brain, What Happens Behind the Scenes

- **Python** (Programming Language) — The language the backend is written in.
- **Django** (Web Framework) — Like a factory that handles all incoming requests and returns responses.
- **Django REST Framework (DRF)** (API Toolkit) — Turns your database data into JSON so the React frontend can read it.
- **Gunicorn** (Production Server) — The official web server that runs Django in production on Render.
- **WhiteNoise** (Static File Server) — Serves CSS, images, and icons directly from Django.

### Database - Where All Data is Stored

- **PostgreSQL** (Relational Database) — A powerful, professional database. Stores all products, customers, purchases, and categories like a highly advanced Excel sheet.
- **SQLite** (Local Development Database) — A simple file-based database used on your laptop for testing.

### Background Processing

- **Redis** (In-Memory Data Store) — An ultra-fast temporary storage. Used as a message queue between Django and Celery workers.
- **Celery** (Task Queue) — Background worker that runs tasks automatically without freezing the user screen.

### WhatsApp Automation

- **@whiskeysockets/baileys** (Node.js Library) — A lightweight WhatsApp WebSocket client that connects your system to WhatsApp Web WITHOUT needing Chrome or a phone. Sends messages programmatically.
- **Node.js** (JavaScript Runtime) — Runs the WhatsApp service independently on a separate mini-server.

### AI and Machine Learning

- **Groq API plus LLaMA 3 AI Model** (Large Language Model) — The brain behind Chef Smarty AI chatbot. Answers recipe questions in natural language at lightning speed.
- **Python Custom Logic** (Prediction Engine) — The AI that predicts which products have a HIGH risk of expiring unsold based on stock levels and sales patterns.

### Deployment - Making it Live on the Internet

- **Render** (Cloud Hosting Platform) — Hosts all 3 services live on the internet for free.
- **Docker** (Containerization Tool) — Packages the entire application into one self-contained box that runs identically everywhere.
- **Nginx** (Web Server) — Serves the React frontend app to users browsers super fast.

### Version Control

- **Git plus GitHub** (Code Management) — Tracks every code change. Like Google Docs Version History but for code.

---

## Architecture - How Everything Connects

```
USER BROWSER
     |
     | (opens website)
     v
[React Frontend - Nginx Docker Container]
     |
     | (API calls via Axios)
     v
[Django Backend - Python Docker Container]
     |          |              |
     v          v              v
[PostgreSQL]  [Redis]   [WhatsApp Service]
 (Database)  (Queue)    (Node.js Container)
                              |
                              v
                      [WhatsApp Messages]
                   sent to Customer Phone
```

---

## Who Uses Smart Shelf?

Smart Shelf has **3 types of users**, each with their own login and dashboard:

### 1. Admin - Store Owner or Manager
- Sees the **full analytics dashboard** — total sales, revenue, best-selling products.
- Manages **Products** — add, edit, delete items with expiry dates.
- Manages **Categories** — group products (Dairy, Snacks, Beverages, etc.)
- Views **AI Expiry Risk Predictions** — which products will expire unsold.
- Has access to **Django Admin Panel** at /admin/

### 2. Staff - Cashier at POS Counter
- Uses the **POS Billing Dashboard**.
- Scans product **QR codes** using a phone or scanner.
- Adds items to cart, processes checkout.
- Customer **WhatsApp receipt is sent automatically** at checkout.

### 3. Customer - Shopper
- Logs in with **WhatsApp OTP** — no password needed!
- Sees their **full purchase history**.
- Chats with **Chef Smarty AI** for recipe suggestions.
- Gets **WhatsApp notifications** about expiring products they have bought.

---

## How QR Code Generation Works (Step by Step)

This is one of the **core technical features** of Smart Shelf.

### Simple Explanation:
Every product in the store gets its own **unique QR code** when it is added to the system. When a cashier scans this QR code at the POS counter, the product is automatically added to the cart.

### Technical Step-by-Step:

**Step 1: Admin Adds a New Product**
- Admin fills in product name, category, price, expiry date, and manufacturing date.
- Submits the form. React sends a POST request to Django via Axios.

**Step 2: Django Receives the Request**
- Django ProductSerializer validates the data (checks expiry date is AFTER manufacturing date).
- If valid, Django prepares to save the product.

**Step 3: Unique ID (UUID) is Generated**
- Python uuid module generates a **128-bit universally unique identifier**.
- Example: 447a6284-ab1c-4be0-98d8-c96c70d124b0
- This ID is **guaranteed to be unique** — no two products will EVER share the same ID.

**Step 4: QR Code Image is Created**
- Python qrcode library takes the UUID and encodes it into a **21x21 black-and-white matrix** (the QR pattern).
- Python Pillow library renders this matrix into an actual **PNG image file**.
- The image is stored temporarily in memory (RAM) using BytesIO — no disk writes yet.

**Step 5: Image is Saved to Storage**
- Django wraps the PNG bytes in a ContentFile and saves it to the media/qr_codes/ folder.
- The file path is saved in the PostgreSQL database row for that product.

**Step 6: QR Code is Ready**
- The product is saved with its QR code image.
- The React frontend displays the QR image.
- Admin can **print the QR label** and stick it on the product shelf.

**Step 7: Cashier Scans at POS**
- Cashier opens POS Dashboard on any phone or tablet.
- Points camera at the QR code on the shelf.
- React reads the decoded UUID from the QR.
- Sends GET /api/products/?qr_code_id=uuid request to Django.
- Django returns the product details (name, price, expiry).
- Product appears in the billing cart instantly!

---

## How WhatsApp OTP Login Works

This is the **customer login system** — no passwords, just WhatsApp.

**Step 1:** Customer enters their phone number on the login page.

**Step 2:** React sends the phone number to Django backend.

**Step 3:** Django generates a **6-digit random OTP** like 482910 and stores it temporarily in Redis with a 5-minute expiry timer.

**Step 4:** Django calls the **WhatsApp Service** running on Node.js:
- URL: POST https://whatsapp-service-04k8.onrender.com/send-message
- Body: phone number and message "Your Smart Shelf OTP is: 482910"

**Step 5:** The WhatsApp Service uses **Baileys** to instantly deliver the OTP to the customer WhatsApp.

**Step 6:** Customer types the OTP into the website.

**Step 7:** Django checks Redis — does the OTP match and is it still valid? If YES, login is successful! Django returns an authentication token.

**Step 8:** React stores the token and redirects the customer to their personal dashboard.

---

## How WhatsApp Receipts Work After Billing

**Step 1:** Cashier clicks Checkout in POS Dashboard.

**Step 2:** React sends a POST /api/purchases/ request to Django with the cart contents.

**Step 3:** Django saves the purchase record in PostgreSQL.

**Step 4:** Django triggers a **Celery background task** — drops a job into the Redis queue instantly.

**Step 5:** The Celery worker picks up the job from Redis. This runs in the BACKGROUND so the cashier screen does not freeze!

**Step 6:** Celery calls the WhatsApp Service with the full receipt message:
```
Smart Shelf Receipt
Thank you, Meghana!
Items: Milk x2, Bread x1
Total: Rs.145
Date: 29 Aug 2026
```

**Step 7:** WhatsApp message is delivered to the customer phone instantly!

---

## How the AI Expiry Risk Predictor Works

**The Problem it Solves:** A product with 3 days left to expiry might have 100 units in stock. At the normal sales rate, only 20 units will sell in 3 days. The other 80 units will expire and become a loss.

**How the AI Predicts:**
- Django looks at the product expiry date, current stock quantity, and average daily sales rate.
- It calculates: If this product sells at its normal rate, will ALL stock be sold before expiry?
- Products are scored as:
  - HIGH RISK — Will expire before all stock is sold.
  - MEDIUM RISK — Might be close.
  - LOW RISK — Will sell fine before expiry.

**Automated Alert System using Celery Beat:**
- Every day at a scheduled time, Celery Beat (like a cron job) automatically runs a scan task.
- Customers who bought HIGH RISK products receive a **WhatsApp alert** encouraging them to buy more before the product expires.

---

## How Chef Smarty AI Chatbot Works

**What it is:** A conversational AI assistant built into the customer dashboard.

**How it works:**
1. Customer types: What can I cook with milk, bread, and eggs?
2. React sends this message to Django backend.
3. Django sends the question to **Groq API** — a super-fast AI inference platform.
4. Groq runs the **LLaMA 3 AI model** — one of the worlds most powerful open-source language models.
5. LLaMA generates a detailed recipe suggestion in under 1 second.
6. Django returns the response to React.
7. Customer sees the recipe beautifully displayed in the chat interface.

**Why Groq?** Groq uses custom AI chips called LPUs that are 10-100x faster than traditional GPUs for running AI models. Response time is under 1 second!

---

## How Docker Works and Why We Use It

**The Problem Without Docker:**
"It works on my laptop but not on the server!"

This happens because your laptop and the cloud server have different operating systems, Python versions, and installed libraries.

**Docker Solution:**
Docker packages your entire application — code, Python version, all libraries, environment settings — into a **container** (like a sealed self-contained box). This container runs IDENTICALLY everywhere.

**Your project has 3 Docker containers:**

| Container | What is Inside | Port |
| :--- | :--- | :--- |
| smart-shelf-frontend | React app plus Nginx web server | 80 |
| smart-shelf-backend | Django plus Gunicorn Python server | 8000 |
| whatsapp-service | Node.js plus Baileys WhatsApp client | 3001 |

---

## How Render Deployment Works

**Render** is like a cloud computer that runs your Docker containers 24/7 on the internet.

When you click Deploy on Render:
1. Render pulls your latest code from **GitHub**.
2. Reads your Dockerfile.
3. Builds the container image step by step.
4. Runs the container on a cloud server in Virginia, USA.
5. Gives it a public URL like https://smart-shelf-backend-79li.onrender.com

Your project is now accessible by anyone in the world, 24/7, without your laptop being on!

---

## Live Production URLs

| Service | URL |
| :--- | :--- |
| Frontend | https://smart-shelf-frontend-grxl.onrender.com |
| Backend API | https://smart-shelf-backend-79li.onrender.com/api/ |
| WhatsApp Service | https://whatsapp-service-04k8.onrender.com |

---

## Full Feature Summary

| Feature | Technology Used |
| :--- | :--- |
| Product Management (CRUD) | Django REST Framework + React |
| QR Code Generation | Python qrcode + Pillow + UUID |
| QR Code Scanning at POS | React Camera / QR Scanner |
| WhatsApp OTP Login | Baileys + Node.js + Redis |
| WhatsApp Receipts | Celery + Redis + Baileys |
| AI Expiry Risk Prediction | Python Custom Logic + Django |
| AI Recipe Chatbot | Groq API + LLaMA 3 AI Model |
| Real-time Analytics Dashboard | Django Aggregations + React Charts |
| Background Scheduled Tasks | Celery Beat + Redis |
| Database | PostgreSQL (Production) |
| Frontend Hosting | Nginx + Docker + Render |
| Backend Hosting | Gunicorn + Docker + Render |
| WhatsApp Hosting | Node.js + Docker + Render |

---

## One-Line Explanation for Non-Technical People

"Smart Shelf is a full-stack web application for retail stores that uses QR code scanning for instant billing, AI to predict product expiry risks, WhatsApp for automated customer receipts and OTP login, and an AI chatbot to suggest recipes — all deployed live on the cloud."

---

Made with love by Meghana H A — Smart Shelf Project, August 2026
