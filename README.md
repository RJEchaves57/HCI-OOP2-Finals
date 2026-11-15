# ROG Elite Web

Front-end for the ROG Elite experience, built with React, TypeScript, Vite,
React Router and Tailwind CSS.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

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
  pages/            LandingPage, LoginPage, SignupPage, ForgotPasswordPage
```

The Laravel API that backs this client lives outside this repository and is
unchanged by this front-end.
