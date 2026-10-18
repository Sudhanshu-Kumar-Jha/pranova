# PRANOVA Care Manager App — API Contract

**Base URL:** `EXPO_PUBLIC_API_URL` (local dev: `http://localhost:5000/api/v1`).
**Socket URL:** `EXPO_PUBLIC_SOCKET_URL` (local dev: `http://localhost:5000`).
**Envelope:** `{ success, message, data, meta?, timestamp }`; lists carry `meta.total`.
**Auth:** `Authorization: Bearer <accessToken>` on every `/cm/*` call. Dev OTP = `123456`.
**Allowed surface:** `/auth/otp/*`, `/auth/refresh-token`, `/auth/me`, and `/cm/*` **only**.

## App configuration (public — no token)
| Method | Path | Returns |
|---|---|---|
| GET | `/cm/config` | `{ appName, tagline, logoUrl, primaryColor, supportEmail, supportPhone, emergencyNumber, pharmacy: {...} }` |

Same contract and payload as the patient app's `/app/config`, served on this surface so the
care-manager sign-in screen can brand itself before a token exists. Ignore the `pharmacy` block
here. Use it exactly as the patient app does: one provider at the root, a theme built from
`primaryColor`, and no hard-coded logo, name or colour anywhere in a screen.

## Authentication
| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/auth/otp/send` | `{ phone, role: "CARE_MANAGER" }` | mock OTP info |
| POST | `/auth/otp/verify` | `{ phone, otp, role: "CARE_MANAGER" }` | `{ user, tokens }` |
| POST | `/auth/refresh-token` | `{ refreshToken }` | `{ tokens }` |
| GET | `/auth/me` | — | current user |

## Care Manager surface (`/cm/*`)
| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/cm/me` | — | profile + `activeCases` count |
| PATCH | `/cm/availability` | `{ isAvailable?, latitude?, longitude? }` | toggle duty + push location |
| GET | `/cm/cases` | — | my assigned cases; query `status`, `page`, `perPage` |
| GET | `/cm/cases/:id` | — | case detail **+ timeline** (only if assigned to me) |
| PATCH | `/cm/cases/:id/status` | `{ status, notes?, latitude?, longitude? }` | appends an immutable timeline entry |

## Enums for UI
- CaseStatus: `OPEN, ASSIGNED, IN_PROGRESS, RESOLVED, CANCELLED` (RESOLVED/CANCELLED are terminal).
- CasePriority: `P1` (emergency SOS), `P2` (urgent), `P3` (routine).
- CaseTriggerSource: `SOS_BUTTON, PATIENT_REQUEST, ADMIN_MANUAL, CARE_MANAGER`.

## Real-time (Socket.IO)
- Connect to `EXPO_PUBLIC_SOCKET_URL` (the backend origin, same port as the API).
- **Event: `admin:new_emergency`** — emitted by `src/socket/emergency.handler.ts` when a P1 case is
  created, both to the `admin_room` and globally, so no room join is needed on this surface.
- Payload: `{ caseId, caseNumber, priority, status, title, description, patientId, patientName,
  patientPhone, patientBloodGroup, incidentAddress, incidentLatitude, incidentLongitude, timestamp }`.
- It is a **dispatch signal, not an assignment**: the case only appears under `GET /cm/cases` once an
  administrator assigns it, and `GET /cm/cases/:id` answers **404** until then.
- **No push-token endpoint exists** on any surface, so remote push cannot be wired from the client.
  Alerting is local: in-app dialog + vibration + local notification.

> Interactive source of truth: backend Swagger (dev only). Do not call any path not listed here.
