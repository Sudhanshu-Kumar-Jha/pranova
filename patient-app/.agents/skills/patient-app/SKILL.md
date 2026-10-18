---
name: patient-app
description: Tech stack, folder structure, and coding conventions for the PRANOVA Patient mobile app (React Native + Expo + TypeScript).
---

# PRANOVA Patient App Skill

> Verified against the working tree on **2026-10-17**. The app is implemented and running —
> this describes what exists, not a plan. If the code disagrees, fix this file with the code.

## 1. Stack (pinned versions)
**Expo SDK 58** (`expo ~57.0.30`) · **React Native 0.86.3** · **React 19.2.3** · TypeScript (strict) ·
expo-router ~57 (typed routes, `newArchEnabled: true`) · @tanstack/react-query v5 · axios ·
zustand v4 · expo-secure-store · **@react-native-async-storage/async-storage** (cart) ·
react-native-paper v5 · @expo/vector-icons (MaterialCommunityIcons).
**No WebViews.**

Run it:
```bash
cd patient-app
npm install
npx expo start --go --host lan      # the backend must be up on port 5000
```
Expo Go on a phone needs the backend reachable over the LAN, so the API server must bind `0.0.0.0` (it does).

## 2. Actual folder structure
```
patient-app/
├── app/                                # expo-router, file-based
│   ├── _layout.tsx                     # providers + auth gate
│   ├── index.tsx                       # SPLASH (configured logo) -> tabs or login
│   ├── (auth)/login.tsx                # phone + OTP
│   ├── (tabs)/
│   │   ├── _layout.tsx                 # 5 tabs
│   │   ├── index.tsx                   # home / health dashboard
│   │   ├── consult.tsx                 # doctor directory + my appointments
│   │   ├── pharmacy.tsx                # catalog, cart, my orders
│   │   ├── diagnostics.tsx             # lab tests + my bookings
│   │   └── profile.tsx                 # profile, records, sign out
│   └── video/[appointmentId].tsx       # tele-consult room
├── src/
│   ├── api/   client.ts auth.ts config.ts doctors.ts appointments.ts pharmacy.ts diagnostics.ts
│   ├── components/  DoctorCard AppointmentCard MedicineCard LabTestCard StatusChip
│   │                BookAppointmentModal BookLabTestModal CartCheckoutModal
│   │                BrandLogo ProductImage EmptyState LoadingSkeleton
│   ├── providers/   AppConfigProvider.tsx   # useBrand() / useAppConfig()
│   ├── store/  authStore.ts  cartStore.ts
│   ├── theme.ts                        # design tokens (a FILE, not a folder)
│   └── config.ts                       # API base URL resolution
├── app.json                            # Expo config (app.json, not app.config.ts)
└── tsconfig.json
```
Each tab is a **single screen file**, not a nested route group. There is no `src/hooks/` or
`src/types/` directory — react-query is called from the screens and API modules carry their own types.

## 3. Host resolution (`src/config.ts`)
`resolveApiUrl()` picks, in order: `process.env.EXPO_PUBLIC_API_URL` → the Metro bundler host IP from
`Constants.expoConfig?.hostUri` (so a phone on the same Wi-Fi just works) → `extra.apiUrl` from `app.json`
if it is not localhost → the hard fallback `http://192.168.1.46:5000/api/v1`.
**`localhost` is never usable from a physical device** — that is why the fallback is a LAN IP. When the
dev machine's IP changes, update `extra.apiUrl` in `app.json` and the fallback in `src/config.ts` together.

## 4. API client pattern (`src/api/client.ts`)
- One axios instance, `baseURL = API_URL`, 15s timeout.
- Request interceptor adds `Authorization: Bearer <access>` from `expo-secure-store`
  (keys `pranova_access_token` / `pranova_refresh_token`).
- Response interceptor: on 401, retry once via `POST /auth/refresh-token`, persist the new pair, replay the request.
- `unwrap(res)` strips the standard `{ success, message, data, meta }` envelope. API modules unwrap;
  screens get clean values plus `meta.total` for lists.

## 5. Auth
- `POST /auth/otp/send { phone, role: "PATIENT" }` then `POST /auth/otp/verify { phone, otp, role: "PATIENT" }`.
  The `role` field is **required** — omitting it returns no token.
- Dev credentials: phone `+919123456789`, OTP `123456`.
- Tokens in secure store, session in `authStore`; `app/_layout.tsx` gates `(tabs)` and bounces to `(auth)`.

## 6. Data & lists
- react-query for every read. Keys: `['me']`, `['doctors', filters]`, `['appointments','mine']`,
  `['orders','mine']`, `['lab-bookings','mine']`.
- Lists are paginated: send `page` / `perPage` (the server caps `perPage` at 100) and read `meta.total`.
- Invalidate the matching key after every mutation (book, order, cancel). Pull-to-refresh uses `RefreshControl`.
- Show `LoadingSkeleton` while loading and `EmptyState` when a list is empty — never a bare spinner on a blank screen.

