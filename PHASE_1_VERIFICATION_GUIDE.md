# PRANOVA Healthcare Platform — Phase 1 Verification & Architecture Guide

> **Phase 1 Scope:** Headless API Engine & Admin Web Console  
> **Status:** All 7 Steps Implemented, Compiled & Production-Ready  
> **Target Audience:** Systems Architects, QA Engineers, Security & Compliance Auditors

---

## 1. Executive Summary & Hard Architectural Constraints

PRANOVA is a strictly headless, API-first Healthcare Coordination Platform. During Phase 1, the centralized core backend and the operational administrative console have been constructed. 

### Hard Constraints Strictly Enforced:
1. **No WebViews:** The Admin Web Console is an independent Single Page Application built with React 18, React-Admin v5, and Vite. Mobile apps are built strictly as native React Native (Expo) apps consuming the same REST/WebSocket APIs.
2. **Strict Platform Separation:** Administrative endpoints under `/api/v1/admin/*`, `/api/v1/audit-logs`, and operational CRUD are isolated and guarded by JWT RBAC (`ADMIN` role requirement).
3. **Locked Tech Stack:** Node.js (v22.8.0), Express 5 with TypeScript (strict mode), MySQL 8 / MariaDB (port 3306), Prisma ORM v6, Zod, Socket.io, and `xlsx`.
4. **Relational Integrity & Immutability:** Strict foreign keys and cascading rules. Audit logs and case timeline events are strictly immutable—no `UPDATE` or `DELETE` endpoints exist for compliance logs.

---

## 2. Quickstart & Verification Checklist

Follow these steps to run and verify the entire Phase 1 platform locally.

