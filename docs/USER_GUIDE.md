# PRANOVA Healthcare Platform — Client Operations & Administration User Guide

**Version:** 2.0 (Production Release)  
**Date:** October 2026  
**Audience:** Platform Administrators, Operations Supervisors, Clinical Coordinators, Medical Dispatchers  
**Classification:** Confidential — Prepared for Client Operations & Administration  

---

## 1. Welcome to PRANOVA

PRANOVA is an enterprise-grade, headless, API-first **Healthcare Coordination Platform & Clinical Operations Engine**. A single robust backend powers three dedicated client interfaces:

1. **Central Admin Web Console** — A responsive, high-density React-Admin v5 single-page application for healthcare operations teams, clinical dispatchers, and administrators.
2. **Patient Mobile App** — A native React Native (Expo) consumer application for doctor discovery, video/in-clinic appointment booking, medicine ordering, diagnostic test booking, and emergency SOS dispatching.
3. **Care Manager Mobile App** — A native React Native (Expo) field application for clinical officers managing patient encounters, accepting emergency triage assignments, and documenting clinical progress.

In production, PRANOVA is packaged as a **single unified container**: the Node.js Express server hosts both the complete REST/WebSocket API and the built React-Admin console at `http://localhost:5000/` (or your cloud domain), enabling effortless 1-click deployments on platforms like **Railway** or **Docker**.

---

## 2. Platform Architecture & Production Stack

PRANOVA uses a strictly headless, API-first architecture designed for maximum performance, data integrity, and compliance:

```
                                 +-----------------------------+
                                 |      PRANOVA Ecosystem      |
                                 +-----------------------------+
                                                |
                   +----------------------------+----------------------------+
                   |                                                         |
                   v                                                         v
        +-----------------------+                               +-----------------------+
        |   Admin Web Portal    |                               | Native Mobile Clients |
        |  (React-Admin / MUI)  |                               |  (Patient & Care Mgr) |
        +-----------------------+                               +-----------------------+
                   |                                                         |
                   | REST (/api/v1/*)                                        | REST (/api/v1/app/*, /api/v1/cm/*)
                   | WebSockets (/socket.io)                                 | WebSockets (/socket.io)
                   +----------------------------+----------------------------+
                                                |
                                                v
                                 +-----------------------------+
                                 |    PRANOVA Backend Engine   |
                                 |    (Express + TypeScript)   |
                                 +-----------------------------+
                                                |
                                                v
                                 +-----------------------------+
                                 |     Prisma ORM & MySQL 8    |
                                 |    (Port 3306 - pranova_db) |
                                 +-----------------------------+
```

### Core Architecture Highlights
- **Standard Relational Database:** Powered by standard **MySQL 8.0+** or **MariaDB 10.4+** on port `3306` (database `pranova_db`), using Prisma ORM with strict foreign-key integrity and composite indexing.
- **Strict Surface Segregation:** 
  - Administrative routes (`/api/v1/*`) are accessible only by the Admin Web Portal.
  - Patient consumer routes (`/api/v1/app/*`) are consumed exclusively by the Patient Mobile App.
  - Care Manager field routes (`/api/v1/cm/*`) are consumed exclusively by the Care Manager Mobile App.
- **Single-Container Web & API Hosting:** Express automatically serves the compiled production bundle of the React-Admin single-page application from `admin-web/dist` at `/` and `/admin`.
- **Immutable Clinical Timelines:** Case history records (`CaseTimeline`) are append-only. Hard deletes and updates are rejected at the ORM extension and service levels to ensure strict clinical compliance.
- **Zero-Downtime Connection Retry:** Intelligent database connection retry with exponential backoff prevents spurious 500 errors during brief network latency or reconnects.

---

## 3. Accessing the Admin Console

### 3.1 Platform URL & Slug Structure
Access the platform using your configured **`APP_URL`** (e.g. `https://<your-app-slug>.up.railway.app` or custom domain):
- **Admin Web Console:** `${APP_URL}/` and `${APP_URL}/admin`
- **System Health Check:** `${APP_URL}/health`
- **REST API Base Engine:** `${APP_URL}/api/v1`
- **Interactive OpenAPI Explorer:** `${APP_URL}/api-docs`

