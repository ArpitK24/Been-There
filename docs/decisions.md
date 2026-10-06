# Architecture Decisions & Implementation Log

This document records key implementation choices and domain modeling decisions made during the foundation and hardening phases of **Been-There**, complementing the primary system architecture document (`docs/been-there-architecture.pdf`).

---

## 1. Architecture Documentation Availability

- **Decision**: The primary system architecture specification (`docs/been-there-architecture.pdf`) is **tracked directly in Git** and maintained under `docs/`.
- **Rationale**: Both human engineers and autonomous coding agents (`AGENTS.md`) require persistent access to the canonical architecture document to prevent domain drift. It is explicitly exempted from Git ignore rules.

---

## 2. Backend Configuration & Mock Isolation

- **Decision**: Development and production environments must **never silently fall back to fake backend data or mock authentication sessions**.
- **Enforcement**:
  - If required backend configuration (`DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) is missing, the application fails immediately with a clear, actionable error instructing the developer to update `.env.local`.
  - Database queries and server-side authentication fail loudly on connection/configuration errors rather than silently substituting mock seed records.
  - Mocks are only permitted when explicitly named (e.g., `MockPlaceProvider` as an intentional development/test provider adapter) or when activated under an explicit test mode (`APP_MODE=test` or Vitest test runners).

---

## 3. Activity Domain Semantics: Experience Summary Model

- **Decision**: For the MVP, an Activity is a **single experience summary per user/place**, answering: *"Has this person experienced this place, and what was their experience?"*
- **Model Details**:
  - Enforced by a database-level unique index on `(user_id, place_id)`.
  - The model intentionally does **not** represent every individual visit or maintain an event-sourcing history table.
  - The `type` field distinguishes the primary experience mode (`VISITED` vs. `ORDERED`). Because of the `UNIQUE(user_id, place_id)` constraint, a user has one primary experience summary per place in the MVP. If future product phases require distinct concurrent dine-in and delivery history, the schema will be evolved intentionally.
  - Constraints: `visit_count >= 1` (enforced by CHECK constraint and Zod schema), recommendation constrained to `RECOMMEND`, `NEUTRAL`, `DO_NOT_RECOMMEND`, and visibility constrained to `PRIVATE` or `CONNECTIONS`.
  - Server-side ownership validation prevents one user from updating or deleting another user's activity.

---

## 4. Social Graph & Connection Integrity

- **Decision**: Enforce relationship integrity at the database engine level.
- **Implementation**:
  - **Self-connection prevention**: Table CHECK constraint `chk_no_self_connection (requester_id <> recipient_id)`.
  - **Bidirectional uniqueness**: PostgreSQL functional unique index on `(LEAST(requester_id, recipient_id), GREATEST(requester_id, recipient_id))`. This mathematically prevents simultaneous or inverted entries like `(A, B)` and `(B, A)`.
  - Lifecycle states: `PENDING`, `ACCEPTED`, `REJECTED`, `BLOCKED`, `REMOVED`. Only `ACCEPTED` connections are eligible for trusted activity resolution.

---

## 5. Trust Aggregation & Privacy Boundary

- **Decision**: Privacy filtering strictly precedes evidence calculation to prevent information leakage through aggregate metrics.
- **Sequence**:
  ```text
  Current user (Viewer)
      ↓
  Accepted connections (status = ACCEPTED only)
      ↓
  Activities belonging to those connections at Requested Place
      ↓
  Visibility filtering (canViewerAccessActivity)
      ↓
  Safe aggregation (metrics computed only from authorized entries)
      ↓
  Viewer-visible result
  ```
- **Guarantees**:
  - `PRIVATE` activities and activities from `PENDING`/unrelated users are completely excluded prior to computing counts.
  - Private activity never influences connection counts, total visits, recommendation distributions, or repeat visitor statistics for third-party viewers.
  - UI components only consume already-authorized, aggregated data from server endpoints.

---

## 6. Places Provider Abstraction

- **Decision**: External place providers are decoupled behind a `PlaceProvider` interface (`searchPlaces`, `getPlace`).
- **Rationale**:
  - Third-party data structures and provider IDs do not leak into Been-There domain entities.
  - Canonical places are identified by internal Been-There UUIDs, preserving provider references via a compound unique index `(provider, provider_place_id)`.
  - The built-in `MockPlaceProvider` allows local development and automated testing without external API dependencies.

---

## 7. Package Manager & Tooling

- **Decision**: **pnpm** is used exclusively.
- **Lockfile Policy**: `pnpm-lock.yaml` only; `package-lock.json` and `yarn.lock` are strictly prohibited.
- **Testing**: `vitest` runs unit and integration test suites covering domain validation, privacy boundaries, and trust evidence aggregation.

---

## 8. Phase 2 — Authentication Architecture & Separation of Concerns

- **Decision**: **Supabase Auth with Email + Password** is the sole authentication mechanism for Phase 2.
- **Paid Providers Excluded**: No phone auth, SMS OTP (Twilio), third-party OAuth (Google, Apple, Meta), or paid transactional email services (Resend, SendGrid, Brevo, Mailgun). The initial foundation relies exclusively on Supabase's built-in email confirmation capabilities.
- **Identity & Profile Separation**:
  - Supabase Auth owns credentials, password hashing, verification tokens, and JWT sessions (`auth.users`).
  - The Been-There application schema owns domain profile data in `public.users` (`id`, `username`, `display_name`, `avatar_url`, `created_at`, `updated_at`).
  - `public.users.id` matches `auth.users.id` (UUIDv4) as a 1:1 foreign identity.
- **Email Verification as a Domain Gate**:
  - Distinguishes clearly between an *authenticated session* and an *email-verified account*.
  - `requireAuthenticatedUser()` confirms an active session.
  - `requireVerifiedUser()` evaluates `email_confirmed_at || confirmed_at`. Protected user actions and pages redirect unverified accounts to `/verify-email`.
- **Disposable Email Protection**:
  - Maintainable domain blocklist (`DISPOSABLE_EMAIL_DOMAINS`) evaluated via `validateSignupEmail()` prior to initiating Supabase Auth registration.
  - Rejects known temporary/burner email providers with actionable validation errors.
- **Self-Healing Profile Synchronization**:
  - Upon signup, `username` and `display_name` are included both in the initial `public.users` insert and in Supabase `user_metadata`.
  - If network, concurrency, or transaction latency delays profile insertion during registration, `UsersService.ensureProfile()` automatically synchronizes and creates the application profile from session metadata when the user completes confirmation (`/auth/callback`) or signs in.
- **Profile Authorization Guards**:
  - Profile updates are protected by server-side actor verification: `actorUserId === targetUserId`. A user can only modify their own profile attributes.
  - Username uniqueness is checked before mutation and protected by database unique constraints.

---

## 9. Phase 3 — Trusted Connections & Social Graph Architecture

- **Decision 1: Username as Primary Discovery Identifier**:
  - User discovery is strictly username-based (`@username` or `username`), case-normalized and stripped of leading `@`.
  - Display names are non-unique and therefore not used for deterministic user resolution.
  - Public search projects only minimal discovery attributes (`id`, `username`, `displayName`, `avatarUrl`, `connectionState`), never leaking emails, account timestamps, or auth identifiers.
- **Decision 2: Explicit Recipient Acceptance (No Inferred Relationships)**:
  - Been-There explicitly rejects inferred connections from email contacts, phone contacts, address books, location co-presence, or social network followings (Instagram, Facebook).
  - A relationship starts as `PENDING` when requested by User A and becomes active if and only if User B explicitly accepts it.
- **Decision 3: Only ACCEPTED Relationships Participate in the Trusted Graph**:
  - `ConnectionsService.getAcceptedConnectionIds` strictly filters on `status = 'ACCEPTED'`.
  - `PENDING`, `REJECTED`, and `REMOVED` relationships never participate in the trust graph, privacy evaluation (`canViewerAccessActivity`), or aggregate evidence calculations.
- **Decision 4: Bidirectional Pair Integrity & Re-Connection Semantics**:
  - Preserves the PostgreSQL functional unique index on `(LEAST(requester_id, recipient_id), GREATEST(requester_id, recipient_id))`.
  - When re-requesting a connection after a previous `REMOVED` or `REJECTED` state, the existing row is updated to `PENDING` rather than inserting a duplicate row, preventing unique index collisions.
- **Decision 5: Connection Graph Privacy**:
  - Connection graphs are strictly private between participants.
  - No public follower counts, connection counters, or third-party relationship discovery endpoints are exposed.
- **Decision 6: Contact/Social Imports Excluded from MVP**:
  - Contact synchronization, phone-number discovery, OAuth friend imports, and recommendation algorithms ("people you may know") are intentionally excluded to protect consumer trust and maintain architectural focus.
- **Decision 7: No Dedicated Notification Infrastructure in Phase 3**:
  - Incoming requests are surfaced dynamically via polling/view queries (`/api/connections/requests`). Push notifications, email digests, and websockets are deferred to avoid introducing external messaging broker dependencies.


