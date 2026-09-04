# Smart Shelf — Deep Technical Explanation (Every Tiny Detail)

> This document explains HOW every single thing works INSIDE the project — not just what it does, but exactly how it works with real code references.

---

## 1. What is DOM? (And how React uses it in this project)

### What is DOM?
DOM stands for **Document Object Model**. Think of it like this:

When your browser opens a webpage, it reads the HTML file and converts it into a live tree of objects in memory. This tree is called the DOM. Every button, text, image, div — every single element on the page — becomes a "node" in this tree that JavaScript can read and modify.

For example:
```
HTML file has:  <h1>Smart Shelf</h1>
Browser builds: DOM node -> { tag: "h1", text: "Smart Shelf" }
```

### The Problem with Raw DOM
If you used raw JavaScript to update the page, every tiny change would:
1. Search through the ENTIRE DOM tree to find the changed element.
2. Remove the old element.
3. Insert the new one.
4. Repaint the screen.

This is extremely slow when you have hundreds of products, a live cart, and real-time updates all happening at once.

### How React Solves it with Virtual DOM
React creates a **Virtual DOM** — a lightweight copy of the real DOM kept in JavaScript memory.

When something changes in Smart Shelf (for example, cashier scans a QR and a product is added to cart):
1. React first updates its Virtual DOM (this is instant — it is just a JavaScript object change).
2. React then compares the new Virtual DOM vs the old Virtual DOM. This comparison is called **diffing**.
3. React finds ONLY the parts that actually changed — in this case, just the cart section.
4. React updates ONLY those specific elements in the real browser DOM.

This is why the POS billing screen feels instant — React only re-paints the cart list, not the entire page.

### Where is DOM used in Smart Shelf?
Every single page in your project uses it:
- When a product is scanned, React updates only the cart list div in the DOM.
- When the OTP is entered and verified, React updates only the login form section.
- When the analytics dashboard loads charts, React inserts chart elements into the DOM.

The entry point is `src/main.tsx`:
```typescript
ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
```
This one line mounts the entire React application into the single `<div id="root">` element in `index.html`. Everything React renders goes inside that one div.

---

## 2. How QR Code Generation Works (Deep Inside)

### What does QR code actually encode?
A QR code is a machine-readable 2D barcode. It encodes text as a pattern of black and white squares. In Smart Shelf, each QR code encodes a UUID (Universally Unique Identifier) — a random 128-bit number formatted as text.

Example UUID: `447a6284-ab1c-4be0-98d8-c96c70d124b0`

### Step-by-Step Inside the Code

**Step 1: Admin submits the product form in React**

React collects: name, category, price, manufacturing date, expiry date, stock quantity.

It calls Axios:
```javascript
axios.post('/api/products/', { name, category, price, ... })
```
This HTTP POST request travels over the internet to your Django backend on Render.

**Step 2: Django's ProductSerializer validates data**

In `core/serializers.py`, the `validate()` method checks:
- Is expiry date AFTER manufacturing date? If not, it throws a 400 Bad Request error.
- Is stock quantity positive?
- Is price positive?

**Step 3: UUID is generated inside `create()` method**

Python's `uuid.uuid4()` uses your computer's:
- Current timestamp
- Random bits from the operating system entropy pool
- MAC address of the network card

Combined, these create a number with `2^128` possible values — that is `340,282,366,920,938,463,463,374,607,431,768,211,456` possible combinations. The chance of two products getting the same UUID is basically zero.

**Step 4: qrcode library creates the matrix**

```python
qr = qrcode.QRCode(
    version=1,
    error_correction=qrcode.constants.ERROR_CORRECT_L,
    box_size=10,
    border=4
)
qr.add_data(str(product.qr_code_id))
qr.make(fit=True)
```

- `version=1` means a 21x21 grid. Version 2 = 25x25, Version 3 = 29x29, etc.
- `error_correction=L` means even if 7% of the QR code is damaged or dirty, the scanner can still read it.
- `box_size=10` means each black/white square is rendered as 10x10 pixels.
- `border=4` adds 4 squares of white space around the code (called quiet zone — required by QR standard).