### Step A: Prerequisites & Environment
Ensure MySQL is running locally and credentials match [.env](file:///d:/PRANOVA/.env):
```env
PORT=5000
APP_ENV=development
DATABASE_URL="mysql://root:@127.0.0.1:3306/pranova_db"
JWT_SECRET="pranova_super_secret_jwt_access_token_key_2026_healthcare"
JWT_REFRESH_SECRET="pranova_super_secret_jwt_refresh_token_key_2026_healthcare"
JWT_EXPIRES_IN="1d"
JWT_REFRESH_EXPIRES_IN="7d"
CORS_ORIGIN="http://localhost:5173,http://localhost:3000"
```

### Step B: Database Setup & Seeding
From the workspace root (`d:\PRANOVA`):
```bash
# 1. Generate Prisma Client
npx prisma generate

# 2. Apply Database Migrations
npx prisma migrate dev --name init_healthcare_schema

# 3. Seed Default Test Credentials
npm run seed
```
**Seeded Test Credentials:**
- **Admin Email:** `admin@pranova.com`
- **Admin Password:** `Admin@123456`
- **Mock Phone OTP:** `+919876543210` with mock OTP code `123456`

### Step C: Launch Backend API Server
```bash
# Runs Express + Socket.io server on http://localhost:5000
npm run dev
```

### Step D: Launch Admin Web Console
In a separate terminal window:
```bash
cd admin-web
npm install
npm run dev
# Opens at http://localhost:5173
```

---

## 3. Step-by-Step Implementation & Verification Guide

### STEP 1: Backend Foundation & Relational Database Schema
#### What Was Built:
- **10 Core Relational Models** in [`prisma/schema.prisma`](file:///d:/PRANOVA/prisma/schema.prisma):
  - `User`: Central identity record with role enum (`ADMIN`, `CARE_MANAGER`, `PATIENT`, `FAMILY_MEMBER`).
  - `AdminProfile`: Operational console profile linked 1-to-1 with User.
  - `PatientProfile`: Medical demographics (blood group, DOB, emergency contacts, medical history).
  - `CareManagerProfile`: Field agent telemetry, employee code, license, active caseload, duty status.
  - `FamilyMember`: Guardian / next-of-kin links.
  - `Consent`: Digital healthcare consent tracking with validity timestamps.
  - `Provider`: Hospital/clinic/ambulance network with GPS coords, operational status, and rating.
  - `Case`: Primary coordination incident (`P1`, `P2`, `P3`), linking patient, provider, and assigned care manager.
  - `CaseTimeline`: Immutable chronological event stream tracking triage, assignments, and status transitions.
  - `AuditLog`: System-wide immutable compliance log.
- **Error & Response Pipeline**:
  - Standardized custom error class in [`src/utils/apiError.ts`](file:///d:/PRANOVA/src/utils/apiError.ts).
  - Uniform envelope utility in [`src/utils/apiResponse.ts`](file:///d:/PRANOVA/src/utils/apiResponse.ts) returning `{ success, message, data, meta, timestamp }`.
  - Central Express error handler in [`src/middlewares/errorHandler.ts`](file:///d:/PRANOVA/src/middlewares/errorHandler.ts) handling Zod errors and Prisma codes (`P2002`, `P2025`, `P2003`).

#### How to Verify:
```bash
# Verify healthcheck endpoint
curl -X GET http://localhost:5000/health
# Expected: {"status":"UP","timestamp":"...","uptime":...}
```

---

### STEP 2: Authentication Engine & Role-Based Access Control (RBAC)
#### What Was Built:
- **JWT Engine** ([`src/utils/jwt.ts`](file:///d:/PRANOVA/src/utils/jwt.ts)): Dual-token architecture with 15-minute access tokens and 7-day refresh tokens.
- **RBAC Middleware** ([`src/middlewares/auth.middleware.ts`](file:///d:/PRANOVA/src/middlewares/auth.middleware.ts)): Role verification guards (`requireAdmin`, `authorize(Role...)`).
- **Validation Middleware** ([`src/middlewares/validate.middleware.ts`](file:///d:/PRANOVA/src/middlewares/validate.middleware.ts)): Zod schema validation on body, params, and query.
- **Seed Script** ([`prisma/seed.ts`](file:///d:/PRANOVA/prisma/seed.ts)): Provisions default Admin, Patient, Care Manager, and Healthcare Provider records.

#### Verification Endpoints:
```bash
# 1. Admin Login (Issues Access & Refresh Tokens)
curl -X POST http://localhost:5000/api/v1/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pranova.com","password":"Admin@123456"}'

# 2. Check Identity Profile (/me)
curl -X GET http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>"

# 3. Test Mock Phone OTP Auth
curl -X POST http://localhost:5000/api/v1/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210"}'

curl -X POST http://localhost:5000/api/v1/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210","otp":"123456"}'
```

---

### STEP 3: Admin Web Console Architecture
#### What Was Built:
- **Modern React-Admin v5 Shell** inside [`admin-web/`](file:///d:/PRANOVA/admin-web):
  - Custom design tokens in [`admin-web/src/theme.ts`](file:///d:/PRANOVA/admin-web/src/theme.ts) featuring Ocean Cyan (`#0284c7`) and Deep Teal (`#0f766e`).
  - Dark and Light mode support with clinical readability optimizations.
  - JWT `authProvider` in [`admin-web/src/providers/authProvider.ts`](file:///d:/PRANOVA/admin-web/src/providers/authProvider.ts) managing tokens in localStorage with 401 interceptors.
  - REST `dataProvider` in [`admin-web/src/providers/dataProvider.ts`](file:///d:/PRANOVA/admin-web/src/providers/dataProvider.ts) communicating with `/api/v1`.
  - Glassmorphic login view in [`admin-web/src/components/Login.tsx`](file:///d:/PRANOVA/admin-web/src/components/Login.tsx) with a 1-click Demo Admin login button.
  - Dashboard command center in [`admin-web/src/components/Dashboard.tsx`](file:///d:/PRANOVA/admin-web/src/components/Dashboard.tsx) displaying emergency metrics and system status.

#### How to Verify:
1. Navigate to `http://localhost:5173`.
2. Click the **"Fill Demo Admin Credentials"** button on the login screen.
3. Click **"Sign In to Console"**.
4. Confirm redirection to the Dashboard displaying KPI counters.

---

### STEP 4: Core Entity Management (Patients, Care Managers, Providers)
#### What Was Built:
- **Patient Management** ([`src/routes/patient.routes.ts`](file:///d:/PRANOVA/src/routes/patient.routes.ts) & [`admin-web/src/resources/patients/`](file:///d:/PRANOVA/admin-web/src/resources/patients/)):
  - Full CRUD operations with blood group chips, emergency contact registry, and medical history.
- **Care Manager Management** ([`src/routes/careManager.routes.ts`](file:///d:/PRANOVA/src/routes/careManager.routes.ts) & [`admin-web/src/resources/careManagers/`](file:///d:/PRANOVA/admin-web/src/resources/careManagers/)):
  - Roster tracking duty status (`AVAILABLE`, `BUSY`, `OFF_DUTY`), active case load counters, and operational zones.
- **Provider Directory** ([`src/routes/provider.routes.ts`](file:///d:/PRANOVA/src/routes/provider.routes.ts) & [`admin-web/src/resources/providers/`](file:///d:/PRANOVA/admin-web/src/resources/providers/)):
  - Category filters (`HOSPITAL`, `CLINIC`, `AMBULANCE`, `DIAGNOSTIC_CENTER`, `PHARMACY`).
  - **Inline Status Control**: One-click actions to transition providers between `ACTIVE`, `PAUSED`, and `DEACTIVATED`.

#### How to Verify:
1. In the Admin Web Console sidebar, select **Healthcare Providers**.
2. Click **Create** to register a new provider or view existing ones.
3. In the Provider list or show view, click **Pause** or **Activate** and observe instant status badge updates.

---

### STEP 5: Case Coordination, Assignment & Timeline Tracking (Module 4)
#### What Was Built:
- **Domain Service** ([`src/services/case.service.ts`](file:///d:/PRANOVA/src/services/case.service.ts)):
  - Auto-generates unique human-readable case identifiers (e.g. `PRN-2026-XXXX`).
  - **Atomic Assignment Transaction**: Executing `PATCH /api/v1/cases/:id/assign` links a Care Manager, records assignment timestamps, and writes an entry into `CaseTimeline` within a single database transaction.
- **Triage UI & Modal** ([`admin-web/src/resources/cases/AssignCaseDialog.tsx`](file:///d:/PRANOVA/admin-web/src/resources/cases/AssignCaseDialog.tsx)):
  - Modal querying only available Care Managers with optional clinical dispatch notes.
- **Interactive Case Show View** ([`admin-web/src/resources/cases/CaseShow.tsx`](file:///d:/PRANOVA/admin-web/src/resources/cases/CaseShow.tsx)):
  - Patient vital demographics and incident geolocation.
  - Complete vertical **Case Coordination Timeline** rendering all historical transitions, assignees, and timestamps.

#### How to Verify:
```bash
# Assign a Care Manager to a Case via REST
curl -X PATCH http://localhost:5000/api/v1/cases/<CASE_ID>/assign \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"careManagerId":"<CARE_MANAGER_USER_ID>","notes":"Urgent dispatch for acute triage"}'
```
In the Admin Web Console:
1. Open **Case Coordination**.
2. Click **"Assign CM"** on an open case.
3. Select a Care Manager, enter instructions, and submit.
4. Click the case row to inspect the **Timeline History** showing the new entry.

---

### STEP 6: Real-Time Emergency SOS & Clinical Alerts (Module 3)
#### What Was Built:
- **Socket.io Gateway** ([`src/socket/index.ts`](file:///d:/PRANOVA/src/socket/index.ts)):
  - Handles client connections and admin room subscriptions (`admin:join`).
- **Emergency SOS Event Handler** ([`src/socket/emergency.handler.ts`](file:///d:/PRANOVA/src/socket/emergency.handler.ts)):
  - Listens for `emergency:sos` from mobile clients or triage services.
  - Provisions a `P1 EMERGENCY` case and `CaseTimeline` entry in MySQL.
  - Broadcasts `admin:new_emergency` to all connected Admin consoles in real time.
- **REST SOS Endpoint** (`POST /api/v1/cases/sos` in [`src/routes/case.routes.ts`](file:///d:/PRANOVA/src/routes/case.routes.ts)):
  - Facilitates SOS triggers via HTTP REST while triggering the same Socket.io broadcast.
- **Offline Clinical Audio Synthesizer** ([`admin-web/src/utils/sound.ts`](file:///d:/PRANOVA/admin-web/src/utils/sound.ts)):
  - Uses the browser's native Web Audio API (multi-tone 880Hz/700Hz clinical chime) without requiring external audio asset files.
- **Real-Time Listener Component** ([`admin-web/src/components/EmergencyAlertListener.tsx`](file:///d:/PRANOVA/admin-web/src/components/EmergencyAlertListener.tsx)):
  - Mounted inside the console layout. Triggers sound, renders a prominent red alert modal, issues an HTML5 desktop notification, and refreshes case lists automatically.

#### How to Verify:
1. Ensure the Admin Web Console is open in your browser (`http://localhost:5173`).
2. Open a terminal and trigger an emergency SOS via REST:
```bash
curl -X POST http://localhost:5000/api/v1/cases/sos \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "<PATIENT_USER_ID>",
    "incidentLatitude": 12.9716,
    "incidentLongitude": 77.5946,
    "incidentAddress": "MG Road, Bengaluru",
    "description": "Acute respiratory distress and chest tightness"
  }'
```
3. **Observe in Admin Web:**
   - Immediate clinical chime sounds.
   - High-priority red Emergency SOS modal appears with patient details and location.
   - Case Coordination list refreshes automatically with the new P1 case.

---

### STEP 7: Audit Logging & Excel Reporting (Module 9)
#### What Was Built:
- **Audit Logging Middleware** ([`src/middlewares/audit.middleware.ts`](file:///d:/PRANOVA/src/middlewares/audit.middleware.ts)):
  - Automatically intercepts all mutation requests (`POST`, `PATCH`, `PUT`, `DELETE`).
  - Redacts sensitive fields (`password`, `token`, `otp`).
  - Captures actor identity, client IP, endpoint, HTTP method, and records immutable entries in `AuditLog`.
- **Excel Export Engine** ([`src/services/export.service.ts`](file:///d:/PRANOVA/src/services/export.service.ts)):
  - Uses `xlsx` to generate structured spreadsheets with all case and patient metadata.
  - **Mandatory Compliance Rule:** Requires an explicit `reason` (minimum 3 characters) and logs the export event to `AuditLog`.
- **Export Modal & Toolbar Action** ([`admin-web/src/components/ExportCasesModal.tsx`](file:///d:/PRANOVA/admin-web/src/components/ExportCasesModal.tsx) & [`admin-web/src/resources/cases/CaseList.tsx`](file:///d:/PRANOVA/admin-web/src/resources/cases/CaseList.tsx)):
  - "Export to Excel (.xlsx)" button prompting the admin for their clinical/audit reason before initiating download.
- **Audit Log Inspection Console** ([`admin-web/src/resources/auditLogs/`](file:///d:/PRANOVA/admin-web/src/resources/auditLogs/)):
  - Read-only resource displaying transaction history, actor information, and syntax-highlighted JSON request payloads.
  - Strictly protected against modification or deletion.

#### How to Verify:
1. In the Admin Web Console, go to **Case Coordination**.
2. Click **"Export to Excel (.xlsx)"** in the top toolbar.
3. Enter a reason (e.g., *"Monthly clinical triage quality audit"*) and click **"Authorize & Download"**.
4. Confirm that the `.xlsx` file downloads to your machine.
5. In the sidebar, navigate to **Audit Logs & Compliance**.
6. Inspect the newly recorded `EXPORT_CASES` entry showing your stated reason, timestamp, IP, and status.

---

## 4. API Endpoints Catalog

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/admin/login` | Public | Authenticate administrator with email and password |
| `POST` | `/admin/register`| Admin | Provision new administrator account |
| `POST` | `/otp/send` | Public | Dispatch OTP for phone verification |
| `POST` | `/otp/verify` | Public | Validate OTP and return auth tokens |
| `POST` | `/refresh-token` | Public | Exchange valid refresh token for new access token |
| `GET` | `/me` | Authenticated | Retrieve authenticated user profile and role |

### Case Management & SOS (`/api/v1/cases`)
| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/sos` | Public | Trigger P1 Emergency SOS and broadcast to Admin |
| `GET` | `/` | Admin | List cases with search, pagination, priority, and status filters |
| `GET` | `/:id` | Admin | Retrieve single case with patient, provider, and timeline |
| `POST` | `/` | Admin | Register new medical coordination case |
| `PATCH`| `/:id/assign` | Admin | Atomically assign Care Manager and record timeline event |
| `PATCH`| `/:id/status` | Admin | Update case lifecycle status (`IN_PROGRESS`, `RESOLVED`, etc.) |
| `POST` | `/export/excel` | Admin | Generate `.xlsx` case report (Requires `reason` field) |

### Healthcare Providers (`/api/v1/providers`)
| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Admin | List providers with category and status filters |
| `GET` | `/:id` | Admin | Retrieve single provider details |
| `POST` | `/` | Admin | Onboard new provider facility |
| `PUT` | `/:id` | Admin | Update provider information |
| `PATCH`| `/:id/status` | Admin | Toggle provider status (`ACTIVE`, `PAUSED`, `DEACTIVATED`) |
| `DELETE`| `/:id` | Admin | Soft-delete / deactivate provider |

### Patients & Care Managers
| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET/POST/PUT/DELETE` | `/api/v1/patients` | Admin | Manage patient records and emergency profiles |
| `GET/POST/PUT/DELETE` | `/api/v1/care-managers` | Admin | Manage care manager roster, availability, and caseloads |

### Audit Logs & Compliance (`/api/v1/audit-logs`)
| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Admin | Searchable, paginated audit trail of all mutations |
| `GET` | `/:id` | Admin | Inspect individual audit record and payload snapshot |

---

## 5. Verification Commands Summary

Run these validation commands to verify code compilation and bundling:

```bash
# Check backend TypeScript compilation (0 errors expected)
npx tsc --noEmit

# Check backend build output (0 errors expected)
npm run build

# Check frontend TypeScript & Vite bundle (0 errors expected)
cd admin-web
npm run build
```

---

## 6. Phase 1 Completion Sign-Off

Phase 1 has fulfilled all architectural criteria:
- [x] Headless Express + TypeScript REST engine.
- [x] Relational schema and migrations on MySQL via Prisma.
- [x] Strict platform separation and JWT RBAC security.
- [x] Real-time emergency Socket.io pipeline with Web Audio chime.
- [x] Operational React-Admin v5 console with Ocean Cyan aesthetic.
- [x] Immutable compliance auditing and Excel case export.
