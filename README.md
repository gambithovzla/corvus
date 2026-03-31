# 🦅 CORVUS — Social Media Command Center

Sistema de comando centralizado para gestión de redes sociales con IA.
Arquitectura H.E.X.A. V4.

---

## Estructura del proyecto

```
corvus/
├── backend/                  ← Servidor (Railway)
│   ├── prisma/schema.prisma  ← Base de datos
│   ├── routes/
│   │   ├── ai.routes.js      ← Generación con Claude
│   │   ├── posts.routes.js   ← CRUD de posts
│   │   └── profiles.routes.js← CRUD de perfiles
│   ├── voiceProfiles.js      ← Personalidades por red social
│   ├── server.js             ← Servidor Express
│   └── railway.toml          ← Config de Railway
├── frontend/                 ← Interfaz (Vercel)
│   ├── src/
│   │   ├── lib/api.js        ← Cliente API
│   │   ├── App.jsx           ← Aplicación principal
│   │   ├── main.jsx          ← Entry point
│   │   └── index.css         ← Estilos
│   ├── index.html
│   └── vite.config.js
├── vercel.json               ← Config de Vercel
└── README.md                 ← Este archivo
```

---

## Despliegue paso a paso

### Paso 1: Subir a GitHub

1. Crea un nuevo repositorio en GitHub llamado `corvus`
2. Sube toda esta carpeta al repositorio

### Paso 2: Backend en Railway

1. Abre [railway.app](https://railway.app) con tu cuenta
2. Click **"New Project"** → **"Deploy from GitHub Repo"**
3. Selecciona el repo `corvus`
4. Railway detecta el `railway.toml` y configura automáticamente
5. **Agrega una base de datos PostgreSQL:**
   - Click "New" → "Database" → "PostgreSQL"
   - Railway genera la variable `DATABASE_URL` automáticamente
6. **Agrega las variables de entorno:**
   - Ve a la pestaña "Variables" del servicio backend
   - Agrega: `ANTHROPIC_API_KEY` = tu API key
   - Agrega: `FRONTEND_URL` = (lo llenarás después con la URL de Vercel)
7. Railway hace deploy automático. Copia la URL pública (algo como `corvus-backend-xxx.up.railway.app`)

### Paso 3: Frontend en Vercel

1. Abre [vercel.com](https://vercel.com) con tu cuenta
2. Click **"Add New Project"** → Importa el repo `corvus`
3. En **Root Directory** selecciona: `frontend`
4. En **Environment Variables** agrega:
   - `VITE_API_URL` = `https://corvus-backend-xxx.up.railway.app` (la URL de Railway)
5. Click **Deploy**
6. Copia la URL de Vercel (algo como `corvus-xxx.vercel.app`)

### Paso 4: Conectar ambos

1. Vuelve a Railway → Variables del backend
2. Actualiza `FRONTEND_URL` = `https://corvus-xxx.vercel.app`
3. Abre `vercel.json` y reemplaza `TU-BACKEND-RAILWAY.up.railway.app` con tu URL real de Railway
4. Haz commit y push — ambos se re-despliegan automáticamente

### Paso 5: Verificar

1. Abre `https://tu-url-railway.up.railway.app/health` — debe mostrar `{"status":"ok"}`
2. Abre `https://corvus-xxx.vercel.app` — debe cargar CORVUS
3. Genera tu primer post 🎉

---

## Variables de entorno

### Backend (Railway)
| Variable | Valor | Descripción |
|---|---|---|
| `DATABASE_URL` | (automática) | PostgreSQL de Railway |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Tu API key de Anthropic |
| `FRONTEND_URL` | `https://corvus-xxx.vercel.app` | Para CORS |
| `PORT` | (automática) | Railway lo asigna |

### Frontend (Vercel)
| Variable | Valor | Descripción |
|---|---|---|
| `VITE_API_URL` | `https://backend-xxx.up.railway.app` | URL del backend |

---

## Desarrollo local

```bash
# Terminal 1 - Backend
cd backend
cp .env.example .env     # Edita con tus valores
npm install
npx prisma generate
npx prisma db push
npm run dev

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```

Abre http://localhost:5173

---

## Roadmap

- [x] Fase 1: Generación de contenido con IA
- [x] Fase 1: Persistencia en PostgreSQL
- [x] Fase 1: Interfaz de comando central
- [ ] Fase 2: Integración X (Twitter) API
- [ ] Fase 2: Calendario visual / Kanban
- [ ] Fase 3: Instagram (Meta Graph API)
- [ ] Fase 3: Generación de imágenes con IA
- [ ] Fase 4: TikTok + YouTube
- [ ] Fase 4: Dashboard de analytics