### 3.2 Default Production Credentials
On first boot, the platform automatically initializes and verifies the Super Administrator account:

| Attribute | Default Value | Notes |
| :--- | :--- | :--- |
| **Email** | `admin@pranova.com` | Configurable via `ADMIN_EMAIL` in `.env` |
| **Password** | `Admin@123456` | Configurable via `ADMIN_PASSWORD` in `.env` |
| **Role** | `ADMIN` | Super Administrator with full permissions |
| **Landing Page** | `#/dashboard` | Command Center Operations Dashboard |

> **Security Recommendation:** Immediately after initial login, navigate to **Administrators** to change the default password and provision individual admin accounts for each team member.

---

## 4. Command Center Dashboard

The **Command Center** dashboard (`#/dashboard`) provides an instantaneous, real-time snapshot of platform activity, patient volume, and revenue metrics.

### 4.1 Key Performance Indicator (KPI) Widgets
1. **Revenue (Gross Merchandise Value — GMV):** Total combined revenue generated across consultations, online pharmacy orders, and diagnostic laboratory tests.
2. **Active Doctors:** Total qualified clinicians currently accepting consultations.
3. **Appointments:** Total booked consultations, highlighting today’s scheduled sessions.
4. **Pharmacy Orders:** Total medicine orders, displaying how many require fulfillment.
5. **Lab Bookings:** Diagnostic tests ordered by patients awaiting phlebotomy sample collection or lab processing.
6. **Registered Patients:** Total patient demographic profiles onboarded.
7. **Active Emergency Cases:** Live P1, P2, and P3 triage cases requiring field dispatch or supervision.

### 4.2 Interactive Analytics & Charts
- **Appointments by Status:** Donut chart breaking down requested, confirmed, in-progress, and completed consultations.
- **Recent Consultations Table:** Clickable table providing direct access to patient details, assigned doctor, and consultation rooms.
- **Real-Time Refresh:** Click the **Refresh** button on the top right to pull the latest platform metrics.

---

## 5. Doctor Catalog & Telemedicine Consultations

### 5.1 Specialties Directory (`#/specialties`)
Define the clinical specialties that patients browse in the mobile application (e.g., Cardiology, Pediatrics, General Medicine, Dermatology, Orthopedics). Each specialty includes an icon identifier and description.

### 5.2 Doctor Directory (`#/doctors`)
Onboard clinicians and manage their public profile:
- **Profile Information:** Full name, medical qualifications (e.g., MBBS, MD Cardiology), license registration number, years of experience, languages spoken, and bio.
- **Pricing:** Separate fee configurations for in-clinic visits and virtual teleconsultations.
- **Weekly Availability Slots:** Set active consultation hours by day of the week, consultation duration, and room type.
- **Status Control:** Toggle clinician status between `ACTIVE`, `ON_LEAVE`, and `INACTIVE`.

### 5.3 Appointment Management (`#/appointments`)
Track consultations from booking to completion:

| Status | Meaning | Set By |
| :--- | :--- | :--- |
| **REQUESTED** | Patient booked a slot via the mobile app | Patient / System |
| **CONFIRMED** | Booking accepted; teleconsultation video room generated | System / Admin |
| **IN_PROGRESS** | Clinician and patient are currently in consultation | Clinician / Admin |
| **COMPLETED** | Consultation finished; clinical notes and prescription issued | Clinician / Admin |
| **CANCELLED** | Appointment cancelled by patient or administrator | Patient / Admin |
| **NO_SHOW** | Patient failed to attend scheduled slot | Clinician / Admin |

> **Teleconsultation Video Rooms:** For virtual visits, PRANOVA automatically creates a secure, end-to-end encrypted video room link accessible from the appointment detail view.

---

## 6. Online Pharmacy & Medicine Logistics

### 6.1 Medicine Catalog (`#/medicines`)
Manage pharmaceutical inventory and retail offerings:
- **Product Details:** Commercial brand name, generic formulation, manufacturer, dosage form (Tablet, Syrup, Injection, Capsule, Ointment), strength, and packaging.
- **Pricing & Prescription:** Retail MRP, discounted sale price, and `isPrescriptionRequired` flag.
- **Product Imagery:** High-resolution product images uploaded directly via `ProductImageInput` or hosted image URLs.

