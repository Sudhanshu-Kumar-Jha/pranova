---
name: pranova-platform
description: Architectural guidelines, tech stack constraints, and development workflow for the PRANOVA Healthcare Coordination Platform.
---

# PRANOVA Healthcare Platform Skill

> Last verified against the working tree on **2026-10-17**. If something here disagrees
> with the code, the code wins — fix this file in the same change.

## 1. Role & Architectural Governance
As the Lead Architect & Developer on PRANOVA:
- Maintain a strict headless, API-first architecture. Every client talks REST/WebSocket; nothing shares a process.
- Backend routes live in Express/TypeScript under `src/routes` -> `src/controllers` -> `src/services`.
- Persistence is **MySQL** through Prisma ORM (`prisma/schema.prisma`).
- Admin Web is a React-Admin SPA (`admin-web/`) consuming the top-level REST endpoints.
- Both mobile clients are **React Native (Expo)** apps — `patient-app/` and `care-manager-app/`. Each has its own agent spec and skill file; read those before touching them.

## 2. Technology Stack
- **Backend:** Node.js, TypeScript (strict), Express 4, Prisma ORM, Socket.IO, JWT, Zod, bcryptjs.
- **Database:** **MySQL 8 / MariaDB on port 3306**, database `pranova_db`, configured by `DATABASE_URL` in the root `.env`.
  - The provider in `prisma/schema.prisma` is `mysql`. Write MySQL-compatible Prisma only — no `mode: 'insensitive'`, no Postgres array/JSON operators, no `citext`.
  - **SQL Reserved Keyword Mapping:** `model Case` in `prisma/schema.prisma` is mapped to table `cases` (`@@map("cases")`) because `CASE` is a reserved SQL keyword in MySQL.
  - **Long strings need an explicit column type.** Prisma maps `String` to `VARCHAR(191)` on MySQL, and this server does not run in STRICT mode, so anything longer is silently truncated instead of erroring. Every field that can exceed 191 characters carries `@db.Text`, and image/file `data:` URLs (`Setting.value`, `Medicine.imageUrl`, `Doctor.photoUrl`) carry `@db.LongText`. **Add the annotation whenever you add a free-text, URL or address column** — this bit the platform once already, truncating uploaded product images to 191 bytes. Setting `sql_mode=STRICT_TRANS_TABLES` on the server would turn future overflows into errors and is worth doing.
  - Startup is fail-fast: `src/db/connection.ts` `verifyDatabaseConnection` runs `SELECT 1` with retries before `server.listen`, and **never** falls back to embedded or mock storage. `src/db/bootstrap.ts` then syncs the `.env` super-admin and seeds default `Setting` rows.
  - `src/utils/prisma.ts` layers two Prisma `$extends`: a transient-connection retry with backoff (stops spurious 500s on the first request after an idle/reconnect) and the audit-immutability guard. Keep that order.
  - **Historical note:** the platform previously ran on embedded PGlite/PostgreSQL. `src/db/local-postgres.ts` and `src/db/standalone-db.ts` are deleted. Do not reintroduce them or any Postgres-only syntax.
- **Admin Panel:** React, TypeScript, Vite, React-Admin v5 (`ra-core` + `@mui/material` v5), socket.io-client.
- **Mobile Clients:** React Native + Expo (TypeScript). **No WebViews, ever.**
- **API Documentation:** OpenAPI 3.0 generated from route JSDoc into `swagger/swagger.json`; regenerate with `npm run generate:swagger`.
- **Video Consultation:** rooms are provisioned per appointment. The local implementation issues a mock room id + join URL + token (`issueVideoToken` in `src/services/appointment.service.ts`). Swap it for a real provider SDK (Agora / Twilio / 100ms / Daily) behind `VIDEO_BASE_URL` + provider keys; do not leak the mock shape into clients.

