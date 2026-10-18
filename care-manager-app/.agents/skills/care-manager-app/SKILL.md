---
name: care-manager-app
description: Tech stack, folder structure, and coding conventions for the PRANOVA Care Manager mobile app (React Native + Expo + TypeScript).
---

# PRANOVA Care Manager App Skill

> Verified against the working tree on **2026-10-17**. The app is feature-complete for the
> `/cm/*` surface: branded config, OTP sign-in, case list, case detail + timeline, GPS-stamped
> status updates, duty toggle, and the Socket.IO emergency listener. If something here disagrees
> with the code, the code wins — fix this file in the same change.

## 1. Stack (pinned versions)
**Expo SDK 58** (`expo ^58.0.14`) · **React Native 0.88.0** · **React 19.3.0** · TypeScript (strict) ·
expo-router ~58 (typed routes) · @tanstack/react-query v5 · axios · zustand v4 · expo-secure-store ·
react-native-paper v5 · **expo-location ~58** · **expo-notifications ~58** · **expo-splash-screen ~58** · **socket.io-client**.
**No WebViews.**

Both mobile apps are now on the same SDK (58), so one Expo Go client runs either. Keep them in step:
bump both together and re-run `npx expo install --check` in each.

Run it:
```bash
cd care-manager-app
npm install
npx expo start --go --host lan      # the backend must be up on port 5000
npm run typecheck                   # tsc --noEmit, must stay clean
```

## 2. Actual folder structure
```
care-manager-app/
├── app/
│   ├── _layout.tsx                 # query + config + theme + socket providers, auth gate
│   ├── index.tsx                   # branded splash, then routes
│   ├── (auth)/login.tsx            # phone + OTP (role CARE_MANAGER), no self-registration
│   ├── (tabs)/
│   │   ├── _layout.tsx             # My Cases · Profile
│   │   ├── index.tsx               # own branded header + counters + filters + case list
│   │   └── profile.tsx             # profile, duty, device/alert status, support, sign out
│   └── cases/[id].tsx              # case detail + coordination timeline + status actions
├── src/
│   ├── api/  client.ts  auth.ts  cases.ts  config.ts
│   ├── components/  BrandLogo  CaseCard  StatusChip  PriorityBadge  DutyToggle
│   │                StatusUpdateDialog  EmergencyAlertModal  EmptyState  LoadingSkeleton
│   ├── providers/AppConfigProvider.tsx     # useBrand() / useAppConfig()
│   ├── socket/EmergencyProvider.tsx        # admin:new_emergency listener, useEmergency()
│   ├── location/index.ts                   # expo-location permission + fix helpers
│   ├── notifications/index.ts              # local notifications only (see §6)
│   ├── store/authStore.ts
│   ├── theme.ts                    # a FILE, not a folder
│   └── config.ts                   # API + socket URL resolution
├── app.json                        # Expo config (app.json, not app.config.ts)
└── tsconfig.json                   # extends expo/tsconfig.base; no `baseUrl` (TS 6 deprecates it)
```

## 3. Host resolution (`src/config.ts`)
Resolves, in order: `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_SOCKET_URL` → the Metro bundler host IP from
`Constants.expoConfig?.hostUri` → `extra.apiUrl` / `extra.socketUrl` from `app.json` → the hard
fallback `http://192.168.1.46:5000`. Exports `API_URL` (…`/api/v1`) and `SOCKET_URL`.
`localhost` is never reachable from a physical device. When the dev machine's IP changes, update
`app.json` and `FALLBACK_HOST` together.

## 4. API client & auth
- One axios instance, bearer token from `expo-secure-store`, refresh-once on 401, `unwrap()` strips
  the `{ success, message, data, meta }` envelope. Same pattern as the patient app.
- `POST /auth/otp/send { phone, role: "CARE_MANAGER" }` then `/auth/otp/verify` with the same `role`.
  The `role` field is **required**. Dev OTP `123456`.
- Allowed paths only: `/auth/otp/*`, `/auth/refresh-token`, `/auth/me`, `/cm/*`.
- Every call lives in `src/api/`, never inline in a screen.

## 4A. Shared architecture with the patient app (keep in step)
The two clients are structurally identical. When changing one of these, change both:

