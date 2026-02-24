# 🚀 Gaming Store Backend — Run Guide

This guide explains how to run the backend locally with PostgreSQL, Prisma, and Redis.

---

# 1. Prerequisites

Install required tools:

```bash
brew install node
brew install postgresql
brew install redis
```

Verify:

```bash
node -v
psql --version
redis-server --version
```

---

# 2. Start PostgreSQL

Start service:

```bash
brew services start postgresql
```

If services fail, run manually:

```bash
pg_ctl -D /opt/homebrew/var/postgresql@14 -l /tmp/postgres.log start
```

Create database:

```bash
createdb gaming_store
```

Verify:

```bash
psql -l
```

---

# 3. Start Redis

```bash
brew services start redis
```

or manual:

```bash
redis-server
```

Verify:

```bash
redis-cli ping
```

Expected:

```
PONG
```

---

# 4. Configure Environment Variables

Create `.env` in project root:

```
gaming-store-backend/.env
```

Example:

```env
NODE_ENV=development
PORT=4000

DATABASE_URL=postgresql://<your-mac-username>@localhost:5432/gaming_store?schema=public

FRONTEND_URL=http://localhost:3000
COOKIE_SECURE=false

JWT_ACCESS_PRIVATE_KEY=dev_access_private
JWT_ACCESS_PUBLIC_KEY=dev_access_public
JWT_REFRESH_SECRET=dev_refresh_secret_very_long_string_here

REDIS_URL=redis://127.0.0.1:6379
```

Find your mac username:

```bash
whoami
```

---

# 5. Install Dependencies

```bash
npm install
```

---

# 6. Run Prisma Migration

Creates all database tables.

```bash
npx prisma migrate dev --name init
```

Optional GUI:

```bash
npx prisma studio
```

---

# 7. Run Backend Server

Development mode:

```bash
npm run dev
```

Expected output:

```
API running on :4000
```

---

# 8. Test Backend

Health check:

```bash
curl http://localhost:4000/health
```

Expected:

```json
{ "ok": true }
```

Products:

```bash
curl "http://localhost:4000/api/v1/products?page=1&limit=5"
```

---

# 9. Test with Postman

Import:

```
gaming-store-backend.postman_collection.json
```

Set:

```
baseUrl = http://localhost:4000
```

---

# 10. Stop Services

```bash
brew services stop postgresql
brew services stop redis
```

---

# Common Issues

### DATABASE_URL undefined

Make sure `.env` exists in project root.

---

### Prisma connection error

Verify Postgres running:

```bash
pg_isready
```

---

### Redis connection error

Start Redis:

```bash
brew services start redis
```

---

# System Architecture (Dev)

```
Node.js (Express)
        │
        ├── Prisma ORM
        │        │
        │        └── PostgreSQL
        │
        └── Redis
```
