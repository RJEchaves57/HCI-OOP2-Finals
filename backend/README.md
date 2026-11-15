# ROG API

Laravel 12 REST API for the ROG Elite front-end in the repository root. It
provides token authentication, a product catalogue with administrator-only
writes, and the loyalty rewards summary used by the member dashboard.

## Requirements

- PHP 8.2 or newer with `pdo_sqlite` (tested on PHP 8.2.12)
- Composer 2
- SQLite (default) or MySQL

## Setup

```bash
cd backend
composer install
copy .env.example .env      # cp .env.example .env on macOS/Linux
php artisan key:generate
php artisan migrate:fresh --seed
php artisan serve
```

The API is served at `http://localhost:8000/api`. Confirm it is running with:

```bash
curl http://localhost:8000/api/health
```

CORS is restricted to `FRONTEND_URL` (`http://localhost:3000` by default), so
the Vite dev server can call the API directly.

## Seeded accounts

| Role  | Email            | Password       | Points |
| ----- | ---------------- | -------------- | ------ |
| Admin | `admin@rog.test` | `Password123!` | 3200   |
| User  | `gamer@rog.test` | `Password123!` | 100    |

The seeder also creates a six-item catalogue (laptops, CPUs/motherboards and
graphics cards) so the dashboard and admin console have data immediately.

## Authentication

`POST /api/login` and `POST /api/register` return a Sanctum bearer token:

```json
{
  "message": "Signed in successfully.",
  "data": { "id": 1, "name": "Administrator Root", "role": "admin", "points": 3200, "rewards": { "...": "..." } },
  "token": "1|...",
  "token_type": "Bearer"
}
```

Send it on protected requests:

```http
Authorization: Bearer 1|...
Accept: application/json
```

## Endpoints

| Method | Path                 | Auth  | Description                                      |
| ------ | -------------------- | ----- | ------------------------------------------------ |
| GET    | `/api/health`        | —     | Service status                                   |
| POST   | `/api/register`      | —     | Create a member account and issue a token        |
| POST   | `/api/login`         | —     | Issue a token for existing credentials           |
| POST   | `/api/logout`        | Token | Revoke the current token                         |
| GET    | `/api/me`            | Token | Authenticated member profile with rewards data   |
| GET    | `/api/rewards`       | Token | Loyalty tier, points and progress percentage     |
| GET    | `/api/products`      | —     | Paginated catalogue (`category`, `search`, `per_page`) |
| GET    | `/api/products/{id}` | —     | Single catalogue item                            |
| POST   | `/api/products`      | Admin | Create a catalogue item                          |
| PUT    | `/api/products/{id}` | Admin | Replace a catalogue item                         |
| PATCH  | `/api/products/{id}` | Admin | Update selected catalogue fields                 |
| DELETE | `/api/products/{id}` | Admin | Delete a catalogue item                          |

Catalogue filters: `/api/products?category=gpu&search=strix&per_page=10`.
Valid categories are `laptop`, `cpu` and `gpu`.

### Loyalty tiers

| Tier     | Minimum points |
| -------- | -------------- |
| Explorer | 0              |
| Vanguard | 600            |
| Elite    | 1500           |
| Legend   | 3000           |

`GET /api/rewards` returns, for example:

```json
{
  "data": {
    "points": 100,
    "tier": "explorer",
    "tier_label": "EXPLORER",
    "next_tier": "vanguard",
    "next_tier_label": "VANGUARD",
    "next_tier_points": 600,
    "points_to_next_tier": 500,
    "progress_percent": 17
  }
}
```

New registrations receive a 100-point welcome bonus, matching the dashboard
copy ("EXPLORER TIER (100 / 600)").

## Project structure

```text
app/
  Enums/ProductCategory.php        laptop | cpu | gpu
  Http/Controllers/Api/            Auth, Product, Reward
  Http/Middleware/                 EnsureUserIsAdmin (alias: admin)
  Http/Requests/Api/               Form request validation
  Http/Resources/                  UserResource, ProductResource
  Models/                          User, Product
  Support/RewardTiers.php          Tier thresholds and progress maths
database/
  factories/                       UserFactory (admin state), ProductFactory
  migrations/                      users role/points, products
  seeders/DatabaseSeeder.php       Demo accounts and catalogue
routes/api.php                     API routes
tests/Feature/                     Auth, Product and Reward feature tests
tests/Unit/RewardTiersTest.php     Tier boundary tests
```

## Testing

```bash
php artisan test
```

The suite uses an in-memory SQLite database (configured in `phpunit.xml`) and
covers registration, login, token revocation, role enforcement, catalogue
CRUD, validation and tier calculations.

## Out of scope

Social sign-in, the Google account modal and password-reset email in the
front-end are UI demos; this API does not implement those providers.