**Step 5: Pillow renders the image into memory**

```python
img = qr.make_image(fill_color="black", back_color="white")
buffer = io.BytesIO()
img.save(buffer, format='PNG')
buffer.seek(0)
```

- `BytesIO()` is an in-memory file — like a RAM disk. The PNG bytes go here without touching disk yet.
- This is much faster than writing to disk first.

**Step 6: Django saves to media storage**

```python
product.qr_code_image.save(
    f'qr_{product.qr_code_id}.png',
    ContentFile(buffer.getvalue()),
    save=False
)
```

Django's `ImageField` writes the PNG file to `media/qr_codes/qr_<uuid>.png` on disk. The database saves just the file path string, not the image itself.

**Step 7: QR is scanned at POS**

The React POS page uses the device camera. When a QR is pointed at it:
1. The camera captures frames.
2. JavaScript QR library decodes the UUID from the frame.
3. React calls: `GET /api/billing/lookup/?qr_code_id=447a6284-...`
4. Django in `BillingLookupView` does: `Product.objects.get(qr_code_id=qr_code_id)`
5. Returns product JSON to React.
6. React adds it to the cart state.

---

## 3. How WhatsApp OTP Login Works (Deep Inside)

### Why WhatsApp OTP instead of password?

Traditional login: Customer needs to REMEMBER a password, RESET it when forgotten, risk getting hacked.

WhatsApp OTP: Customer only needs to HAVE their phone. More secure (someone needs your physical phone to login). More convenient.

### Exactly How it Works Inside

**Step 1: Customer types phone number**

React captures `9876543210` and calls:
```javascript
axios.post('/api/customers/request-otp/', { phone_number: '9876543210' })
```

**Step 2: Django receives and generates OTP**

In `views.py`, the `RequestOTPView`:
1. Formats phone: `9876543210` becomes `919876543210` (adding India country code +91).
2. Generates random 6-digit OTP:
   ```python
   otp_code = str(random.randint(100000, 999999))
   ```
3. Saves OTP to the PostgreSQL database in the `OTPCode` table:
   ```python
   OTPCode.objects.create(phone_number=formatted_phone, code=otp_code, expires_at=expiry_time)
   ```
   The `expires_at` is set to 5 minutes from now.
4. Calls the WhatsApp service:
   ```python
   send_whatsapp_message(formatted_phone, f"Your Smart Shelf OTP is: {otp_code}")
   ```

**Step 3: WhatsApp Service sends the message**

The WhatsApp microservice runs on Node.js separately. Django calls it via HTTP:
```
POST https://whatsapp-service-04k8.onrender.com/send-message
{ "phone": "919876543210", "message": "Your Smart Shelf OTP is: 482910" }
```

The Node.js service uses **Baileys** — a WebSocket client that speaks the same binary protocol as WhatsApp Web. When you scanned the QR, Baileys stored your WhatsApp session credentials in files. These credentials allow it to send messages as if you were logged into WhatsApp Web.

**Step 4: Customer enters OTP**

React sends:
```javascript
axios.post('/api/customers/verify-otp/', { phone_number: '9876543210', otp: '482910' })
```

**Step 5: Django verifies**

```python
otp_record = OTPCode.objects.filter(
    phone_number=phone,
    code=otp_code,
    expires_at__gt=timezone.now()  # must not be expired
).first()
```

If found AND not expired: login is successful.
Django creates (or finds) the Customer record in the database, then generates a **JWT token** (JSON Web Token).

**Step 6: JWT Token**

The JWT is a long encrypted string like:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxMjMsInJvbGUiOiJjdXN0b21lciJ9.xyz
```

It contains: customer ID, role ("customer"), and expiry time. This is sent back to React.

React stores this token in `localStorage` and includes it in every future API request header:
```
Authorization: Bearer eyJhbGciOiJIUzI1...
```

Django checks this token on every protected API endpoint.

---

## 4. How POS (Point of Sale) Billing Works

### What is POS?
POS stands for **Point of Sale**. It is the place where a customer pays for their products. In Smart Shelf, the POS is a web page that staff open on a tablet or phone at the checkout counter.

### Inside the Billing Flow

**The POS Dashboard (BillingDashboard.tsx)**

This React page has three sections:
1. A QR scanner input area at the top.
2. A live cart list in the middle.
3. A customer phone input and checkout button at the bottom.

**When QR is scanned:**

```typescript
// React state for cart items
const [cartItems, setCartItems] = useState<CartItem[]>([]);

