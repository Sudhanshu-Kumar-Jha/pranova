---
name: admin-web
description: Tech stack, folder structure, layout rules, and UI conventions for the PRANOVA Admin Web portal (React-Admin v5 + MUI + Vite).
---

# PRANOVA Admin Web Skill

> Verified against the working tree on **2026-10-17**. The console is built and running.
> If the code disagrees with this file, the code wins — fix this file in the same change.

## 1. Stack (pinned)
React 18 · **React-Admin v5.4** (`react-admin`, `ra-core`, `ra-ui-materialui`) · **MUI v5.16**
(`@mui/material`, `@mui/icons-material`, emotion) · **Vite 5** · TypeScript (strict) ·
`socket.io-client` · Recharts. Hash routing (`#/…`).

```bash
cd admin-web
npm install
npm run dev        # http://localhost:5173 — the backend must be up on :5000
npm run build      # tsc + production bundle into dist/
```

## 2. Folder structure
```
admin-web/
├── src/
│   ├── App.tsx                  # <Admin>, resources, CustomRoutes
│   ├── config.ts                # API_URL / SOCKET_URL — the ONLY place they live
│   ├── branding.tsx             # BrandingProvider + useBranding() (runtime Settings)
│   ├── theme.ts                 # light/dark themes, layout constants, RA overrides
│   ├── index.css                # base layer, scrollbars, focus rings, touch targets
│   ├── design/tokens.ts         # palette, radii, motion, status tones, formatters
│   ├── ui/                      # shared primitives (see §4)
│   ├── components/              # AppBar, Menu, Layout, Dashboard, Login, listeners
│   ├── providers/               # dataProvider, authProvider
│   └── resources/<name>/        # List / Show / Create / Edit / Form per resource
└── vite.config.ts               # envDir: '../' — reads the ROOT .env
```

## 3. Configuration
- **One root `.env`** (Bagisto-style). Vite sets `envDir: '../'`, so only `VITE_*` keys reach the
  browser: `VITE_API_URL`, `VITE_SOCKET_URL`. There is no `admin-web/.env`.
- Never hard-code a host. Import `API_URL` / `SOCKET_URL` from `src/config.ts`.
- **Runtime branding** (app name, tagline, logo, favicon, primary colour, support email) comes from
  the DB `Setting` model via `GET /api/v1/settings` (public) and is edited on the Settings page.
  `branding.tsx` exposes it as `useBranding()`.

## 4. Layout contract (the part that keeps breaking)
- The AppBar is `position: sticky` and **in flow**. Its height is `APPBAR_HEIGHT = 61` /
  `APPBAR_HEIGHT_XS = 57`, exported from `theme.ts` and matching the `Toolbar` `minHeight` in
  `components/AppBar.tsx`. **Keep the two in step.**
- `RaLayout` sets `'& .RaLayout-appFrame': { marginTop: 0 }` because our bar is sticky, not fixed.
- `.RaSidebar-fixed` is anchored at `top: APPBAR_HEIGHT` with `height: calc(100vh - APPBAR_HEIGHT)`
  and a `100dvh` `maxHeight`. React-Admin's default `top` assumes its own fixed AppBar and hides the
  first menu items behind ours, unreachable.
- The sidebar has `overflowY: 'auto'` only. **Never add `overscrollBehavior: 'contain'`** — an
  `overflow:auto` box is a scroll container even when its content fits, so `contain` disables the
  wheel over the nav entirely on normal screens.
- Phones: `ClosedDrawerOnPhones` in `components/Layout.tsx` collapses the modal drawer on first load.
- **Dashboard slug:** the dashboard is a `CustomRoutes` route at `/dashboard`; the `dashboard` prop on
  `<Admin>` renders `DashboardRedirect` so the bare root forwards there. Menu, brand mark and the
  error page all point at `#/dashboard`.

## 5. UI system
- **Tokens first:** `design/tokens.ts` owns colour, radius, elevation, motion, `statusMeta`,
  `humanize`, `formatINR`, `formatDateTime`, `plural`. No raw hex, no ad-hoc date/money formatting.
- **Primitives in `src/ui/`:** `Panel` (Panel / PageHeader / DetailHeader / InfoGrid / InfoItem /
  PersonCell / SkeletonLines / facts / initials), `StatusChip`, `EmptyState`, `FormSection`,
  `ResponsiveDatagrid`, `StatusWorkflow`, `BrandMark`, `LocationLink`, `ProductImageInput`
  (+ `ImageThumb`). Reach for these before writing bespoke layout.
- **Locations:** always `LocationLink` — readable address, click for an embedded OpenStreetMap view,
  copyable GPS pin, Maps/Directions links. Never print bare coordinates.
- **Images:** `ProductImageInput` for editing (upload → inline `data:` URL, 400 KB cap, or a hosted
  URL), `ImageThumb` for lists and detail rows.
- **Lists:** `ResponsiveDatagrid` with a `mobile` config (`primaryText`, `secondaryText`,
  `tertiaryText`, `leftAvatar`); `ListPagination` for 10/25/50/100; `ListEmpty` for the empty state.
  Numbers in tables carry `className="num"` for tabular figures.
- Every list and detail screen handles loading, empty and error.

## 6. Data layer
- `providers/dataProvider.ts` wraps the API envelope `{ success, message, data, meta }` and exposes
  `apiClient` (axios) for calls outside React-Admin's resource model.
- Lists send `page` / `perPage` (server caps at 100) and read `meta.total`.
- Admin surface only: top-level `/api/v1/*`. **Never** call `/app/*` or `/cm/*`.
- `requireAdmin` is enforced server-side; the UI must not be the only guard.

## 7. Rules
- Audit logs and case timelines are append-only: no edit or delete actions, ever.
- Status transitions are server-authoritative — POST the requested status and render what comes back
  (e.g. `StatusWorkflow` posts to `/cases/:id/status`; there is no `PATCH /cases/:id`).
- Pricing, delivery rules and payment methods are `Setting` rows applied by the server. The console
  edits them; it never computes them.
- **Only real backend data.** No mock rows, placeholder statistics, or hardcoded IDs in any screen.
- Make no compliance claim (HIPAA, certification, encryption strength) that the platform cannot back.
