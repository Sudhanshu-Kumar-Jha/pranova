# PRANOVA Care Manager App (React Native + Expo)

Native field-operations app for care managers — assigned cases, case detail with the coordination
timeline, GPS-stamped status updates, an on-duty toggle that pushes the current position, and
real-time emergency alerts over Socket.IO. Pure client of the PRANOVA API (`/api/v1/cm/*`).
See `AGENTS.md`, `.agents/skills/care-manager-app/SKILL.md`, and `API_CONTRACT.md`.

**Stack:** Expo SDK 57 · React Native 0.86 · React 19 · expo-router · react-query v5 · axios ·
zustand · react-native-paper · expo-location · expo-notifications · socket.io-client. No WebViews.

## Run it
```bash
cd care-manager-app
npm install
npx expo start --go --host lan      # the backend must be up on port 5000
```

## Point it at the backend
`src/config.ts` resolves the host in order: `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_SOCKET_URL` → the
Metro bundler's host IP → `app.json` → `extra` → the LAN fallback (`192.168.1.46`). `localhost` is
never reachable from a physical device.
- **Android emulator:** `EXPO_PUBLIC_API_URL=http://10.0.2.2:5000/api/v1` and `EXPO_PUBLIC_SOCKET_URL=http://10.0.2.2:5000`.
- **Device/LAN:** nothing to set — the Metro host IP is used automatically.

## What's implemented
- **Branding from the server.** `GET /cm/config` (public, pre-auth) drives the app name, tagline,
  logo, support numbers and the primary colour; the Paper theme is rebuilt from it at runtime, so
  nothing branded is hard-coded in a screen.
- **Branded splash** (`app/index.tsx`) that holds the configured logo while the session is restored,
  then routes to the cases tab or to sign-in.
- **OTP sign-in** (role `CARE_MANAGER`, dev OTP `123456`) with tokens in `expo-secure-store` and a
  refresh-once-on-401 axios client. No self-registration — administrators onboard care managers.
- **My Cases** — own branded header with a real-name greeting from `GET /cm/me`, live alert-stream
  indicator, active / assigned / P1 counters, server-side status filters, pull-to-refresh, and
  loading, empty and error states. A card opens the case or the status sheet directly.
- **Case detail** (`app/cases/[id].tsx`) — triage summary, patient block with one-tap call, incident
  location with "Get directions" handed to the device's maps app, linked facility, and the full
  append-only coordination timeline (transition, notes, actor, GPS pin). A case that is not assigned
  to you answers 404 and is explained as such rather than shown as an error.
- **Status updates** with field notes and a GPS pin (`PATCH /cm/cases/:id/status`). Transitions stay
  server-authoritative: the sheet sends the requested status and renders the server's answer,
  including its rejection message. Terminal cases (RESOLVED / CANCELLED) offer no action.
- **On-duty toggle** (`PATCH /cm/availability`) in both the header and Profile; going on duty pushes
  the current position, and still succeeds when location is refused.
- **Emergency alerts** — one Socket.IO connection per signed-in session listening for the backend's
  `admin:new_emergency` broadcast, raising a full-screen dispatch dialog, a vibration pattern and a
  local notification, and refreshing the case list.

## Known limits
- **Remote push is not wired.** The `/cm/*` surface has no device-token endpoint, so alerting is
  local only (foreground dialog + local notification). Remote push needs a backend endpoint first;
  inventing one here is not allowed.
- **In Expo Go there are no local notifications either**, by design: `expo-notifications` is loaded
  lazily and skipped entirely in Expo Go, because importing it there logs a missing
  `ExpoTopicSubscriptionModule` native module on every reload. The emergency dialog and the
  vibration still fire, and Profile says so under "Local notifications". Use a development build
  (`npx expo run:android`) to see the notification itself.
- The Socket.IO broadcast is platform-wide, so an alert can arrive for a case that is later assigned
  to someone else. "Open case" then shows the "not assigned to you" state, which is correct.

## Structure
```
app/
  _layout.tsx            providers (query, config, theme, socket) + auth gate
  index.tsx              branded splash
  (auth)/login.tsx       phone + OTP (role CARE_MANAGER)
  (tabs)/_layout.tsx     My Cases · Profile
  (tabs)/index.tsx       assigned cases + duty toggle + filters
  (tabs)/profile.tsx     profile, duty, device/alert status, support, sign out
  cases/[id].tsx         case detail + timeline + status actions
src/
  api/                   client (envelope unwrap + refresh), auth, cases, config
  components/            BrandLogo, CaseCard, StatusChip, PriorityBadge, DutyToggle,
                         StatusUpdateDialog, EmergencyAlertModal, EmptyState, LoadingSkeleton
  providers/             AppConfigProvider (useBrand)
  socket/                EmergencyProvider (admin:new_emergency listener)
  location/              expo-location permission + fix helpers
  notifications/         local notification helper (defensive, Expo Go safe)
  store/                 zustand auth store (expo-secure-store)
  theme.ts               palette, buildTheme(primaryColor), status/priority colours, formatters
  config.ts              API_URL + SOCKET_URL resolution
```