### 6.2 Order Processing & Fulfillment (`#/orders`)
Manage patient medicine orders through standard fulfillment states:

| Status | Action / Meaning | Operations Responsible |
| :--- | :--- | :--- |
| **PLACED** | Order submitted by patient; price calculated on server | Automated System |
| **CONFIRMED** | Prescription verified; order accepted for packaging | Pharmacy Admin |
| **PACKED** | Medications picked, boxed, and labelled | Warehouse / Pharmacy |
| **OUT_FOR_DELIVERY** | Handed over to courier; patient notified | Dispatch Team |
| **DELIVERED** | Delivery confirmed at patient address; marked paid | Courier / Dispatch |
| **CANCELLED** | Order cancelled; reserved inventory returned to catalog | Admin / Patient |

> **Server-Enforced Pricing:** Item prices, delivery fees, taxes, and discounts are computed strictly on the backend server. The mobile app cannot manipulate order totals.

---

## 7. Diagnostic Tests & Laboratory Bookings

### 7.1 Diagnostic Test Catalog (`#/diagnostic-tests`)
Create and price pathology and diagnostic panels:
- **Parameters:** Test name, target pathology category (Hematology, Biochemistry, Radiology, etc.), turnaround time in hours, and clinical fasting/preparation instructions.
- **Sample Requirements:** Blood, urine, swab, or imaging scan specifications.

### 7.2 Lab Bookings Workflow (`#/lab-bookings`)
Oversee diagnostic investigations from booking through lab report generation:

| Status | Workflow Stage | Responsible Party |
| :--- | :--- | :--- |
| **BOOKED** | Patient scheduled test (Home Collection or Center Visit) | Patient / System |
| **SAMPLE_COLLECTED** | Phlebotomist collected sample from patient | Field Phlebotomist / Lab |
| **PROCESSING** | Laboratory analyzing specimen | Diagnostic Lab Tech |
| **REPORT_READY** | Certified PDF lab report uploaded and released to patient | Diagnostic Lab / Admin |
| **CANCELLED** | Booking cancelled prior to sample collection | Patient / Admin |

---

## 8. Emergency SOS Cases & Field Care Manager Dispatch

### 8.1 Emergency Alert Engine (`socket.io`)
When a patient taps the emergency **SOS** button in their mobile app:
1. An immutable P1 emergency case is instantly generated with precise GPS fix and physical street address.
2. The server broadcasts a high-priority `admin:new_emergency` alert over WebSockets.
3. The Admin Console sounds an audible chime and opens the **Emergency Dispatch Modal**.
4. The operator acknowledges the emergency and assigns a field Care Manager.

### 8.2 Case Priority Levels (`#/cases`)
- **P1 (Critical / Life-Threatening):** Acute medical emergencies (chest pain, severe respiratory distress, major trauma). Immediate field triage dispatch.
- **P2 (Urgent / Unstable):** High-fever, post-operative complications, acute pain requiring priority clinical visit.
- **P3 (Standard Care Coordination):** Chronic disease management, routine follow-ups, medication reviews.

### 8.3 Case Status Lifecycle
- `OPEN` -> `ASSIGNED` -> `IN_PROGRESS` -> `RESOLVED` (or `CANCELLED`).
- Every reassignment, status change, and clinical comment is appended to the **Immutable Case Timeline** (`CaseTimeline`), complete with timestamp and actor role.

### 8.4 OpenStreetMap Clickable Locations
Every incident address or GPS coordinate renders via `LocationLink`. Clicking the location opens an embedded OpenStreetMap with an accurate pin and quick-action links to Google Maps and OpenStreetMap directions.

---

## 9. Patient, Care Manager & Provider Registries

### 9.1 Patient Profiles (`#/patients`)
Demographic and medical registry:
- Full name, mobile number, emergency contacts, date of birth, blood group (A+, B+, O+, AB+, etc.), documented allergies, and medical history.
- Direct access to patient clinical documents and case encounters.

