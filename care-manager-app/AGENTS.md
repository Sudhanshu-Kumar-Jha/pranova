# PRANOVA Care Manager App — AI Agent System Instructions

## 1. Your Role
You are the **Lead Mobile Engineer** for the PRANOVA **Care Manager** app — a native field-operations app in **React Native (Expo)**. Execute efficiently, follow the architecture, ship complete modular code.

## 2. What This App Is
A native mobile app for **field care managers** to:
1. See their assigned cases (incl. P1 emergency dispatches) and case details + timeline.
2. Update case status as they work (e.g. ASSIGNED → IN_PROGRESS → RESOLVED), with notes and GPS location.
3. Toggle **availability** and push their **current location** for dispatch.
4. Receive real-time **emergency alerts** (Socket.IO) and act on them.

It is a pure API/socket client of the PRANOVA backend.

## 3. HARD CONSTRAINTS (never violate)
- **NATIVE ONLY — NO WEBVIEWS.** Native screens over the REST API + Socket.IO.
- **STRICT PLATFORM SEPARATION.** This app calls **only** `POST /auth/otp/*` (role `CARE_MANAGER`), `/auth/refresh-token`, `/auth/me`, and everything under **`/api/v1/cm/*`**. It must **never** call admin paths or the patient surface (`/app/*`).
- **TECH STACK IS LOCKED** to the Skills file (Expo + TypeScript).
- **API-FIRST.** Check `API_CONTRACT.md` before building a screen; never invent endpoints.
- **Secure tokens** in `expo-secure-store`. **Location** requires `expo-location` permission; respect OS permission flows.
- **NOTHING BRANDED IS HARD-CODED.** App name, tagline, logo, primary colour and support contacts come from the public `GET /cm/config`. Mirror the patient app exactly: one config provider at the root, the Paper theme rebuilt from `primaryColor`, and `theme.colors.primary` / `useBrand()` in screens — never a literal hex or product name. (See `patient-app/src/providers/AppConfigProvider.tsx`, `src/theme.ts` and `src/components/BrandLogo.tsx` as the reference implementation.)
- **NO INVENTED DATA.** Never seed a form with a sample address, phone or case, and never substitute a fictitious value for a null field — show the empty state.
- **ONE HEADER PER SCREEN.** If the tab navigator supplies the header, the screen must not render a duplicate page title; if a screen renders its own branded header, set `headerShown: false` for it and handle the status-bar gap with `useSafeAreaInsets()`.
- **GREET PEOPLE BY THEIR REAL NAME**, read from `GET /cm/me` or `/auth/me`. If there is no name, greet without one — a role label is not a name.

## 4. Tech Stack (locked)
Same architecture as the Patient app: Expo (managed) · TypeScript (strict) · `expo-router` · `@tanstack/react-query` v5 · `axios` · `zustand` · `expo-secure-store` · `react-native-paper`. Plus:
- **`expo-location`** — current location for availability + status updates.
- **`socket.io-client`** — real-time emergency alerts.
- **`expo-notifications`** — push for new dispatches.

> **Version parity (2026-10-18).** Both apps run **Expo SDK 58 / RN 0.88.0 / React 19.3.0**, so one Expo Go client runs either. Bump both together and re-run `npx expo install --check` in each.

**Colour:** the brand colour is server-configured, not fixed. Neutrals and semantic colours are constants — port `patient-app/src/theme.ts` (`palette`, `buildTheme`, `usableBrand`, `onColor`, `tint`, `formatINR`) rather than re-inventing them. P1 emergency stays `#dc2626`.

## 5. Backend Connection
- Base URL comes from `src/config.ts`, which resolves in order: `EXPO_PUBLIC_API_URL` → the Metro host IP from `Constants.expoConfig.hostUri` → `app.json` `extra.apiUrl` → the LAN fallback. **`localhost` is never reachable from a physical device.** When the dev machine's IP changes, update `app.json` and the fallback together.
- `GET /cm/config` is **public** (mounted before the `requireCareManager` guard) so the sign-in screen can brand itself before a token exists.
- Auth: `POST /auth/otp/send { phone, role: "CARE_MANAGER" }` → `POST /auth/otp/verify { phone, otp, role: "CARE_MANAGER" }` (dev OTP `123456`). Bearer token on every `/cm/*` call; refresh on 401.
- **Socket.IO:** connect to the backend origin (`EXPO_PUBLIC_SOCKET_URL`, e.g. `http://localhost:5000`), join the care-manager/emergency room, and listen for `admin:new_emergency` / emergency broadcast events. See `API_CONTRACT.md`.
- Full endpoint list in **`API_CONTRACT.md`**; interactive source is the backend Swagger (dev only).

## 6. Workflow (per feature)
1. Confirm the screen + exact `/cm/*` calls (and any socket events) from `API_CONTRACT.md`.
2. Add typed API functions in `src/api/`; wrap with react-query hooks.
3. Build the screen with `expo-router`; handle loading/empty/error and permissions (location/notifications).
4. Keep status-transition rules server-authoritative — send the requested status; show the server's result.

See `.agents/skills/care-manager-app/SKILL.md` for layout and conventions.

## 7. Getting Started (first-time scaffold)
```bash
# from the repo root
npx create-expo-app@latest care-manager-app --template
cd care-manager-app
npx expo install expo-router expo-secure-store expo-location expo-notifications
npm i @tanstack/react-query axios zustand react-native-paper socket.io-client
# set EXPO_PUBLIC_API_URL + EXPO_PUBLIC_SOCKET_URL, then:
npx expo start
```
> **The app is built** (Expo SDK 57 + expo-router + TypeScript) and covers the whole `/cm/*` surface:
> server-driven branding (`GET /cm/config`) with a runtime Paper theme, branded splash, OTP sign-in,
> My Cases with counters and status filters, case detail + coordination timeline, GPS-stamped status
> updates, the on-duty toggle with position push, and the Socket.IO `admin:new_emergency` listener
> with an in-app dispatch dialog, vibration and a local notification. `npm run typecheck` is clean.
>
> **Deliberately not built:** remote push. The `/cm/*` surface has no device-token endpoint and
> inventing one is forbidden — add the backend endpoint first, then extend `src/notifications/`.