| Concern | Here | Reference in `patient-app/` |
|---|---|---|
| Branding config | `src/api/config.ts`, `src/providers/AppConfigProvider.tsx` | same paths |
| Runtime theme from the admin colour | `src/theme.ts` (`palette`, `buildTheme`, `usableBrand`, `onColor`, `tint`) | same |
| Logo with fallback | `src/components/BrandLogo.tsx` | same |
| Branded splash then route | `app/index.tsx` + splash exemption in `app/_layout.tsx` | same |
| Axios + envelope unwrap + refresh | `src/api/client.ts` | same |
| LAN host resolution | `src/config.ts` | same |

Rules that apply equally:
- **Nothing branded is hard-coded.** Read it from `GET /cm/config` and use `theme.colors.primary`.
  The one exception is P1 emergency red (`#dc2626`), which is a clinical signal, not branding.
- **One header per screen.** `(tabs)/index.tsx` and `cases/[id].tsx` render their own headers and
  therefore run with `headerShown: false` / outside the tab navigator, using `useSafeAreaInsets()`
  for the status-bar gap. Never stack two bars.
- **Greet by the real name** from `GET /cm/me` (`firstName`); with no name, greet without one.
- **No invented data** — no sample cases, patients, addresses or coordinates, and no fictitious
  stand-in for a null field. `Fact` rows render nothing when the backend has no value.

## 5. The `/cm/*` surface (everything the app may call)
| Method | Path | Purpose |
|---|---|---|
| GET | `/cm/config` | **public, no token** — branding for the sign-in screen (same payload as `/app/config`; the `pharmacy` block is ignored here) |
| GET | `/cm/me` | the signed-in care manager's profile + `activeCases` |
| PATCH | `/cm/availability` | `{ isAvailable?, latitude?, longitude? }` |
| GET | `/cm/cases` | assigned cases; `status`, `page`, `perPage` |
| GET | `/cm/cases/:id` | one case with its timeline (404 when not assigned to me) |
| PATCH | `/cm/cases/:id/status` | `{ status, notes?, latitude?, longitude? }` |

All six are wrapped in `src/api/cases.ts` / `src/api/config.ts`. Add new calls there.

## 6. Real-time & notifications
- `src/socket/EmergencyProvider.tsx` holds **one** socket.io connection for the signed-in session
  (`SOCKET_URL`, websocket transport, reconnection with backoff up to 10s) and tears it down on sign-out.
- The event is the backend's own: **`admin:new_emergency`** (`src/socket/emergency.handler.ts`
  emits it to `admin_room` *and* globally). It fires when a P1 case is created, so it is a
  platform-wide dispatch signal, **not** an assignment — the case appears in `/cm/cases` only once an
  administrator assigns it. "Open case" may legitimately land on the 404 "not assigned to you" state.
- On receipt: dedupe by `caseId`, raise `EmergencyAlertModal`, vibrate, fire a local notification,
  and invalidate `['cm-cases']` + `['cm-me']`.
- **Remote push is deliberately not implemented.** There is no device-token endpoint on `/cm/*`, and
  inventing one is forbidden. `src/notifications/index.ts` does local notifications only and wraps
  every call in try/catch. If push is wanted, add the backend endpoint first, then extend this file.
- **Never import `expo-notifications` at module scope.** Its entry point is a barrel that eagerly
  loads the push modules, and one of them calls `requireNativeModule('ExpoTopicSubscriptionModule')`
  at import time. Expo Go has shipped no push native code since SDK 53, so the import alone floods
  the log with that missing-module error (it was appearing ~18× per run) plus a "not fully supported
  in Expo Go" warning. `src/notifications/index.ts` therefore requires the package lazily inside
  `load()`, behind an `inExpoGo()` guard (`isRunningInExpoGo()` from `expo`, falling back to
  `Constants.executionEnvironment === 'storeClient'`), so Expo Go never evaluates it; a development
  or production build loads it on first use. `notificationsAvailable()` is what screens should ask,
  and the Profile screen states plainly when notifications are unavailable.

## 7. Location & availability
- `src/location/index.ts` owns permissions and fixes. `ensureLocationPermission()` returns
  `granted | denied | unavailable`; `getCoords()` prefers a ≤60s last-known fix before waking the
  radio and returns `null` rather than throwing.
- A missing fix **never blocks** an action: the duty toggle and the status sheet both send the update
  without coordinates and say so in the UI.
