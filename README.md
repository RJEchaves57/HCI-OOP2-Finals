# ROG Elite

```text
frontend/   React + TypeScript + Vite + React Router + Tailwind CSS
backend/    Laravel 12 + Sanctum REST API (optional standalone reference API)
scripts/    Dev launcher
```

## Run it

From this folder:

```bash
npm install --prefix frontend
npm run dev
```

Only the Vite dev server is started. The API runs inside the browser, so PHP,
Composer and a separate localhost server are not needed. The URL it uses is
printed at the top:

- App: <http://localhost:3000/login>

If port 3000 is taken, the launcher picks the next free port and prints it.
Set `FRONTEND_PORT` to choose a different starting port.

Press `Ctrl+C` once to stop it.

Run the app alone when needed:

```bash
npm run dev:frontend   # app (same as npm run dev)
npm run dev:backend    # no-op: there is no separate backend to start
```

## Deploy to Vercel

The repository root contains `vercel.json`, which builds `frontend/` and serves
`frontend/dist` with a SPA fallback. Import the repo into Vercel and deploy —
no environment variables are required.

## API connection

By default the app uses a browser-local API that mirrors the Laravel endpoints
and keeps accounts, tokens and the catalogue in `localStorage`. It is seeded
with the same demo accounts and catalogue as `backend/`.

To use a hosted Laravel API instead, set `VITE_API_URL` in `frontend/.env`:

```bash
VITE_API_URL=https://your-api.example.com/api
```

## Demo accounts

| Role  | Email            | Password       |
| ----- | ---------------- | -------------- |
| Admin | `admin@rog.test` | `Password123!` |
| User  | `gamer@rog.test` | `Password123!` |

See [`frontend/README.md`](frontend/README.md) and
[`backend/README.md`](backend/README.md) for details.
