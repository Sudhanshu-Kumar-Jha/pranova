# PRANOVA Technical Skills & Architecture Guide

## 1. System Overview & Technology Stack
PRANOVA is a strictly headless, API-first Healthcare Coordination Platform. The unified stack is standard TypeScript across backend, admin web, and native mobile clients:
- **Backend:** Node.js with TypeScript (strict mode), Express.js, Prisma ORM.
- **Database:** MySQL 8 / MariaDB on port 3306 (database `pranova_db`). Relational integrity is mandatory for clinical healthcare coordination.
- **Admin Console (Web Only):** React-Admin v5 (Vite + TypeScript + Material-UI v5). Consumes top-level `/api/v1/*` routes.
- **Patient App (Mobile Only):** Native React Native (Expo SDK 57) with TypeScript + React Native Paper. Consumes `/api/v1/app/*` routes.
- **Care Manager App (Mobile Only):** Native React Native (Expo SDK 57) with TypeScript + React Native Paper. Consumes `/api/v1/cm/*` routes.
- **Real-Time Layer:** Socket.io with JWT handshake authorization and role-segmented rooms (`admin_room`, `care_managers`, `patient_<id>`).

## 2. Hard Architectural Constraints
- **STRICT PLATFORM SEPARATION:** Clients never cross surfaces. Admin endpoints (`/api/v1/*`) are Web only. Patient endpoints (`/api/v1/app/*`) are Patient app only. Care Manager endpoints (`/api/v1/cm/*`) are Care Manager app only.
- **NO WEBVIEWS:** Under no circumstances should the mobile apps use WebViews or wrap the Admin panel. They are 100% native React Native (Expo) apps consuming the REST API.
- **DATABASE RESERVED KEYWORDS:** On MySQL, `model Case` is explicitly mapped to table `cases` (`@@map("cases")`) to prevent SQL reserved keyword conflicts.
- **IMMUTABLE TIMELINE & CLINICAL RECORDS:** Case activity (`CaseTimeline`) is append-only. Hard deletes and updates are rejected at the ORM extension and service levels.
- **CLINICAL CONSENT GUARD (DPDP / HIPAA):** Field Care Managers cannot access patient clinical documents (`/cm/patients/:id/documents`) without an active, unexpired clinical consent record granted by the patient. Every PHI read access creates an immutable `DocumentAccessLog` entry.

## 3. Database Rules (Prisma + MySQL 8)
- Every table includes `createdAt` and `updatedAt` timestamps.
- Composite indexes on `Case`: `@@index([careManagerId, status])` and `@@index([createdAt])` for sub-millisecond dispatch queries.
- Clinical Consents have an explicit `expiresAt` timestamp (default 24h) and a `revokedAt` field for immediate patient revocation.
- Relational cascades protect clinical history (`onDelete: Restrict` or `Cascade` where appropriate).

## 4. Mobile App Architecture (React Native + Expo)
- **Framework:** React Native with Expo Router (`app/` filesystem-based routing).
- **UI Engine:** React Native Paper + unified design tokens matching clinical aesthetics.
- **State & Server Cache:** TanStack React Query v5 + Zustand for persistent auth state.
- **Secure Token Storage:** `expo-secure-store` for JWT Access and Refresh tokens with automated refresh interceptor and 401 loop breaking.
- **Location Services:** `expo-location` for genuine GPS fix fetching. No fabricated fallback coordinates are permitted in healthcare workflows.

## 5. Security & Safety Standards
- **Rate Limiting:** `express-rate-limit` active on all sensitive endpoints (`/auth/otp/*` capped at 3 requests per 10 mins per IP; `/app/sos` capped at 1 request per minute per user).
- **Handshake Verification:** Unauthenticated socket connections are rejected at the `io.use()` handshake layer.
- **PHI Masking:** Telemetry alerts emit triage identifiers and coordinates without broadcasting sensitive medical profile fields platform-wide.
- **Emergency Acknowledgement:** Admin Emergency Alert modal requires explicit operator acknowledgement, recording `acknowledgedAt` and `acknowledgedById` in the database.