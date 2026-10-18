# PRANOVA Patient App (React Native + Expo SDK 57)

Production-ready native mobile app for patients — doctor discovery, tele-consultation video rooms, pharmacy ordering, diagnostic lab bookings, and health records. Strictly consumes the real PRANOVA backend API (`/api/v1/app/*` and `/auth/*`). Built on **Expo SDK 57** (React Native 0.86, React 19) for full compatibility with modern Expo Go on latest Android and iOS.

## 1. Quick Start

Ensure the PRANOVA backend is running at `http://localhost:5000` (started via `npm run dev` at the repository root).

```bash
cd patient-app
npm install
npx expo start --go --host lan
```

Press `a` for Android, `i` for iOS, or scan in Expo Go.

## 2. API & Authentication

- **API Base URL:** Automatically resolves to host machine LAN IP (`http://192.168.1.46:5000/api/v1`) via dynamic detection in `src/config.ts`.
- **Authentication:** Passwordless SMS OTP via `POST /auth/otp/send` and `POST /auth/otp/verify`.
  - **Demo Patient Phone:** `+919123456789`
  - **Development OTP:** `123456`
- **Tokens:** JWT access & refresh tokens securely stored via `expo-secure-store`. Session handled by Zustand (`src/store/authStore.ts`).

## 3. Implemented Modules & Features

### 🌟 Dynamic Branded Splash (`app/index.tsx`)
- Loads administrator-configured `BrandLogo`, app name, and tagline live from `GET /app/config`.
- Elegant animated cubic entrance with smooth fade and rise.
- **Tap-to-Dashboard:** Tapping the logo or screen skips the animation/timer and immediately navigates to `/(tabs)` if authenticated, or `/(auth)/login` if not.
- Seamlessly handoffs to root `AuthGate` in `app/_layout.tsx`.

### 🩺 Home / Health Dashboard (`app/(tabs)/index.tsx`)
- Greeting with patient name and emergency 108 dispatch banner.
- Upcoming consultation card with direct "Join Video Call" action.
- 4-card clinical service launcher (Consult, Pharmacy, Diagnostics, Profile).
- Real-time active pharmacy deliveries & pathology test status tracker.
- Horizontal medical specialties browser.
- Top-rated doctor recommendations with one-tap booking.

### 👨‍⚕️ Doctor Consultations (`app/(tabs)/consult.tsx`)
- Dual-segment navigation: "Find Doctors" vs "My Consultations".
- Search directory by doctor name, specialty, or city.
- Comprehensive doctor cards with experience, rating, qualifications, and clinic/video fees.
- **Booking Flow (`BookAppointmentModal.tsx`):**
  - Mode selector (Video, In-Clinic, Audio).
  - Slot date & time picker.
  - Reason & symptoms input.
  - Submits to real `POST /app/appointments`.
- Filterable appointments history (All, Upcoming, Completed, Cancelled).
- Appointment cancellation modal calling `POST /app/appointments/:id/cancel`.

### 📹 Tele-Consultation Video Room (`app/video/[appointmentId].tsx`)
- Obtains consultation room token via `POST /app/appointments/:id/video-token`.
- Live in-call duration timer.
- Picture-in-picture self-view and doctor stream placeholder.
- In-call controls (Mute mic, toggle camera, end consultation).
- HIPAA-compliant clinical encryption status badge.

### 💊 Pharmacy & Medicine Orders (`app/(tabs)/pharmacy.tsx`)
- Search catalog by brand or salt name.
- Category filters: OTC, Prescription, Wellness, Device.
- Stock availability and Rx requirement badges.
- **Client-Side Cart Store (`src/store/cartStore.ts`):** Floating cart bar with instant item count and total.
- **Cart & Checkout Modal (`CartCheckoutModal.tsx`):**
  - Itemized quantity adjustment.
  - Pre-filled patient delivery address, city, pincode, and phone.
  - Automatic delivery fee calculation (Free above ₹500, ₹40 otherwise).
  - Submits to real `POST /app/orders`.
- "My Orders" tracker with real statuses (PLACED, CONFIRMED, PACKED, OUT_FOR_DELIVERY, DELIVERED).

### 🔬 Diagnostics & Lab Tests (`app/(tabs)/diagnostics.tsx`)
- Pathology catalog with turnaround time and sample preparation instructions (e.g. fasting requirements).
- Category filters (Biochemistry, Hematology, Diabetology, Endocrinology).
- **Test Booking Modal (`BookLabTestModal.tsx`):**
  - Choose Home Sample Collection or Lab Visit.
  - Preferred date & time selection.
  - Submits to real `POST /app/lab-bookings`.
- "My Bookings" tracking screen with status badges (BOOKED, SAMPLE_COLLECTED, PROCESSING, REPORT_READY).

### 👤 Patient Profile & Records (`app/(tabs)/profile.tsx`)
- Patient identity card: Full name, verified mobile phone.
- Clinical records: Blood group, gender, primary address.
- Emergency contact name & phone.
- Real-time counter metrics for total consultations, orders, and lab tests.
- Secure sign-out with token cleansing.

## 4. Architecture & Structure

```
patient-app/
├── app/
│   ├── (auth)/login.tsx              # OTP login screen
│   ├── (tabs)/
│   │   ├── _layout.tsx               # 5-tab navigation bar
│   │   ├── index.tsx                 # Home / Dashboard
│   │   ├── consult.tsx               # Doctor directory & appointments
│   │   ├── pharmacy.tsx              # Medicine catalog, cart, orders
│   │   ├── diagnostics.tsx           # Lab tests & bookings
│   │   └── profile.tsx               # Patient profile & vitals
│   ├── video/[appointmentId].tsx     # Tele-consultation room
│   ├── _layout.tsx                   # Auth gate & Root providers
│   └── index.tsx                     # Dynamic branded splash screen (tap-to-dashboard)
├── src/
│   ├── api/
│   │   ├── client.ts                 # Axios + SecureStore interceptor + refresh
│   │   ├── auth.ts                   # OTP auth & GET /auth/me
│   │   ├── doctors.ts                # Doctor & specialty API
│   │   ├── appointments.ts           # Booking & video token API
│   │   ├── pharmacy.ts               # Medicine catalog & orders API
│   │   └── diagnostics.ts            # Lab tests & bookings API
│   ├── components/
│   │   ├── StatusChip.tsx            # Color-coded clinical status badges
│   │   ├── DoctorCard.tsx            # Doctor listing card
│   │   ├── AppointmentCard.tsx       # Appointment card with join/cancel
│   │   ├── MedicineCard.tsx          # Pharmacy product card
│   │   ├── LabTestCard.tsx           # Diagnostic test card
│   │   ├── BookAppointmentModal.tsx  # Interactive consultation booking
│   │   ├── BookLabTestModal.tsx      # Pathology test booking
│   │   ├── CartCheckoutModal.tsx     # Cart drawer & order placement
│   │   ├── EmptyState.tsx            # Contextual empty state
│   │   └── LoadingSkeleton.tsx       # Calm layout shimmer loaders
│   ├── store/
│   │   ├── authStore.ts              # Session & user credentials store
│   │   └── cartStore.ts              # Pharmacy cart store
│   ├── theme.ts                      # PRANOVA clinical design tokens
│   └── config.ts                     # API endpoint configuration
├── package.json
└── tsconfig.json
```