// When QR decode succeeds:
const product = await apiClient.get(`/billing/lookup/?qr_code_id=${decoded}`);
setCartItems(prev => [...prev, product.data]);
```

React adds the product to the `cartItems` array in state. Because React watches this state, the DOM is automatically updated to show the new item in the cart — without refreshing the page.

**When checkout is clicked:**

```typescript
await apiClient.post('/checkout/', {
    customer_phone: '9876543210',
    items: cartItems.map(item => ({ product_id: item.id, quantity: 1 }))
});
```

**Django processes checkout:**

1. Finds the Customer by phone number.
2. Creates a `Purchase` record in PostgreSQL.
3. Creates `PurchaseItem` records for each product.
4. Reduces the `stock_quantity` of each product.
5. Triggers a Celery task to send WhatsApp receipt asynchronously.
6. Returns success response immediately.

The key word is "immediately" — Django does NOT wait for the WhatsApp message to be delivered before responding. It drops the task into Redis and returns success in milliseconds.

---

## 5. Gunicorn vs Docker — Are Both Being Used? (Honest Detail)

### The answer is: YES, BOTH! And they work TOGETHER.

This is a very important distinction:

**Docker is the container.** It is the box that wraps everything.
**Gunicorn is the engine that runs Django INSIDE that box.**

Think of it like a shipping container on a cargo ship:
- The **shipping container (Docker)** packages and protects everything.
- The **engine running inside (Gunicorn)** is what actually serves HTTP requests.

### What Docker does:
1. Reads your `Dockerfile`.
2. Installs Python 3.11, installs all pip packages from `requirements.txt`.
3. Runs the startup command defined at the bottom of the Dockerfile:
   ```dockerfile
   CMD ["sh", "-c", "python manage.py migrate && python manage.py collectstatic --noinput && gunicorn smartshelf.wsgi:application --bind 0.0.0.0:8000"]
   ```

### What Gunicorn does:
Gunicorn (Green Unicorn) is a WSGI (Web Server Gateway Interface) server.

Django by itself is NOT a web server. Django is a Python web framework — it knows how to handle requests and generate responses, but it does not know how to:
- Accept raw TCP connections from the internet.
- Handle multiple simultaneous requests.
- Manage worker processes.

Gunicorn does ALL of that. It:
1. Listens on port 8000 for incoming HTTP connections.
2. Spawns multiple **worker processes** (like multiple waiters in a restaurant).
3. Each worker handles one request at a time.
4. Passes each request to Django, gets the response, sends it back.

On Render's free tier: 0.1 CPU, so Gunicorn typically runs 1-2 workers.
On production servers: Gunicorn might run 4-8 workers on a 4-core machine.

### WSGI — What is smartshelf.wsgi:application?

WSGI is the standard interface between Python web frameworks and web servers. It defines: "Here is the entry point callable that Gunicorn should call for each HTTP request."

`smartshelf.wsgi:application` means:
- `smartshelf` = the Python package (folder `smartshelf/`)
- `wsgi` = the file `smartshelf/wsgi.py`
- `application` = the variable named `application` inside that file

```python
# smartshelf/wsgi.py
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartshelf.settings')
application = get_wsgi_application()  # This is the entry point
```

So the full chain on Render is:
```
Internet Request
     |
Render's Load Balancer (Render infrastructure)
     |
Docker Container (your smartshelf-backend container)
     |
Gunicorn (listening on port 8000, managing workers)
     |
Django (your actual Python code in views.py)
     |
