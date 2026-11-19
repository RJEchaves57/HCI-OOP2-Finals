# ROG Elite Web

Front-end for the ROG Elite experience, built with React, TypeScript, Vite,
React Router and Tailwind CSS.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

No local API server is needed: the app includes a browser-backed API that
mirrors the endpoints in [`../backend`](../backend/README.md). Starting from
the repository root with `npm run dev` launches the app; if port 3000 is taken
it prints the port it uses instead. The root `vercel.json` deploys this folder
to Vercel as a static site.

## Scripts

- `npm run dev` — start the Vite dev server on port 3000
- `npm run build` — type-check with TypeScript and build for production
- `npm run preview` — preview the production build
- `npm run lint` — run ESLint
- `npm run typecheck` — run TypeScript without emitting files

## Routes

- `/` — ROG Elite landing page
- `/login` — account login, member dashboard and admin console
- `/signup` — account registration
- `/forgot-password` — password recovery

## Project Structure

```text
index.html
vite.config.ts
src/
  main.tsx          app entry + BrowserRouter
  App.tsx           route table
  index.css         Tailwind entry + ROG font
  components/       Header, Footer
  hooks/            usePageTitle
  lib/              API client for the Laravel backend
  pages/            LandingPage, LoginPage, SignupPage, ForgotPasswordPage
```

## API Connection

By default this client uses a browser-local API (`localStorage`) that matches
the Laravel 12 API in [`../backend`](../backend/README.md): same accounts,
tokens, catalogue, rewards and validation messages. No server is required, and
the build can be deployed to Vercel as-is.

To use a hosted Laravel API instead, set `VITE_API_URL`:

```bash
# frontend/.env
VITE_API_URL=https://your-api.example.com/api
```

Wired features:

- Sign-up and sign-in (`POST /api/register`, `POST /api/login`) with a Sanctum
  bearer token kept in `localStorage` (`rog_api_token`) and restored through
  `GET /api/me` on reload.
- Catalogue and product counts loaded from `GET /api/products`.
- Admin console creates products through `POST /api/products` (admin role
  only).
- Rewards dashboard shows the real tier, points and progress from
  `GET /api/rewards`.
- Logout revokes the token through `POST /api/logout`.

Seeded accounts: `admin@rog.test` and `gamer@rog.test`, password
`Password123!`. The Google account modal and password-recovery screen remain UI
demos because the API does not implement those providers.
