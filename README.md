# Been-There 🧭

> **Know who’s been there before you.**

Been-There helps people make better spending and going decisions by showing which people they trust have already experienced a place and how often they have been there.

Instead of relying on anonymous, easily-gamed public 5-star reviews, Been-There prioritizes **trusted relationships**, **repeat visit history**, and **server-enforced privacy**.

---

## 🛠️ Technology Stack

- **Framework**: [Next.js](https://nextjs.org/) 16 (App Router, Turbopack)
- **Language**: [TypeScript](https://www.typescriptlang.org/) 5
- **UI & Styling**: [React](https://react.dev/) 19, [Tailwind CSS](https://tailwindcss.com/) v4, [Lucide Icons](https://lucide.dev/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) / [Supabase](https://supabase.com/)
- **ORM & Migrations**: [Drizzle ORM](https://orm.drizzle.team/) & Drizzle Kit
- **Input Validation**: [Zod](https://zod.dev/)
- **Testing**: [Vitest](https://vitest.dev/)
- **Package Manager**: [pnpm](https://pnpm.io/) (used exclusively)

---

## 📋 Prerequisites

- **Node.js**: v20.x or higher (tested on v24.x)
- **pnpm**: v9.x or higher (tested on v12.x)

```bash
# Verify versions
node -v
pnpm -v
```

---

## 🚀 Getting Started

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/ArpitK24/Been-There.git
cd Been-There

# Install dependencies (only pnpm is supported)
pnpm install
```

### 2. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env.local
```

Configure the environment variables in `.env.local`:

| Variable | Description | Example / Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string for Drizzle | `postgresql://postgres:postgres@localhost:5432/postgres` |
| `DATABASE_POOLER_URL` | Supabase connection pooler URL (optional) | `postgresql://postgres.[ref]:[pw]@[host]:6543/postgres?pgbouncer=true` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anonymous key for client auth | `your-anon-key` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only secret key | `your-service-role-key` |
| `NEXT_PUBLIC_APP_URL` | Base application URL | `http://localhost:3000` |

### 3. Database & Migrations

Been-There uses **Drizzle Kit** to manage migrations:

```bash
# Generate SQL migrations from Drizzle schema
pnpm db:generate

# Apply pending migrations to PostgreSQL database
pnpm db:migrate

# Push schema directly to database (development prototype)
pnpm db:push
```

### 4. Supabase Auth Configuration

Been-There uses **Supabase Auth with Email + Password** and requires email confirmation:

1. In your **Supabase Dashboard**:
   - Navigate to **Authentication** > **Providers** > **Email**.
   - Ensure **Enable Email provider** is **ON**.
   - Ensure **Confirm email** is **ON** (so new users receive an email verification link before their account is verified).
2. Under **Authentication** > **URL Configuration**:
   - Set **Site URL** to `http://localhost:3000` (or your deployed URL).
   - In **Redirect URLs**, add:
     - `http://localhost:3000/auth/callback`
     - `http://localhost:3000/**`
3. Disposable & temporary email domains are actively rejected before signup requests are submitted.

### 5. Running the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser:
- **/signup**: Register with email, password, username, and display name.
- **/login**: Sign in with email and password.
- **/verify-email**: Verification status screen with link resend functionality.
- **/profile**: Authenticated & verified user profile management.
- **/people**: Manage trusted connections ("Your People"), review incoming requests, and discover users by `@username`.

### 6. Phase 3 — Trusted Connections & Social Graph

Been-There connects people through explicit, two-way consent:
- **Discover**: Find users by `@username` via `GET /api/users/search?username=...`
- **Request**: Send connection requests via `POST /api/connections`
- **Review**: View incoming pending requests via `GET /api/connections/requests`
- **Accept / Decline**: Respond to requests via `PATCH /api/connections/:id`
- **Cancel**: Revert outgoing pending requests via `DELETE /api/connections/:id`
- **Manage**: View trusted connections via `GET /api/connections` and remove via `DELETE /api/connections/:id`
- **Privacy Guarantee**: Connection graphs are private to participants. Only `ACCEPTED` connections are included in the trust graph layer.

---

## 🧪 Testing & Quality Checks

Run the test suite, linting, and production build checks:

```bash
# Run unit & integration tests
pnpm test

# Run ESLint validation
pnpm lint

# Run Next.js production build and TypeScript check
pnpm build
```

---

## 🏛️ Architecture Overview

The repository enforces clean domain boundaries:

```text
src/
├── app/                  # Next.js App Router (pages and API Route Handlers)
│   ├── api/              # Server-side API endpoints (/api/places, /api/activities)
│   ├── layout.tsx        # Root application layout
│   └── page.tsx          # Homepage shell & search entry point
│
├── components/
│   ├── ui/               # Reusable primitive UI components (Button, Card, Badge, Input)
│   └── domain/           # Feature components
│       ├── places/       # PlaceCard, PlaceSearchInput, PlaceTrustSection
│       ├── activities/   # Activity logging and displays
│       └── people/       # Social connection components
│
├── lib/
│   ├── auth/             # Supabase Auth client & server session boundaries
│   ├── db/               # Centralized Drizzle client, connection pool, and schema
│   ├── places/           # Places provider adapter pattern (Mock, Google, OSM)
│   ├── privacy/          # Server-side visibility filtering and privacy rules
│   ├── trust/            # Trust evidence aggregator and metrics calculation
│   ├── validation/       # Reusable Zod input schemas (user, place, activity, privacy)
│   └── types/            # TypeScript domain types and contracts
│
├── server/               # Encapsulated backend domain services
│   ├── places/           # Places query and normalization logic
│   ├── activities/       # Experience summary mutations and critical trust queries
│   ├── connections/      # Connection lifecycle and relationship management
│   └── users/            # Profile and identity queries
│
└── tests/                # Automated domain and integration tests (Vitest)
```

For design decisions and domain rationale, refer to:
- [docs/decisions.md](docs/decisions.md)
- [Been-There System Architecture](docs/been-there-architecture.pdf)