### 9.2 Care Manager Directory (`#/care-managers`)
Field clinical officers:
- Specialization, active caseload count, assigned operating zone, phone number, and availability status.

### 9.3 Healthcare Providers (`#/providers`)
Network directory of medical infrastructure:
- Provider type: **Hospitals**, **Clinics**, **Diagnostic Labs**, **Pharmacies**, and **Ambulance Services**.
- Address, city, pincode, operating hours, emergency contact hotline, and GPS coordinates.

---

## 10. Clinical Documents & Verified Attachment Viewer

### 10.1 Document Management (`#/documents`)
PRANOVA maintains a centralized medical document repository:
- Medical reports, prescriptions, lab results, and discharge summaries attached to patients.
- **Secure File Viewing:** Documents are safely served via authenticated routes (`/api/v1/documents/:id/view`) or administrative previews.
- **Verified Sample PDFs:** The system includes baseline clinical sample reports for cardiac panels and laboratory tests in `uploads/documents/`.

---

## 11. System Settings & Branding

### 11.1 Dynamic Runtime Branding (`#/settings`)
Administrators can customize the platform appearance without redeploying code:
- **Application Name:** Displayed in the browser title and navigation headers (e.g. `PRANOVA`).
- **Tagline:** Operations console subtitle.
- **Primary Brand Color:** Controls AppBar theme accents, buttons, and status highlights (default: Medical Teal `#0B6E6E`).
- **Logo & Favicon:** Custom image URLs or uploaded assets.
- **Support Contact:** Official platform support email and emergency hotline phone numbers.

### 11.2 Controlled Data Export (`ExportCasesModal`)
When generating CSV or Excel reports of clinical cases, administrators are prompted to provide an **administrative justification** (e.g. "Monthly Clinical Audit", "Insurance Reimbursement Review"). This justification is permanently logged for compliance.

---

## 12. Production Cloud Deployment (Railway & Docker)

PRANOVA is optimized for zero-friction cloud deployment. When built for production, a single container serves both the Web Admin Console and the REST/WebSocket API.

### 12.1 Deploying on Railway (Client Demo Ready)
1. Push repository to GitHub (`https://github.com/Aman-Kumar-roy/pranova`).
2. Log into [Railway](https://railway.app/) and create a new project from your repository.
3. Click **"+ New"** -> **"Database"** -> **"Add MySQL"**.
4. In the Web Service settings under **Variables**, link `DATABASE_URL` to the MySQL database.
5. Railway automatically executes:
   - **Build Command:** `npm install && npm run build` (compiles backend TypeScript and builds React-Admin UI)
   - **Start Command:** `npx prisma db push --skip-generate && cross-env NODE_ENV=production npm start`
6. Open your live Railway URL (`https://pranova-production.up.railway.app`). The Admin Console loads immediately!

---

## Appendix A: First-Login Operational Checklist

Follow this checklist upon launching a fresh PRANOVA deployment:

- [ ] **Sign In:** Log into the Admin Console using `admin@pranova.com` / `Admin@123456`.
- [ ] **Change Admin Password:** Go to **Administrators** and update your password.
- [ ] **Configure Branding:** Navigate to **Settings** and set your Organization Name, Logo, and Support Email.
- [ ] **Verify Specialties:** Ensure core clinical specialties are created.
- [ ] **Onboard Clinicians:** Add doctors, upload photos, set consultation fees, and configure availability slots.
- [ ] **Review Pharmacy Catalog:** Ensure common medications and pricing are active.
- [ ] **Review Diagnostic Tests:** Verify lab test panels, preparation instructions, and fees.
- [ ] **Check Dashboard:** Verify live KPI cards and appointment breakdown charts display active data.

---

## Appendix B: Support & Architecture Contacts

For deployment support, architectural inquiries, or technical assistance:
- **Repository:** [https://github.com/Aman-Kumar-roy/pranova](https://github.com/Aman-Kumar-roy/pranova)
- **Email:** `support@pranova.health` / `engineering@pranova.com`
- **License:** MIT Open Source License

---
*© 2026 PRANOVA Healthcare Coordination Platform. All rights reserved.*