### 2A. Database workflow
```bash
npm install
# MySQL must be running on 127.0.0.1:3306 with database pranova_db
npm run prisma:push          # sync schema
npm run db:import            # restore existing platform records (src/scripts/import_data.ts)
# OR: npm run seed           # fresh baseline records
npm run dev                  # tsx watch src/server.ts  -> http://localhost:5000
```
Helpers: `src/scripts/export_data.ts` (dump), `src/scripts/verify_mysql.ts` (connectivity check),
`src/scripts/test_api_operations.ts` (API smoke run).
Stop the dev server before `prisma generate` on Windows — a running process locks the query-engine DLL (EPERM).

## 2B. Configuration & Environment (Bagisto-style, single source of truth)
- There is **ONE** environment file at the repository root: **`/.env`** (template `/.env.example`). Backend and Admin Web both read it.
  - Backend loads it via `src/config/env.config.ts` and exposes a typed `config` object. Add new backend settings there; never read loose `process.env` in feature code.
  - Admin Web reads the **same root `.env`** because Vite sets `envDir: '../'` (`admin-web/vite.config.ts`). Only `VITE_*` keys reach the browser (`VITE_API_URL`, `VITE_SOCKET_URL`).
  - The client never hard-codes an API/socket URL — import from `admin-web/src/config.ts`.
  - Mobile apps do **not** read the root `.env`; they resolve the host themselves (see their skills).
- **Swagger policy:** served at `/api-docs` **only when `ENABLE_SWAGGER=true`** (`config.swagger.enabled`, honored in `src/app.ts`), and **never linked from any client UI**. The explorer URL lives solely in `.env` / `.env.example` as `SWAGGER_URL`. Set `ENABLE_SWAGGER=false` in production and the route disappears.
- **Runtime settings vs `.env`:** `.env` holds deploy-time/secret config. Runtime, admin-editable branding (app name, tagline, logo, favicon, primary color, support email) lives in the DB `Setting` model and is edited on the admin **Settings** page. `GET /api/v1/settings` is **public** (the login screen needs branding before auth); `PUT /api/v1/settings` is admin-only.
- **Administrators:** admins create/suspend other admins via `/api/v1/admins` (`requireAdmin`). Passwords are bcrypt-hashed, `passwordHash` is never returned, and an admin cannot suspend their own account.

## 3. Strict Rules
- **No WebViews:** mobile apps are native React Native screens over REST/WebSockets.
- **Platform separation** — three surfaces, no crossing:
  - **Admin / Web:** top level of `/api/v1` (`/patients`, `/care-managers`, `/providers`, `/cases`, `/audit-logs`, `/admins`, `/settings`, `/specialties`, `/doctors`, `/appointments`, `/medicines`, `/orders`, `/diagnostic-tests`, `/lab-bookings`), guarded by `requireAdmin`.
  - **Patient app:** `/api/v1/app/*` (`src/routes/app.routes.ts`), guarded by `requirePatient`. The one exception is **`GET /app/config`**, mounted *before* the guard: it serves the administrator's branding and storefront rules publicly so the sign-in screen can brand itself. Keep it free of anything private.
  - **Care Manager app:** `/api/v1/cm/*` (`src/routes/cm.routes.ts`), guarded by `requireCareManager`. As on the patient surface, **`GET /cm/config`** is mounted *before* the guard and serves the same public branding payload.
  - `/api/v1/auth/*` is shared; OTP endpoints require an explicit `role` in the body (`PATIENT` / `CARE_MANAGER`).
- **Pagination is centralised:** every list uses `getPagination` and `getSort` from `src/utils/pagination.ts` (`perPage` clamped to 100, sort fields allow-listed per resource). Responses carry `{ data, total, page, perPage }`. Never hand-roll skip/take.
- **Audit immutability:** `AuditLog` and `CaseTimeline` are append-only. No update or delete routes, enforced again by the Prisma extension.
- **RBAC + Zod:** every route is wrapped in `authenticate` plus the matching role guard, and every body/query is validated by Zod middleware before the controller runs.

## 4. Consumer Platform Modules (Practo-style)
Each domain follows the same layered pattern — **validator -> service -> controller -> route (with OpenAPI JSDoc) -> admin-web resource**:
- **Consultation:** `Specialty`, `Doctor` (+ `DoctorSlot`), `Appointment` (VIDEO / AUDIO / IN_CLINIC with a provisioned room).
- **Pharmacy:** `Medicine` catalog, `MedicineOrder` + `OrderItem` — server-computed totals, stock decrement inside a transaction, restock on cancel.
- **Diagnostics:** `DiagnosticTest` catalog, `LabBooking` (HOME_COLLECTION / LAB_VISIT, status lifecycle, report attachment).

