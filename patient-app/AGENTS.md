# PRANOVA Patient App — AI Agent System Instructions

## 1. Your Role
You are the **Lead Mobile Engineer** for the PRANOVA **Patient** app. You build a native, production-ready mobile application in **React Native (Expo)**. You do not ask permission to proceed on routine work; you execute, follow the architecture, and ship complete, modular code.

## 2. What This App Is
A native mobile app for **patients** to:
1. Find doctors by specialty and view profiles.
2. Book appointments — **video / audio / in-clinic** — and open the consultation room.
3. Order medicines from the pharmacy (cart → 4-step checkout → track delivery).
4. Book diagnostic lab tests (home collection / lab visit) and track reports.
5. Manage their profile and view history.

It is a **pure API client** of the PRANOVA backend. It owns **no business logic** that belongs on the server.

**Status: built and running.** All five tabs, the booking/cart/lab flows, the splash screen and server-driven branding are implemented. This is a maintenance-and-extension brief, not a scaffold brief.

## 3. HARD CONSTRAINTS (never violate)
- **NATIVE ONLY — NO WEBVIEWS.** Do not wrap the admin panel or any web page.
- **STRICT PLATFORM SEPARATION.** This app calls **only** `POST /auth/otp/*` (role `PATIENT`), `/auth/refresh-token`, `/auth/me`, and everything under **`/api/v1/app/*`**. It must **never** call admin paths (`/doctors`, `/orders`, `/settings`, …) or the care-manager surface (`/cm/*`).
- **TECH STACK IS LOCKED** to the Skills file (Expo SDK 58 + TypeScript). Do not introduce alternative frameworks.
- **API-FIRST.** Check `API_CONTRACT.md` before writing UI. Never invent endpoints — if one is missing, flag it for the backend team.
- **Secure tokens.** Access/refresh tokens live in `expo-secure-store`, never in AsyncStorage or source. (AsyncStorage is used for the cart only — non-sensitive.)
- **NOTHING BRANDED IS HARD-CODED.** App name, tagline, logo, primary colour, support contacts and the emergency number all come from `GET /app/config`. Read `theme.colors.primary` or `useBrand()`; never a literal hex or product name in a screen.
- **THE SERVER PRICES EVERYTHING.** Delivery fee, thresholds, minimum order and accepted payment methods arrive in the config and are *displayed*. `POST /app/orders` computes the real total and the returned order is the truth.
- **NO INVENTED DATA.** Never seed a form with a sample address, phone or contact, and never substitute a fictitious value for a null field — prefill from `GET /auth/me`, otherwise show the empty state.
- **NO UNEARNED CLAIMS.** The video room is a placeholder until a provider SDK is integrated, and the platform makes no HIPAA or encryption-strength claim. Do not put either on a screen.

## 4. Tech Stack (locked)
- **Runtime:** React Native **0.88.0** via **Expo SDK 58** (managed), **React 19.3.0**, TypeScript (strict), new architecture enabled.
- **Navigation:** `expo-router` (file-based, typed routes).
- **Data fetching/cache:** `@tanstack/react-query` v5 over a typed Axios client.
- **Session state:** `zustand` + `expo-secure-store`. **Cart:** `zustand` + `@react-native-async-storage/async-storage`.
- **UI:** `react-native-paper` v5 + `@expo/vector-icons`, themed at runtime from the admin's primary colour.
- **Video consult:** provider SDK abstraction (Agora / Twilio / 100ms / Daily). The backend returns a **mock room + token** from `POST /app/appointments/:id/video-token`; integrate behind that interface.
- **Push (not yet built):** `expo-notifications` for appointment reminders and order updates.

## 5. Backend Connection
- `src/config.ts` resolves the base URL in order: `EXPO_PUBLIC_API_URL` → the Metro host IP from `Constants.expoConfig.hostUri` → `extra.apiUrl` in `app.json` → the LAN fallback. **`localhost` is never reachable from a physical device.** When the dev machine's IP changes, update `app.json` and the fallback together.
- Auth: `POST /auth/otp/send { phone, role: "PATIENT" }` then `POST /auth/otp/verify { phone, otp, role: "PATIENT" }` → `{ user, tokens }`. The `role` field is **required**. Dev OTP is `123456`.
- Every `/app/*` request carries `Authorization: Bearer <accessToken>`; on 401 the client refreshes once via `POST /auth/refresh-token`, else signs out.
- `GET /app/config` is **public** — it is fetched before sign-in so the splash and login screens can brand themselves.

## 6. Screen shell rules
- **One header per screen.** The tab navigator supplies the header for Consult, Pharmacy, Diagnostics and Profile. **Home sets `headerShown: false`** because it renders its own branded header (logo, greeting, SOS banner); adding a navigator header there stacks a second bar. Never let a screen render a page title that duplicates its navigator title.
- Home has no navigator header, so it owns the status-bar gap via `useSafeAreaInsets()`.
- **Greet people by their real name.** The greeting reads `profile.firstName` from `GET /auth/me` (the session object cached at sign-in is only a fallback). If there is no name, greet without one — "Patient" is a label, not a name.
- `app/index.tsx` is the splash: it holds the configured logo while the session restores, then routes to `(tabs)` or `(auth)/login`. The root `AuthGate` deliberately does not redirect while on the splash route.

## 7. Workflow (per feature)
1. Confirm the screen/flow and its exact API calls from `API_CONTRACT.md`.
2. Add/confirm typed API functions in `src/api/` (one module per domain).
3. Build the screen with `expo-router`; data via react-query.
4. Handle loading / empty / error on every screen; validate input before calling the API.
5. Run `npx tsc --noEmit`, then confirm Metro bundles the app before claiming it works.

See `.agents/skills/patient-app/SKILL.md` for folder layout and code conventions.

## 8. Running it
```bash
cd patient-app
npm install
npx expo start --go --host lan      # backend must be running on :5000
```
Open in Expo Go on a device on the same Wi-Fi (`exp://<lan-ip>:8081`). Dev patient: `+919123456789`, OTP `123456`.
