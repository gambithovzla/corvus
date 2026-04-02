# CORVUS Workspace

This repository contains the CORVUS project inside the `corvus/` directory.

The previous version of this root README had broken characters caused by a file encoding issue. This version keeps a clean, ASCII-safe format and points to the canonical docs.

## Project Location

- Main project: `corvus/`
- Main documentation: `corvus/README.md`

## Quick Start (Local)

1. Backend:
   - `cd corvus/backend`
   - `npm install`
   - `npx prisma migrate dev`
   - `npx prisma generate`
   - `npm run dev`
2. Frontend:
   - `cd corvus/frontend`
   - `npm install`
   - `npm run dev`

Open `http://localhost:5173`.

## Deploy Summary

- Backend target: Railway (`corvus/backend`)
- Frontend target: Vercel (`corvus/frontend`)
- Environment setup and endpoint details: see `corvus/README.md`