Status lifecycles are enforced server-side (`LAB_FLOW`, the order and case transition maps). Never let a client request an illegal transition successfully, and never price anything from client input.

### 4A. Admin-configured storefront rules
Delivery fee, free-delivery threshold, minimum order value and the accepted payment methods are **`Setting` rows**, read through `SettingsService.getPharmacyConfig()` and applied by `OrderService.place` on every order. They are editable on the admin **Settings** page under "Pharmacy checkout".
- Never hard-code a fee or threshold in a service or a client again — the previous constants in `order.service.ts` are gone.
- `MedicineOrder.paymentMethod` is `COD | ONLINE`. **No payment gateway is integrated**: `ONLINE` is rejected with a clear message unless `pharmacy_online_payment_enabled` is on, and nothing in the platform captures a payment. Do not present online payment to a patient as working.
- Product images (`Medicine.imageUrl`) are set in the console via `ui/ProductImageInput.tsx` — upload (inline `data:` URL, max 400 KB) or a hosted URL — and render in the admin list, the admin order detail, and the patient app's catalogue, cart and order review.

## 4B. Mobile clients share one architecture
Both apps are React Native (Expo) and must stay structurally identical: a public config call before
sign-in (`/app/config`, `/cm/config`), one config provider at the root, a Paper theme rebuilt from
the administrator's `primaryColor`, a branded splash that then routes, LAN host resolution in
`src/config.ts`, and an axios client that unwraps the response envelope and refreshes once on 401.
`patient-app/` is the reference implementation and `care-manager-app/` now matches it: same Expo SDK
(57 / RN 0.86 / React 19), same config provider, theme, splash, axios client and host resolution.
The care-manager app adds `expo-location` (GPS on duty + status updates) and a Socket.IO listener for
the backend's `admin:new_emergency` broadcast. Neither app may hard-code a brand colour, app name or
logo, invent placeholder data for a null field, or stack two headers on one screen. Remote push is
unimplemented on purpose: no surface exposes a device-token endpoint, so alerting is local only.

## 5. Admin Web UI system
- **Sticky Header & Fixed Nav Layout:**
  - The AppBar is `position: sticky` with height `APPBAR_HEIGHT = 61px` (desktop) and `APPBAR_HEIGHT_XS = 57px` (mobile) defined in `admin-web/src/theme.ts`.
  - The sidebar (`.RaSidebar-fixed`) is anchored flush below the AppBar (`top: APPBAR_HEIGHT`).
  - **Scroll Containment & Visibility:** `.RaSidebar-fixed` enforces `overscrollBehavior: 'contain'`, `overflowY: 'auto'`, and visible thin scrollbars (`scrollbarWidth: 'thin'`). Nav scrolling is fully self-contained: scrolling the mouse wheel over the nav will **never drag or move the main content/details screen**.