PostgreSQL (your database)
```

---

## 6. How the AI Expiry Risk Predictor Works (Deep Inside with Real Code)

### Important Truth: This is NOT just a formula. It is a real Machine Learning model!

The AI uses **scikit-learn's RandomForestClassifier** — a real supervised machine learning algorithm.

### What is a Random Forest?

A Random Forest is a collection of many **Decision Trees** that vote together.

A single Decision Tree asks questions like:
```
Is days_until_expiry < 5?
    YES -> Is stock_quantity > 50?
            YES -> HIGH RISK (too much stock, too few days)
            NO  -> MEDIUM RISK
    NO  -> Is sales_speed < 0.5?
            YES -> HIGH RISK (selling very slowly)
            NO  -> LOW RISK
```

A Random Forest creates 50 such trees (`n_estimators=50`), each trained on a slightly different random subset of the data. When predicting, all 50 trees vote and the majority wins. This makes it much more accurate and resistant to overfitting than a single tree.

### What Data (Dataset) Does the Model Train On?

This is the key question. The model trains on TWO types of data:

**Source 1: Your Own Store's Real Product Data**

From your actual PostgreSQL database:
```python
products = Product.objects.all()
for product in products:
    features = extract_features(product, today)
    # features = [days_until_expiry, stock_quantity, sales_speed, price, category_id]
    days_to_sellout = stock / (speed + 0.001)
    target = 1 if days_to_sellout > days_left else 0
    # target = 1 means HIGH RISK (will expire before selling out)
    # target = 0 means LOW RISK (will sell out before expiry)
```

**Source 2: 200 Synthetically Generated Scenarios**

Because your database might only have 10-20 products when starting, 10 data points are NOT enough to train a machine learning model reliably. So the code generates 200 synthetic training examples:

```python
for _ in range(200):
    days_left = random.randint(1, 45)      # Random 1-45 days to expiry
    stock = random.randint(1, 100)          # Random 1-100 units in stock
    speed = round(random.uniform(0.1, 5.0), 2)  # Random 0.1-5 units sold/day
    price = round(random.uniform(1.0, 50.0), 2)
    cat_id = random.randint(1, 5)

    days_to_sellout = stock / (speed + 0.001)
    target = 1 if days_to_sellout > days_left else 0
```

This is called **synthetic data augmentation** — generating plausible fake scenarios to supplement limited real data. The model learns the underlying mathematical relationship between features and risk.

### What are the 5 Features the Model Uses?

```python
def extract_features(product, today=None):
    days_until_expiry = max(0, (product.expiry_date - today).days)  # Feature 1
    stock_quantity = product.stock_quantity                           # Feature 2
    sales_speed = calculate_sales_speed(product)                      # Feature 3
    price = float(product.price)                                      # Feature 4
    category_id = product.category_id                                 # Feature 5
    return [days_until_expiry, stock_quantity, sales_speed, price, category_id]
```

- **Feature 1 — days_until_expiry**: Fewer days = more urgent.
- **Feature 2 — stock_quantity**: More units in stock = harder to sell all before expiry.
- **Feature 3 — sales_speed**: Average units sold per day over the last 30 days. If a product sold 30 units in 30 days, speed = 1.0 unit/day.
- **Feature 4 — price**: Expensive items might sell slower.
- **Feature 5 — category_id**: Dairy products (category 1) might behave differently than Snacks (category 3).

### How the Model Calculates Sales Speed

```python
def calculate_sales_speed(product):
    thirty_days_ago = date.today() - timedelta(days=30)
    total_sales = SalesHistory.objects.filter(
        product=product,
        sale_date__gte=thirty_days_ago
    ).aggregate(total=Sum('quantity_sold'))['total']

    if total_sales is not None and total_sales > 0:
        return round(float(total_sales) / 30.0, 2)
    return 0.0
