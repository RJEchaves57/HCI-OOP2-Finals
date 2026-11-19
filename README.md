# ROG Elite

Two projects in one repository:

```text
frontend/   React + TypeScript + Vite + React Router + Tailwind CSS
backend/    Laravel 12 + Sanctum REST API
scripts/    Dev launcher
```

## Run everything

From this folder:

```bash
npm run dev
```

That starts both servers and streams their logs with `[api]` / `[web]` prefixes.
The URLs it actually uses are printed at the top:

- App: <http://localhost:3000/login>
- API: <http://localhost:8000/api>
- Health check: <http://localhost:8000/api/health>

Press `Ctrl+C` once to stop both.

Run just one side when needed:

```bash
npm run dev:backend    # Laravel only
npm run dev:frontend   # Vite only
```

Ports default to `3000` (app) and `8000` (API). If another program already
holds one of them, the launcher moves to the next free port, rewires the
backend's `FRONTEND_URL` CORS setting and the app's `VITE_API_URL` to match,
and prints the URLs it used. Set `FRONTEND_PORT` / `API_PORT` to choose the
starting ports yourself.

## First-time setup

Front-end dependencies are already installed in `frontend/`; if you move the
project or clone it fresh:

```bash
cd frontend
npm install
```

Back-end dependencies and database:

```bash
cd backend
composer install
copy .env.example .env       # cp on macOS/Linux
php artisan key:generate
php artisan migrate:fresh --seed
```

## Demo accounts

| Role  | Email            | Password       |
| ----- | ---------------- | -------------- |
| Admin | `admin@rog.test` | `Password123!` |
| User  | `gamer@rog.test` | `Password123!` |

The API base URL defaults to `http://localhost:8000/api`; override it with
`VITE_API_URL` in `frontend/.env`. See
[`frontend/README.md`](frontend/README.md) and [`backend/README.md`](backend/README.md)
for details.