## 7. Domain notes
- **Booking:** `POST /app/appointments` returns the appointment including `videoJoinUrl`. For the room,
  call `POST /app/appointments/:id/video-token` and hand `{ roomId, token, joinUrl }` to the video wrapper.
  The provider is a **mock** today — the room screen renders a placeholder stream, so do not promise real video.
- **Pharmacy:** the cart is client-side (`cartStore`); the server prices the order from the catalog on
  `POST /app/orders`. Never send prices or totals. Display the server's returned total.
- **Diagnostics:** `POST /app/lab-bookings` with `collectionType` `HOME_COLLECTION` | `LAB_VISIT`.
- **Cancel:** `POST /app/appointments/:id/cancel`.
- Status colours come from `StatusChip`: placed/confirmed = sky, in-progress/out-for-delivery = amber,
  completed/delivered/report-ready = emerald, cancelled = red.

## 8. Screen shell: one header, real names
- **One header per screen.** The tab navigator supplies the header for Consult, Pharmacy,
  Diagnostics and Profile. **Home sets `headerShown: false`** in `app/(tabs)/_layout.tsx` because it
  renders its own branded header (logo + app name, greeting, SOS banner) — leaving the navigator
  header on stacks a second bar above it. A screen must never render a page title that repeats its
  navigator title; section headings inside the page are fine.
- Because Home has no navigator header, it owns the status-bar gap itself via `useSafeAreaInsets()`.
- **Greet people by their real name.** The greeting reads `profile.firstName` from the `['me']`
  query; the session object cached at sign-in is only a fallback. With no name, render `Hello` on
  its own — "Patient" is a role label, not a name — and derive the avatar initial from the profile.
- The first screen is the branded splash at `app/index.tsx` — see §9A.

## 9. Branding comes from the server
Nothing about the brand is compiled in. `GET /app/config` (public, no token) returns the
administrator's app name, tagline, logo, primary colour, support contacts and emergency number,
plus the pharmacy's delivery rules.
- `src/providers/AppConfigProvider.tsx` fetches it once and exposes `useBrand()` / `useAppConfig()`.
- `app/_layout.tsx` rebuilds the Paper theme from `primaryColor` with `buildTheme()`, so a Settings
  change re-skins the app with no new build.
- `src/theme.ts` owns the derived colours: `usableBrand()` darkens a colour too light to read as a
  button (an admin really can set `#ffffff`), `onColor()` picks black or white text for a
  background, `tint()` makes soft fills, and `formatINR()` is the only money formatter.
- `src/components/BrandLogo.tsx` renders the configured logo and falls back to a mark in the brand
  colour when none is set or the image fails to load.
- **Never hard-code a brand colour, app name or logo in a screen.** Read `theme.colors.primary` or
  `useBrand()`. Neutral greys and semantic status colours live in `palette` and do not change.

### 9A. Dynamic splash screen (`app/index.tsx`)
- The native splash in `app.json` can only render bundled static assets.
- `app/index.tsx` serves as the dynamic branded splash screen. It renders `<BrandLogo size={84} />`, the administrator-configured `appName`, tagline, and an animated fade/rise entrance.
- **Interactive Tap-to-Dashboard:** The splash screen is wrapped in a `Pressable` (`onPress={go}`). When the patient taps the logo or screen, it skips any remaining timer and navigates immediately to the home dashboard (`/(tabs)`) if authenticated, or to sign-in (`/(auth)/login`) if there is no active session.
- **Session Gate Separation:** The root `AuthGate` in `app/_layout.tsx` checks `(segments as readonly string[]).length === 0` to let the splash screen display smoothly on initial app launch before routing.

## 10. Pharmacy cart and checkout
- The cart (`src/store/cartStore.ts`) persists to AsyncStorage under `pranova_cart_v1`, so it
  survives an app restart. `restore()` is called once from the root layout.
- Checkout (`src/components/CartCheckoutModal.tsx`) is a **Bagisto-style four-step flow**:
  cart → delivery → payment → review, with a stepper, per-step validation and back navigation.
- Delivery address, city, pincode and phone are **prefilled from `GET /auth/me`**. Never seed a
  form with a sample address or number.
- `estimateDeliveryFee()` / `estimateTotal()` display the bill using the admin-configured numbers
  from `useBrand().pharmacy`. They are a preview only — `POST /app/orders` prices the order on the
  server and the returned order is the truth.
- Payment methods come from config: COD when `codEnabled`, online only when `onlinePaymentEnabled`
  (off — no gateway is integrated, and the server refuses it). With both off, checkout is blocked
  with an explanation rather than a silent failure.
- Product images render through `src/components/ProductImage.tsx`, which falls back to a
  category icon when `imageUrl` is empty or the image fails to load.

## 11. Rules
- Strict platform separation: only `/auth/*` and `/app/*`. Never call admin paths or `/cm/*`.
- No server-owned logic on the client (pricing, stock, status rules) — trust and render server responses.
- **No invented data.** Do not fall back to sample names, addresses or emergency contacts when a
  field is null; render "Not recorded" or the real empty state instead.
- **No unearned claims.** The video room is a placeholder until a provider SDK is wired in, and the
  platform makes no HIPAA certification claim — do not put either on a screen.
- Handle loading / empty / error on every screen, and validate input before calling the API.

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