```

It queries the `SalesHistory` table in PostgreSQL, sums all units sold in the last 30 days, and divides by 30. If a product has never been sold, speed = 0.0.

### Model Training and Saving

```python
clf = RandomForestClassifier(n_estimators=50, max_depth=5, random_state=42)
clf.fit(X, y)
joblib.dump(clf, MODEL_PATH)
```

- `n_estimators=50` = 50 decision trees.
- `max_depth=5` = each tree can ask at most 5 questions deep (prevents overfitting).
- `random_state=42` = fixed random seed so results are reproducible.
- `joblib.dump()` saves the trained model to a `.joblib` file on disk.

### Prediction Process

```python
probabilities = model.predict_proba(features_array)[0]
risk_score = float(probabilities[high_risk_index])
```

`predict_proba` returns probabilities from all 50 trees. If 40 out of 50 trees say HIGH RISK, the probability returned is 0.80 (80% high risk).

### Risk Thresholds and Discount Calculation

```python
if risk_score >= 0.70:
    risk_level = "High"    # 70%+ probability of expiring unsold
elif risk_score >= 0.35:
    risk_level = "Medium"  # 35-70% probability
else:
    risk_level = "Low"     # Less than 35%

# Discount based on urgency
if risk_level == "High":
    if days_until_expiry <= 3:
        discount_percent = 50   # URGENT: 50% off
    elif days_until_expiry <= 7:
        discount_percent = 30   # 30% off
    elif days_until_expiry <= 14:
        discount_percent = 20   # 20% off
    else:
        discount_percent = 15   # 15% off
```

The final discounted price is calculated:
```python
discounted_price = original_price * (1.0 - (discount_percent / 100.0))
```

### Why AI Predictions? Why Not Just a Formula?

A simple formula like `if days_left < 5 and stock > 50: HIGH RISK` ignores:
- How fast does THIS specific product sell?
- Is this product expensive (people buy less)?
- Does this category typically sell out fast?
- What is the combination of all these factors together?

A Random Forest considers ALL 5 features simultaneously and learns complex interactions between them from historical data. It improves as more real sales data accumulates in your database.

---

## 7. How Nginx Works and How it Was Added

### What is Nginx?
Nginx (pronounced "Engine-X") is a web server. In your project, Nginx serves the React frontend.

### Why Not Just Serve the React Files Directly From a Browser?

When you run `npm run build` with Vite, it compiles all your React + TypeScript code into plain HTML, CSS, and JavaScript files in the `dist/` folder. These files need to be served from a web server.

Without Nginx:
- Files would just sit on disk doing nothing.
- No one could access them over the internet.

### How Nginx Was Added to Your Project

A `Dockerfile` in `smart-shelf-frontend/` uses a **multi-stage Docker build**:

**Stage 1 — Build (Node.js)**:
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
```
This installs Node.js, installs npm packages, runs `npm run build`, creating the `dist/` folder.

