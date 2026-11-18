StrideX — full stack (React + Django + MySQL)

```
stridex-fullstack/
  frontend/   your React app (already patched to call the API)
  backend/    Django REST API + MySQL
```


## 1. Install once
- Python 3.10+  ·  Node 18+  ·  MySQL 8 (MariaDB 10.5+ also works)

## 2. Create the MySQL database
Open the MySQL shell (`mysql -u root -p`) and run:
```sql
CREATE DATABASE stridex CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'stridex_user'@'localhost' IDENTIFIED BY 'choose-a-password';
GRANT ALL PRIVILEGES ON stridex.* TO 'stridex_user'@'localhost';
FLUSH PRIVILEGES;
```

## 3. Start the backend (terminal 1)
```bash
cd backend
python -m venv venv
venv\Scripts\activate            # Windows   (Mac/Linux: source venv/bin/activate)
pip install -r requirements.txt

copy .env.example .env           # Mac/Linux: cp .env.example .env
# open .env and set DB_PASSWORD (and DJANGO_SECRET_KEY)

python manage.py makemigrations  # turns models.py into migration files
python manage.py migrate         # creates the tables in MySQL
python manage.py seed_products   # loads your 18 products
python manage.py createsuperuser # your admin login
python manage.py runserver       # API now at http://127.0.0.1:8000
```
Check it: open http://127.0.0.1:8000/api/products/ — you should see JSON.
Also try Django's built-in admin: http://127.0.0.1:8000/admin/

## 4. Start the frontend (terminal 2)
```bash
cd frontend
npm install
npm run dev                      # http://localhost:5173
```
Put your product images in `frontend/public/images/` (see the README.txt there).

## 5. How they're connected
```
Browser ──► Vite dev server :5173 ──(proxy /api and /pay)──► Django :8000 ──► MySQL
```
- `frontend/vite.config.js` forwards `/api/*` to Django, so React just calls `fetch("/api/products/")`.
- `frontend/src/api.js` is the ONLY file that knows URLs; contexts/pages call its functions.
- Django also allows `http://localhost:5173` via CORS (`CORS_ALLOWED_ORIGINS`) for when you
  deploy the two on different domains.

## 6. Try the whole thing
1. **Shop**: homepage/shop now load from MySQL.
2. **Admin** `/admin` (React): sign in with your superuser → add/edit/delete a product → refresh; it persists. Open the site in another browser: the change is there too.
3. **Cash on delivery**: add shoes → checkout → COD → order confirmed; stock drops; order shows in admin.
4. **Online payment (sandbox)**: choose Card/Koko/Mintpay/PayZ → redirected to a fake payment page → click *success* (order confirmed, back to the shop) or *fail* (order cancelled, stock restored, cart kept).
5. **Chat**: works immediately with the keyword fallback. For the real LLM, put `ANTHROPIC_API_KEY=...` in `backend/.env` and restart Django. It uses Claude with tool calls against your live catalog.

## 7. Read the code in this order (learning path)
| Step | File | Concept |
|---|---|---|
| 1 | `catalog/models.py` | models = MySQL tables |
| 2 | `catalog/serializers.py` | model ⇄ JSON |
| 3 | `catalog/views.py` + `urls.py` | ViewSet gives full CRUD; permissions |
| 4 | `config/settings.py`, `config/auth.py` | settings, `.env`, token login |
| 5 | `orders/services.py` | transactions, row locking, server-side pricing |
| 6 | `orders/views.py` | validating input, calling services |
| 7 | `payments/providers.py`, `services.py`, `views.py` | provider pattern, redirect + webhook flow |
| 8 | `chat/tools.py`, `chat/llm.py` | LLM tool-calling loop |
| 9 | `frontend/src/api.js` → `context/ProductsContext.jsx` | how React consumes the API |

## 8. API reference
| Method | URL | Who | Purpose |
|---|---|---|---|
| GET | `/api/products/` | anyone | list products |
| POST/PATCH/DELETE | `/api/products/` , `/api/products/<id>/` | staff | manage products |
| POST | `/api/products/reset/` | staff | reload seed catalog |
| POST | `/api/auth/login/` | anyone | `{username,password}` → token |
| POST | `/api/orders/` | anyone | place order (ids/sizes/qty only) |
| GET | `/api/orders/` | staff | all orders |
| GET | `/api/orders/<ref>/` | anyone with ref | one order |
| PATCH | `/api/orders/<ref>/` | staff | `{"status":"shipped"}` (`cancelled` restocks) |
| POST | `/api/chat/` | anyone | `{message, history}` → `{text, products}` |

Quick test without React:
```bash
curl -X POST http://127.0.0.1:8000/api/chat/ -H "Content-Type: application/json" -d "{\"message\":\"what's on sale?\"}"
```

## 9. What is real vs. not (read this)
- **Real**: products CRUD, staff login, orders with server-side prices, transactional stock
  control, restock on failed payment, cash on delivery, LLM chat.
- **Sandbox only**: online payments. Koko, Mintpay, PayZ and card gateways each need a merchant
  account and their own developer docs. `payments/providers.py` has a `LiveProvider` skeleton
  showing exactly where that code goes (create payment → hosted checkout URL → verified webhook).
  I did not guess at their APIs. Ask each provider for their sandbox credentials, then build one
  at a time. Keep `PAYMENT_MODE=sandbox` until then.
- **Not built (good next exercises)**: order confirmation emails, product reviews table (the
  frontend still keeps reviews in localStorage), contact form + newsletter endpoints, image
  uploads (images are still paths like `/images/panda.avif`), server-side cart.

## 10. Before putting it on the internet
Set `DJANGO_DEBUG=False`, a long random `DJANGO_SECRET_KEY`, real `ALLOWED_HOSTS`, HTTPS,
update `FRONTEND_URL`/`BACKEND_URL`/CORS, never expose the MySQL port publicly, and keep
`PAYMENT_MODE=sandbox` OFF in production (the sandbox page would let anyone "pay" for free —
it only works when `PAYMENT_MODE=sandbox`).

## Troubleshooting
- **`Access denied for user`** → wrong `DB_USER`/`DB_PASSWORD` in `.env`, or the GRANT step was skipped.
- **`Can't connect to MySQL server`** → MySQL isn't running / wrong `DB_PORT`.
- **`cryptography` / `caching_sha2_password` error** → `pip install cryptography`.
- **Red banner "Can't reach the server"** → Django isn't running on port 8000.
- **Admin says "Incorrect username or password"** → use the account from `createsuperuser` (must be staff).
- **Broken product images** → add the image files to `frontend/public/images/`.
- **Changed models.py?** → `python manage.py makemigrations` then `migrate`.

### 11. No-Code Admin Dashboard

StrideX includes a dedicated admin dashboard that allows shop owners to manage their online store without writing or modifying code.

**Admin capabilities:**
- Add, edit and delete products.
- Upload new product images.
- Replace or remove existing product images.
- Update product prices and discounts.
- Manage stock quantities and available shoe sizes.
- View and manage customer orders.
- Manage the store through a centralized interface.

This provides shop owners with an easier way to maintain and update their online store independently.
