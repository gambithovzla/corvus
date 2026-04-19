# CORVUS - Social Media Command Center

Sistema de comando centralizado para gestion de redes sociales con IA.
Arquitectura H.E.X.A. V4.

## Estructura del proyecto

```text
corvus/
|- backend/
|  |- prisma/
|  |  |- schema.prisma
|  |  `- migrations/
|  |- routes/
|  |  |- ai.routes.js
|  |  |- posts.routes.js
|  |  |- profiles.routes.js
|  |  `- x.routes.js
|  |- services/
|  |  |- voice.service.js
|  |  `- x.service.js
|  |- server.js
|  |- package.json
|  `- railway.toml
|- frontend/
|  |- src/
|  |  |- App.jsx
|  |  `- lib/api.js
|  `- package.json
`- README.md
```

## Fase actual

- [x] Fase 1: Generacion de contenido con IA
- [x] Fase 1: Persistencia en PostgreSQL
- [x] Fase 1: Interfaz de comando central
- [x] Fase 2: Integracion real con X (OAuth + preview + publicacion)
- [x] Fase 2.5: Integracion read-only con Content API de HEXA
- [ ] Fase 2: Calendario visual / Kanban
- [ ] Fase 3: Instagram (Meta Graph API)
- [ ] Fase 3: Generacion de imagenes con IA
- [ ] Fase 4: TikTok + YouTube
- [ ] Fase 4: Dashboard de analytics

## Variables de entorno

### Backend (`backend/.env`)

```env
DATABASE_URL="postgresql://usuario:password@host:puerto/corvus"
ANTHROPIC_API_KEY="sk-ant-xxxxx"
PORT=3001
FRONTEND_URL="http://localhost:5173"
REDIS_URL="redis://127.0.0.1:6379"
HEXA_BASE_URL="https://hexa-v4-production.up.railway.app"
HEXA_CONTENT_API_KEY=""
X_CLIENT_ID=""
X_CLIENT_SECRET=""
X_REDIRECT_URI="http://localhost:3001/api/x/callback"
X_SCOPES="tweet.read tweet.write users.read offline.access"
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=
```

- En local, puedes dejar `VITE_API_URL` vacio para usar proxy de Vite.
- En Vercel, usa la URL publica del backend.

## Desarrollo local

### 1) Backend

```bash
cd backend
npm install
npx prisma migrate dev
npx prisma generate
npm run dev
```

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Abrir: `http://localhost:5173`

## Deploy

### Railway (backend)

- Usa `backend` como root del servicio.
- `railway.toml` ejecuta:
  - `npx prisma generate`
  - `npx prisma migrate deploy`
  - `node server.js`

### Vercel (frontend)

- El repo ya incluye [vercel.json](</c:/proyectos/Corvus Project/corvus/vercel.json>) con:
  - `rootDirectory: "frontend"`
  - rewrite de `/api/*` hacia Railway
  - rewrite de `/health` hacia Railway
- Opcion recomendada:
  - importa este repo en Vercel
  - deja el root en `corvus`
  - no necesitas `VITE_API_URL` si quieres usar las rewrites del mismo dominio
- Si prefieres llamar directo al backend en vez de pasar por rewrites:
  - define `VITE_API_URL=https://corvus-production-4cd7.up.railway.app`

### Checklist para dejar CORVUS visible en web

1. Desplegar el frontend en Vercel usando la carpeta `corvus`.
2. Copiar la URL publica de Vercel, por ejemplo `https://corvus-web.vercel.app`.
3. En Railway, servicio `corvus` backend, actualizar:

```env
FRONTEND_URL=https://tu-frontend-en-vercel.vercel.app
```

4. Confirmar que `X_REDIRECT_URI` en Railway siga apuntando al backend de Railway:

```env
X_REDIRECT_URI=https://corvus-production-4cd7.up.railway.app/api/x/callback
```

5. Redeploy del backend en Railway para que CORS y el callback final regresen al frontend correcto.

### URLs de prueba despues del deploy

- Frontend:
  - `https://tu-frontend-en-vercel.vercel.app`
- Backend proxied desde Vercel:
  - `https://tu-frontend-en-vercel.vercel.app/health`
  - `https://tu-frontend-en-vercel.vercel.app/api/sources/hexa/health`
  - `https://tu-frontend-en-vercel.vercel.app/api/signals?source=hexa`

## Endpoints principales

### IA / Posts / Profiles

- `POST /api/ai/generate`
- `GET|POST /api/posts`
- `PATCH /api/posts/:id`
- `DELETE /api/posts/:id`
- `GET|POST /api/profiles`
- `POST /api/profiles/seed`
- `GET /api/signals?source=hexa&kind=...`
- `GET /api/sources/hexa/health`
- `POST /api/sources/hexa/sync`

### X (Twitter)

- `GET /api/x/auth-url?profileId=...`
- `GET /api/x/callback`
- `GET /api/x/status/:profileId`
- `POST /api/x/preview`
- `POST /api/x/publish/:postId`

## Notas de comportamiento

- Los tokens de X se almacenan solo en backend (no se exponen al frontend).
- Un post de Twitter solo pasa a `published` cuando X responde exito real.
- Si falla la publicacion, se guarda `publishError` y el estado no se marca como publicado.
- La voz de IA ahora se resuelve por `profileId` real en BD (`voicePrompts`) con fallback por defecto.
- CORVUS puede sincronizar picks, board signals, insights, performance snapshots y referencias de highlights desde HEXA.
- La sync de HEXA intenta primero `/api/content/v1/*` y, si hace falta, cae en los endpoints legacy del backend de `hexa-v4`.