- `PATCH /cm/availability` carries the pin when going on duty. `PATCH /cm/cases/:id/status` carries it
  so the timeline records where the update happened; the admin console renders that pin on a map.
- Do not poll location on a timer — respect the battery. The fix is read on the actions that need it.

## 8. Case workflow
- Status transitions are **server-authoritative**. `StatusUpdateDialog` offers every status except the
  current one, sends the requested value, and shows the server's rejection message verbatim. Do not
  mirror the transition table on the client.
- Terminal states (RESOLVED, CANCELLED) are the one documented exception used for UI: no action is
  offered on a terminal case, per `API_CONTRACT.md`.
- Priority colours live in `theme.ts`: P1 `#dc2626` (pulsing via `PriorityBadge`), P2 amber, P3 sky.

## 8B. Patient live location & records (case detail)
- `getPatientLocation(caseId)` -> `GET /cm/cases/:id/patient-location`. The card is rendered only
  while the case is non-terminal, because sharing ends with the case and a closed case is a
  guaranteed refusal. A 403 is a normal outcome (consent expired or revoked): show the server's
  message, never a crash state.
- The card shows "Live" vs "Last known", how old the fix is, when sharing expires, and a
  **Navigate to patient** button handed to the device's maps app. It never prints raw coordinates —
  that is the platform rule, and in the field a tap matters more than a number.
- Records (documents) follow the same sharing window. Copy is plain: "Patient records", "Shared
  until HH:MM", and when access is not open, "Records open once the patient confirms sharing in
  their app." Never "Consent Locked", never "(DPDP Guard)" — a care manager in the field reads a
  status, not a compliance acronym.

## 8C. No diagnostics in the UI
The Profile screen shows the person's duty state and support contacts only. API base URLs, socket
connection state, notification-availability notes and alert counters are **developer diagnostics and
must not appear on screen** — they were removed on 2026-10-18 for exactly that reason. Keep them in
logs. Likewise, a shared position renders as "View on map", never as `12.93520, 77.62450`.

## 10. App identity: launcher icon and splash (native assets)
Both apps ship a committed `assets/` folder generated from the administrator's brand mark by
`src/scripts/generate-app-assets.mjs` (pure Node, no image toolchain):

| File | Used for |
|---|---|
| `icon.png` (1024) | iOS + Android legacy launcher icon. Opaque brand background, white glyph, no transparency (iOS rejects alpha). |
| `adaptive-icon.png` (1024) | Android adaptive foreground, artwork inside the 66% safe zone so no mask clips it. |
| `monochrome-icon.png` (1024) | Android 13+ themed icons. |
| `splash-icon.png` (512) | The native splash artwork, transparent so it sits on the configured background. |
| `favicon.png` (64) | Web. |

Regenerate after a branding change: `node src/scripts/generate-app-assets.mjs` (reads the live
`GET /app/config`), or pass a PNG path.

**Rules that keep the launch clean:**
- `app.json` must point `icon`, `android.adaptiveIcon.foregroundImage` and the `expo-splash-screen`
  plugin's `image` at real files. As of `expo-splash-screen@58`, a plugin with **no** image generates a
  **transparent** Android splash drawable — which is exactly the blank white screen users report.
  The legacy top-level `splash` key is gone; the plugin is the only splash config.
- `backgroundColor` is set at the root and per platform, and matches the splash background, so no
  frame of the launch is a different colour.
- `src/nativeSplash.ts` holds the native splash (`preventAutoHideAsync`) at module scope in the root
  layout and releases it from `app/index.tsx`'s `onLayout`, so the native splash hands over only once
  the branded splash has painted. A 3s failsafe in the root layout releases it regardless, so a deep
  link that skips the splash route can never leave the app stuck behind it.
- **Android 12+ shows an icon, never text**, on the system splash — that is the platform API, not a
  limitation of this app. The app name and tagline belong on the JS splash (`app/index.tsx`), which
  reads them from the server config.
- **Expo Go always shows its own icon and splash.** These assets only appear in a real build
  (`npx expo run:android`, or `eas build` using the committed `eas.json`). Do not judge the launch
  experience from Expo Go.

## 9. Rules
- Strict platform separation: never call `/app/*` or admin paths.
- Handle loading / empty / error **and OS permission denial** on every screen.
- Only real backend data — no sample cases, patients or coordinates as fallbacks.
- `npm run typecheck` must stay clean before a change is called done.