**Stage 2 — Serve (Nginx)**:
```dockerfile
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

This starts fresh with ONLY Nginx (no Node.js in production — it is not needed!). It copies ONLY the built `dist/` folder into Nginx's web root.

The final Docker image is tiny because it has no Node.js, no source code, no build tools — just Nginx + your compiled HTML/CSS/JS files.

### How Nginx Serves Your React App

The `nginx.conf` configuration:
```nginx
server {
    listen 80;
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

The critical line is `try_files $uri $uri/ /index.html`:
- If you visit `/dashboard`, Nginx looks for a file called `dashboard`. Does not exist.
- Instead of returning 404 Error, it serves `index.html`.
- React Router then reads the URL in the browser and shows the Dashboard component.

This is essential for **Single Page Applications (SPA)** like React. Without this line, if someone refreshes the page while on `/dashboard`, they would get a 404 error.

### Request Flow for Frontend

When you open `https://smart-shelf-frontend-grxl.onrender.com/billing`:
1. Your browser sends a GET request to Render.
2. Render forwards to the Nginx Docker container.
3. Nginx looks for a file named `billing`. Does not exist.
4. `try_files` kicks in: Nginx serves `index.html`.
5. Browser loads `index.html` which loads React JavaScript bundle.
6. React starts, reads the URL `/billing`, React Router shows `BillingDashboard` component.

---

## 8. What is Celery + Redis? (Background Tasks Deep Dive)

### The Problem

When a staff member clicks "Checkout", what happens next?
- Save purchase to PostgreSQL: 10 milliseconds
- Send WhatsApp message: 500-2000 milliseconds (network call to WhatsApp servers)

If Django waited for the WhatsApp to be delivered before responding, the cashier would see a loading spinner for 2 seconds on every single checkout. That is terrible UX.

### The Solution: Task Queue

Celery + Redis create a **task queue** — like a to-do list that runs in the background.

1. Django adds a task to the queue in Redis: "Send WhatsApp to 9876543210 with this receipt" (takes 1ms).
2. Django immediately returns "checkout successful" to React (cashier sees success instantly).
3. Meanwhile, a Celery worker process picks up the task from Redis.
4. Celery worker calls the WhatsApp service and delivers the message.

### How Redis Stores Tasks

Redis stores data in RAM (not disk), making it extremely fast. The task queue is stored as a Redis list:

```
Redis key: "celery" (default queue name)
Redis value: [task1_json, task2_json, task3_json, ...]
```

Each task is a JSON object: what function to call, what arguments to pass.

### Celery Beat (Scheduled Tasks)

Celery Beat is like a cron job manager. It runs on a schedule and automatically triggers tasks:
- Every day: Check all products for expiry risk, send WhatsApp alerts to affected customers.

---

## 9. How Baileys Sends WhatsApp Messages

### Old Method (we replaced): whatsapp-web.js + Puppeteer
This launched a real headless Chrome browser, loaded WhatsApp Web in it. Required 200MB+ Chrome binary and lots of RAM.

### New Method (Baileys): WebSocket
Baileys directly speaks WhatsApp's internal binary WebSocket protocol — the same protocol WhatsApp Web uses, but WITHOUT needing a browser.

When you scanned the QR code:
1. Baileys generated a key pair (public/private cryptographic keys).
2. The QR contained your session info + Baileys public key.
3. WhatsApp servers registered this session.
4. Baileys saved session credentials to files.

Now when sending a message:
1. Baileys loads saved credentials from files.
2. Opens a WebSocket connection to WhatsApp servers.
3. Encrypts the message using WhatsApp's Signal Protocol encryption.
4. Sends the encrypted message over the WebSocket.
5. WhatsApp server decrypts and delivers to recipient.

### Do You Need to Scan Again?

Once scanned and session saved to files, you do NOT need to scan again UNLESS:
- The files are deleted (container restart on free Render tier clears them).
- WhatsApp server invalidates your session (usually after 14 days of inactivity).

This is why on free Render, you may need to rescan after the container restarts due to inactivity.

---

## 10. Summary Table — Every Component Explained

| Component | Technology | Where | What Happens Inside |
| :--- | :--- | :--- | :--- |
| Web Pages | React + TypeScript | Browser | Virtual DOM, component state, React Router |
| Styling | TailwindCSS | Browser CSS | Utility classes compiled to CSS |
| API Calls | Axios | Browser | HTTP requests with JWT Authorization header |
| QR Scanner | React Camera | Browser | Camera frames decoded for QR UUID |
| Web Server (Frontend) | Nginx | Docker Container | Serves dist/ files, SPA routing fix |
| Web Framework | Django | Docker Container | URL routing, views, ORM queries |
| Production Server | Gunicorn | Inside Docker | Multiple worker processes, WSGI bridge |
| OTP Login | Django + Redis + Baileys | Backend + Node.js | Random 6-digit code, WhatsApp delivery |
| QR Generation | Python qrcode + Pillow | Django Backend | UUID -> Matrix -> PNG -> Disk |
| AI Predictor | scikit-learn Random Forest | Django Backend | 5 features, 50 trees, probability score |
| Training Data | DB Products + 200 Synthetic | Django Backend | Real sales + augmented scenarios |
| Chatbot | Groq API + LLaMA 3 | Django Backend | REST call to Groq, AI generates recipe |
| WhatsApp Sending | Baileys + Node.js | Node Container | WebSocket to WhatsApp, Signal encrypted |
| Background Tasks | Celery + Redis | Backend Workers | JSON task queue, async processing |
| Database | PostgreSQL | Render Managed DB | Tables: Products, Customers, Purchases, OTP |
| Containerization | Docker | Render Cloud | 3 containers, each isolated environment |
| Code Storage | Git + GitHub | GitHub.com | Version history, Render auto-deploys on push |

---