- **Tokens first:** `admin-web/src/design/tokens.ts` is the single source of colour, radius, elevation, motion, status tones and formatters (`statusMeta`, `humanize`, `formatINR`, `formatDateTime`, `plural`). No raw hex in components, no ad-hoc date or currency formatting.
- **Shared primitives** live in `admin-web/src/ui/`: `Panel` (Panel / PageHeader / DetailHeader / InfoGrid / InfoItem / PersonCell / SkeletonLines / facts / initials), `StatusChip`, `EmptyState`, `FormSection`, `ResponsiveDatagrid`, `StatusWorkflow`, `BrandMark`, `LocationLink`. Reach for these before writing bespoke layout.
- **Locations are always clickable, never raw coordinates.** Any address or lat/lng in the admin UI renders through `ui/LocationLink.tsx`, which shows the readable address (or "Pinned location") and on click opens a dialog with an embedded OpenStreetMap map (no API key, no SDK), a copyable GPS pin, and Google Maps / OpenStreetMap / Directions links. It is wired into the Case, Care Manager, Patient, Provider, Order and Lab Booking detail screens and the emergency alert dialog. Printing `12.97160, 77.59460` on screen is a regression.
- **Layout contract:** the AppBar is sticky and in flow (`APPBAR_HEIGHT` / `APPBAR_HEIGHT_XS` exported from `theme.ts`, matching the `Toolbar` `minHeight` in `AppBar.tsx`). `.RaSidebar-fixed` is anchored at `top: APPBAR_HEIGHT` with `height: calc(100vh - APPBAR_HEIGHT)`; React-Admin's default hides the first menu items behind our header. The sidebar uses `overflowY: 'auto'` **only** — adding `overscrollBehavior: 'contain'` kills the wheel over the nav whenever the menu fits.
- **Dashboard slug:** the dashboard is a `CustomRoutes` route at `/dashboard`; the `dashboard` prop renders a redirect so the bare root forwards there.
- Every list and detail screen handles loading, empty and error states; tables use `ResponsiveDatagrid`; numbers in tables carry `className="num"` for tabular figures.
- The console has its own spec and skill: `admin-web/AGENTS.md` and `admin-web/.agents/skills/admin-web/SKILL.md`.
- Only real backend data. No mock rows, placeholder stats, or hardcoded IDs in any screen.

## 5B. Patient location: registered address vs live position (read this before touching location)
Two different things live on `PatientProfile`, and conflating them caused a real dispatch bug
(a patient registered in Delhi had emergencies pinned to Delhi while they were in Bengaluru):
- **`latitude` / `longitude`** — coordinates of the **registered address** (`primaryAddress`). Used for
  pharmacy delivery. **Never** used as an incident or dispatch location, and never overwritten by a case.
- **`currentLatitude` / `currentLongitude` / `lastLocationUpdate`** — the **live device position**,
  mirroring the same trio on `CareManagerProfile`. This is the only thing dispatch may drive to.

Rules:
- `PATCH /app/location` (patient surface, `updateMyLocationSchema`) is the only writer of the live
  position. It writes the three telemetry columns and nothing else.
- The patient app reports a position **only while a case is open and the app is in the foreground**
  (`patient-app/src/providers/LiveLocationProvider.tsx`, ~60s). There is no background tracking, so
  the platform holds no location trail outside an emergency. The patient always sees it happening
  (`LocationSharingBanner`) — sharing a patient cannot see is not consent.
- `POST /app/sos` carries the live fix; `src/socket/emergency.handler.ts` resolves the incident
  location as **live fix -> last known position (<=15 min) -> null**, never the registered address,
  and stamps the timeline plus the `admin:new_emergency` payload with
  `locationSource: LIVE | LAST_KNOWN | NONE` so a dispatcher knows how trustworthy the pin is.
  `CaseService.create` applies the same fallback for cases registered in the console.
- **Access is consent-gated and case-scoped.** Raising a case calls
  `ConsentService.grantCaseLocationConsent` (scope `case:<id>`, 12h) and assigning a care manager
  extends it to them by name; any post-care status (`COMPLETED_AWAITING_PAYMENT`, `PAID`, `RESOLVED`,
  `CANCELLED`) calls `revokeCaseConsents`, so sharing stops with the emergency. The patient sees and
  can revoke these rows in the app like any other consent.
- Reads go through `PatientLocationService.getForCase`, served at `GET /cases/:id/patient-location`
  (admin) and `GET /cm/cases/:id/patient-location` (care manager). It enforces: case active, care
  manager actually assigned, and (for a care manager) unexpired consent. Admins skip only the consent
  check, exactly as `requireConsent` already does for documents. Every read appends a throttled
  `PATIENT_LOCATION_VIEWED` entry to the case timeline.
- Live movement is pushed as `patient:location` to `admin_room` and `care_manager_<id>` only, and only
  for patients with an open case.

## 6. Real-time
Socket.IO runs on the API port. Patients emit `patient_emergency`; the server writes an audit record and broadcasts `emergency_alert` to admin and care-manager sessions. The admin listener is `admin-web/src/components/EmergencyAlertListener.tsx`.
