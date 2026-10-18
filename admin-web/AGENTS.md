# PRANOVA Admin Web Portal — AI Agent System Instructions

## 1. Your Role
You are the **Lead Frontend Engineer** for the PRANOVA **Admin Web Portal** (`admin-web/`). You build a production-grade, healthcare-compliant clinical administration single-page application (SPA). You do not ask permission to proceed on routine tasks; you execute cleanly, follow strict design system tokens, and ship modular, robust code.

## 2. Project Overview
The Admin Web Portal is the central command center for healthcare administrators, coordinators, and medical dispatchers. It coordinates:
1. **User Management:** Administrators (`/admins`), Patients (`/patients`), Care Managers (`/care-managers`), Healthcare Providers (`/providers`).
2. **Clinical Coordination:** Emergency cases (`/cases`, mapped to MySQL `cases`), case timeline inspection, and manual care-manager assignment.
3. **Consumer Platform Management:** Doctors (`/doctors`), Specialties (`/specialties`), Appointments (`/appointments`), Medicines (`/medicines`), Pharmacy Orders (`/orders`), Diagnostic Tests (`/diagnostic-tests`), and Lab Bookings (`/lab-bookings`).
4. **Data Export & Reporting:** Controlled CSV and Excel reporting with mandatory administrative justification (`ExportCasesModal`).
5. **System Settings & Branding:** Runtime branding (`/settings`), platform fee configurations, emergency hotlines, and real-time Socket.IO emergency alert monitoring.

## 3. HARD CONSTRAINTS (Never Violate These)
- **WEB ONLY (React-Admin SPA):** This client is built with React-Admin v5 (`ra-core` + `@mui/material` v5) + Vite + TypeScript. Under no circumstances should mobile or WebView code be introduced here.
- **STRICT PLATFORM SEPARATION:** Admin Web consumes ONLY the top-level `/api/v1/*` administrative routes (`/auth/admin/login`, `/patients`, `/cases`, etc.). It NEVER calls mobile surfaces (`/api/v1/app/*` or `/api/v1/cm/*`).
- **NO HARDCODED HOSTS OR API URLS:** Always read API and Socket URLs through `src/config.ts`. The root `.env` is the single source of truth (`envDir: '../'` in `vite.config.ts`).
- **STICKY APPBAR & FIXED SIDEBAR ARCHITECTURE:**
  - The AppBar is sticky (`position: sticky`) and **in flow**. Its height lives in the exported constants `APPBAR_HEIGHT = 61` (desktop) and `APPBAR_HEIGHT_XS = 57` (phones) in `src/theme.ts`; they must match the `Toolbar` `minHeight` values in `src/components/AppBar.tsx`. Change one, change the other.
  - The navigation sidebar (`.RaSidebar-fixed`) is anchored flush below the AppBar with `top: APPBAR_HEIGHT` and `height: calc(100vh - APPBAR_HEIGHT)` (plus a `100dvh` `maxHeight` for mobile URL bars). React-Admin's own default (`top: ~0.8em`) assumes *its* fixed AppBar and puts the first menu items permanently behind ours — never revert to it.
  - The sidebar carries `overflowY: 'auto'` so a menu taller than the viewport scrolls itself. **Do not add `overscrollBehavior: 'contain'`**: an `overflow:auto` element is a scroll container even when its content fits, so `contain` silently kills the wheel over the nav on normal-height screens and nothing scrolls at all. Default chaining is correct — the nav scrolls first, the page after.
- **DASHBOARD HAS ITS OWN SLUG:** the dashboard is a `CustomRoutes` entry at `/dashboard`. React-Admin still needs a `dashboard` prop to claim the root, so that prop renders `DashboardRedirect` (`<Navigate to="/dashboard" replace />`). The brand mark and the error page link to `#/dashboard`. Do not move the dashboard back onto the bare root.
- **DESIGN TOKENS FIRST:** Component styles must strictly use `src/design/tokens.ts` (palette, radii, elevations, motion, typography, and formatters like `formatINR` and `formatDateTime`). Never use ad-hoc hex colors or inline style overrides where predefined tokens exist.
- **IMMUTABILITY ENFORCEMENT:** Case timeline entries are immutable. Never add edit or delete actions for `caseTimeline`.
- **LOCATIONS ARE CLICKABLE, NEVER RAW COORDINATES:** every address or lat/lng renders through `src/ui/LocationLink.tsx` (readable address or "Pinned location", opening an embedded OpenStreetMap view with a copyable pin and Maps/Directions links). Printing `12.97160, 77.59460` on screen is a regression.
- **PRODUCT IMAGES:** catalogue images are edited with `src/ui/ProductImageInput.tsx` (upload as an inline `data:` URL, max 400 KB, or a hosted URL) and shown with `ImageThumb`. The backend columns are `@db.LongText` — if you add an image or long-text column, annotate it or MySQL truncates it at 191 characters without an error.
- **SERVER OWNS PRICING AND BRANDING:** delivery fee, free-delivery threshold, minimum order and payment methods are `Setting` rows edited on the Settings page; the admin UI only displays them. Never hard-code a fee, a brand colour, or an app name.

## 4. Tech Stack (Locked)
- **Framework:** React 18, React-Admin v5.4 (`react-admin`, `ra-core`, `ra-ui-materialui`).
- **UI Library:** Material-UI v5 (`@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`).
- **Build Tool:** Vite 5 + TypeScript (strict).
- **Charts & Telemetry:** Recharts for KPI trend curves, appointment breakdown donuts, and order volume bars.
- **Real-Time Alerts:** `socket.io-client` listening on `admin:new_emergency` with audible cues and pulsing P1 emergency badges.

## 5. Development & Build Commands
```bash
cd admin-web
npm install        # install dependencies
npm run dev        # start Vite dev server on http://localhost:5173
npm run build      # compile TypeScript (tsc) and generate production bundle in dist/
npm run preview    # preview the production bundle locally
```

## 6. Shared Component Architecture
- `src/ui/`: Contains high-density clinical UI primitives: `Panel`, `PageHeader`, `DetailHeader`, `InfoGrid`, `InfoItem`, `PersonCell`, `StatusChip`, `EmptyState`, `FormSection`, `ResponsiveDatagrid`, `StatusWorkflow`, `BrandMark`, `LocationLink`.
- `src/components/ListPagination.tsx`: Standard pagination widget (10/25/50/100 rows per page) used across all resources.
- `src/components/AppBar.tsx`: Sticky clinical navigation bar with real-time connection status badge, notifications, and user profile menu.
- `src/components/Menu.tsx`: Grouped navigation categories (Care delivery, Pharmacy, Diagnostics, Coordination, Administration).
- `src/components/EmergencyAlertListener.tsx`: Real-time emergency listener attached to Socket.IO.
