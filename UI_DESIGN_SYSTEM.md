# PRANOVA HEALTHCARE PLATFORM - GLOBAL CLINICAL DESIGN SYSTEM

## 1. Design Philosophy: Mission-Critical Clinical Engineering
The PRANOVA Admin Web Console is an enterprise-grade emergency healthcare orchestration interface. The UX must evoke the precision, reliability, and sobriety of intensive care monitors and aviation dispatch systems.

### Core Tenets
1. **Zero Distraction & Absolute Sobriety**: No generic web templates, no cartoonish illustrations, no placeholder badges, and no artificial watermarks.
2. **Instant Cognitive Triage**: Emergency states (P1 Emergency) must command visual hierarchy instantly through high-contrast indicators and calibrated pulsing animations.
3. **High Information Density**: Healthcare operators require complete patient context, vital timelines, and field dispatch status at a single glance without unnecessary vertical scrolling.
4. **Predictable Immutability**: All compliance actions (audit records, status transitions, provider assignments) must present unambiguous validation states.

---

## 2. Color Palette & Semantic Tokens

| Token | Hex Value | Semantic Purpose |
|---|---|---|
| `clinical-primary` | `#0284c7` (Ocean Cyan) | Primary actions, clinical navigation, active tab states |
| `clinical-primary-dark` | `#0369a1` | Hover states, focused selection borders |
| `clinical-secondary` | `#0f766e` (Deep Clinical Teal) | Secondary workflows, Care Manager resources |
| `clinical-secondary-light` | `#14b8a6` | Metric highlights, Care Manager active badges |
| `status-p1-emergency` | `#dc2626` (Emergency Crimson) | Life-threatening P1 cases, SOS alerts, active dispatches |
| `status-p1-pulse` | `rgba(220, 38, 38, 0.2)` | Pulsing ring for active emergency banners & modals |
| `status-p2-urgent` | `#d97706` (Amber Warning) | P2 Urgent cases requiring attention within 60 mins |
| `status-p3-routine` | `#2563eb` (Clinical Cobalt) | Scheduled routine checkups, standard consultations |
| `status-resolved` | `#059669` (Stable Emerald) | Closed cases, online microservices, verified audits |
| `surface-bg-light` | `#f8fafc` (Slate 50) | Clinical viewport background |
| `surface-card-light` | `#ffffff` (Pure White) | Card containers with `1px solid #e2e8f0` |
| `surface-bg-dark` | `#0b1120` (Deep Space Navy) | Night shift monitoring mode viewport background |
| `surface-card-dark` | `#111827` (Slate 900) | Card containers with `1px solid rgba(255,255,255,0.08)` |
| `text-primary-light` | `#0f172a` (Slate 900) | Maximum contrast clinical typography |
| `text-muted-light` | `#64748b` (Slate 500) | Metadata, timestamps, helper labels |

---

## 3. Typography Architecture
- **Primary Font Family**: `'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif`
- **Monospace Font Family**: `'JetBrains Mono', 'Fira Code', 'Roboto Mono', monospace` (Used for Case IDs `PRN-YYYY-XXXX`, coordinates, IP addresses, and JWT payloads)

### Type Scale & Hierarchy
- **Header 1 (Command Center Title)**: 24px / 32px, Weight: 800, Tracking: -0.02em
- **Header 2 (Resource Lists / Viewports)**: 18px / 24px, Weight: 700, Tracking: -0.01em
- **Header 3 (Card Titles / Section Dividers)**: 14px / 20px, Weight: 600, Text Transform: Uppercase, Tracking: 0.05em
- **Body 1 (Primary Data Cells & Form Inputs)**: 14px / 20px, Weight: 500
- **Body 2 (Secondary Metadata)**: 12px / 16px, Weight: 400, Color: `#64748b`
- **Monospace Badges**: 11px / 14px, Weight: 700, Padding: 2px 8px, Border Radius: 4px

---

## 4. Elevation, Borders & Glassmorphism
- **Default Card Border**: `1px solid #e2e8f0` (Light) / `1px solid rgba(255, 255, 255, 0.08)` (Dark)
- **Border Radius**: Consistent `8px` for inputs and action buttons; `12px` for cards and modals.
- **Glassmorphism Spec (App Bar & Floating Action Bars)**:
  - `backdrop-filter: blur(12px)`
  - `background: rgba(255, 255, 255, 0.85)` (Light) / `rgba(17, 24, 39, 0.85)` (Dark)
  - Box Shadow: `0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)`

---

## 5. Animation & Motion Guidelines
1. **Critical Alert Pulse (`@keyframes emergencyPulse`)**:
   ```css
   @keyframes emergencyPulse {
     0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7); }
     70% { box-shadow: 0 0 0 10px rgba(220, 38, 38, 0); }
     100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
   }
   ```
2. **Transition Duration**: All hover effects, drawer slides, and modal popups must execute within `150ms - 200ms` with `cubic-bezier(0.4, 0, 0.2, 1)`.
3. **Skeleton Loading**: High-frequency shimmer animation replaces jarring spinner wheels for clinical table loading.

---

## 6. Component Standards
- **Case Priority Indicator**:
  - `P1`: Emergency Crimson badge with active animated pulse dot.
  - `P2`: Urgent Amber badge.
  - `P3`: Cobalt Blue badge.
- **Data Tables**:
  - Compact padding (`dense` mode by default).
  - Hover highlight with subtle primary tint.
  - Quick action menu buttons pinned to the rightmost column.
- **Emergency Modal**:
  - Centered dialog with 3px Crimson top border.
  - Live GPS coordinate display with mapping link.
  - Immediate Care Manager dispatch dropdown and single-click confirm CTA.

---

## 7. Dynamic Branding & Runtime Theme Config
The primary clinical brand color (`clinical-primary`) is dynamic and runtime-configurable from Admin Branding Settings (`/admin/settings` -> `settings.primary_color`):
- **Default Baseline**: `#0284c7` (Ocean Cyan) in Light Mode and `#4FB3AE` in Dark Mode.
- **Dynamic Propagation**: Admin web console and mobile clients consume runtime config via `GET /api/v1/app/config` and `/api/v1/settings`.
- **Theme Calculation**: The CSS variable `--color-primary` and MUI/Paper theme `palette.primary.main` are dynamically recalculated at runtime with derived hover (`primaryHover`), pressed (`primaryPressed`), and soft background (`primarySoft`) tint tokens.
- **Mobile Client Integration**: Both `patient-app` and `care-manager-app` subscribe to runtime branding via `AppConfigProvider`, dynamically adapting primary buttons, active tabs, and navigation highlights without requiring app store updates.

