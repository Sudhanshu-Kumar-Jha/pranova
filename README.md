# PRANOVA — Enterprise Healthcare Coordination Platform & Clinical Operations Engine

[![Node.js](https://img.shields.io/badge/Node.js-18%2B%20%7C%2020%2B%20LTS-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.4-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![React-Admin](https://img.shields.io/badge/React--Admin-v5-2563EB?logo=react&logoColor=white)](https://marmelab.com/react-admin/)
[![Railway Ready](https://img.shields.io/badge/Railway-Production%20Ready-0B0D0E?logo=railway&logoColor=white)](https://railway.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

PRANOVA is an enterprise-grade, headless, API-first **Healthcare Coordination & Clinical Operations Platform**. It coordinates emergency response, clinical triage, telemedicine appointments, diagnostic bookings, and pharmacy logistics across three distinct user surfaces:

1. **Central Admin Web Console** — React-Admin v5 single-page application for clinical coordinators, operations supervisors, and dispatchers.
2. **Patient Mobile App** — Native React Native (Expo) app for booking doctors, lab tests, ordering medicines, and triggering emergency SOS.
3. **Care Manager Mobile App** — Native React Native (Expo) app for field clinical officers accepting triage dispatch, managing patient encounters, and updating case status.

The platform is designed for **high-performance production deployment** on cloud container platforms (**Railway**, **Render**, **Docker**, **AWS**, **GCP**). The Node.js Express server hosts both the complete REST/WebSocket API and the built React-Admin web console from a **single unified container**.

---

## Production Architecture Overview

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

### Core Production Highlights
- **Single-Container Deployment:** In production, the Express backend serves the compiled React-Admin console at `/` and `/admin` while simultaneously powering all REST endpoints, WebSocket event streams, and OpenAPI documentation.
- **Strict Surface Segregation:**
  - Administrative routes (`/api/v1/*`) are dedicated to the Admin Web Portal.
  - Patient consumer routes (`/api/v1/app/*`) are dedicated to the Patient Mobile App.
  - Field care manager routes (`/api/v1/cm/*`) are dedicated to the Care Manager Mobile App.
- **Zero-Downtime Resilience:** Resilient connection retry logic handles transient network connection resets with exponential backoff to eliminate spurious 500 errors.
- **Production Hardening:**
  - `NODE_ENV=production` enforced across all production commands.
  - Morgan logging operates in standard `combined` Apache/Nginx format.
  - Prisma query logging is restricted strictly to errors (`['error']`), preventing log flooding.
  - Internal error stack traces are suppressed from client API responses.
  - Auth cookies enforce `secure: true` on HTTPS.

---

## Project Structure

```
d:/PRANOVA
├── admin-web/                     # React-Admin Web Application (Vite + MUI v5)
│   ├── src/
│   │   ├── components/            # Sticky AppBar, Navigation Menu, Dashboard, Emergency Listener
│   │   ├── design/                # Medical-grade tokens (teal/slate palette, elevations, typography)
│   │   ├── providers/             # React-Admin REST Data Provider & JWT Auth Provider
│   │   ├── resources/             # Admin, Patients, Care Managers, Providers, Cases, Doctors, etc.
│   │   └── ui/                    # Reusable clinical primitives (LocationLink, PersonCell, StatusChip)
│   ├── package.json
│   └── vite.config.ts
├── prisma/
│   ├── schema.prisma              # Complete MySQL schema with full relations, enums, & table maps
│   ├── seed.ts                    # Production database seeder initializing doctors, medicines, & tests
│   └── migrations/                # Version-controlled Prisma schema migrations
├── src/
│   ├── config/                    # Production environment resolver & Railway MySQL auto-detector
│   ├── controllers/               # Express route controllers with Zod schema validation
│   ├── db/                        # Database connection pool & Super Admin startup synchronizer
│   ├── middlewares/               # JWT authentication, role guards (RBAC), and rate limiting
│   ├── routes/                    # Modular API route definitions
│   ├── services/                  # Business logic services & data import/export engines
│   ├── socket/                    # Socket.IO real-time emergency alert broadcast engine
│   ├── utils/                     # Prisma client instance, pagination, and reference generators
│   ├── app.ts                     # Express application definition & static admin UI mount
│   └── server.ts                  # Main HTTP/Socket server lifecycle & graceful shutdown
├── swagger/
│   ├── index.html                 # Standalone browser-based Swagger UI explorer
│   └── swagger.json               # Auto-generated OpenAPI 3.0 specification
├── uploads/
│   └── documents/                 # Medical document attachment store
├── .env.example                   # Production environment template
├── .gitignore                     # Production ignore rules (excludes node_modules, build & mobile source)
├── AGENTS.md                      # AI coding agent architecture & governance specification
├── ARCHITECTURE.md                # System technical architecture guide
├── Dockerfile                     # Production container definition
├── docker-compose.yml             # MySQL & platform orchestration
├── Procfile                       # Cloud platform process declaration
├── railway.json                   # Railway deployment configuration
├── package.json                   # Root package definitions & build orchestrator
└── README.md                      # Production deployment documentation
```

> **Note on Mobile Applications:** The native mobile applications (`patient-app/` and `care-manager-app/`) are maintained in separate client workspaces and excluded from git in this repository via `.gitignore`. This ensures cloud deployments (such as Railway or Render) only build and serve the backend API engine and Admin Web Console for clean, high-performance client demonstrations. All mobile API surfaces (`/api/v1/app/*` and `/api/v1/cm/*`) remain 100% functional and ready for mobile client connections.

---

## Production System Requirements

- **Node.js:** `v18.0.0` or higher (`v20.x` LTS recommended)
- **npm:** `v9.0.0` or higher
- **Database:** **MySQL 8.0+** or **MariaDB 10.4+** running on port `3306`
- **Memory:** Minimum 1 GB RAM (2 GB+ recommended for production workloads)

---

## Production Installation & Setup Guide

Follow these steps to deploy and run PRANOVA in production:

### Step 1: Clone the Repository
```bash
git clone https://github.com/Aman-Kumar-roy/pranova.git
cd pranova
```

### Step 2: Configure Production Environment
Copy the production environment template:
```bash
cp .env.example .env
```

Open `.env` and configure your production MySQL connection and security keys:
```ini
NODE_ENV=production
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.com
PORT=5000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=pranova_db
DB_USERNAME=root
DB_PASSWORD=your_production_mysql_password

JWT_SECRET=your_secure_32_char_access_token_secret
JWT_REFRESH_SECRET=your_secure_32_char_refresh_token_secret
```

### Step 3: Install Production Dependencies
```bash
npm install
```

### Step 4: Synchronize Database Schema
Push the Prisma schema to your MySQL database:
```bash
npm run prisma:push
```

### Step 5: Seed Baseline Platform Data
Populate the database with initial doctors, medicines, diagnostic packages, and default settings:
```bash
npm run seed
```
*(Alternatively, run `npm run db:import` to restore verified clinical demo data from backup).*

### Step 6: Build the Production Application
Build both the backend TypeScript engine and the React-Admin web console into optimized production bundles:
```bash
npm run build
```

### Step 7: Launch the Production Server
Start the production server:
```bash
npm start
```

The production server starts in **`production`** mode, anchoring all platform endpoints to your configured **`APP_URL`** (e.g. `https://<your-app-slug>.up.railway.app` or custom domain):
- **Admin Web Console:** `${APP_URL}/` and `${APP_URL}/admin`
- **Production Health Check:** `${APP_URL}/health`
- **REST API Endpoints:** `${APP_URL}/api/v1/*`
- **Interactive OpenAPI Explorer:** `${APP_URL}/api-docs`

---

## Default Production Credentials

On startup, PRANOVA automatically creates and verifies the Super Administrator account configured in `.env`:

| Role | Email | Password | Surface |
| :--- | :--- | :--- | :--- |
| **Super Administrator** | `admin@pranova.com` | `Admin@123456` | Web Admin (`/` or `/admin`) |

---

## Railway 1-Click Cloud Deployment (Client Demo)

PRANOVA is pre-configured for instant production deployment on [Railway](https://railway.app/) using `railway.json` and `Procfile`.

### How It Works on Railway
In production, the backend builds both the Node.js server and the Vite React-Admin frontend into a single distributable bundle. When deployed:
1. Express automatically hosts the React-Admin single-page application at `/` and `/admin`.
2. All API endpoints remain accessible under `/api/v1/*`.
3. WebSockets run on the same public origin without cross-origin configuration issues.

### Deployment Instructions:
1. **Push to GitHub:** Ensure your repository is pushed to your GitHub account (`https://github.com/Aman-Kumar-roy/pranova`).
2. **Create New Project in Railway:**
   - Log in to [Railway](https://railway.app/).
   - Click **"New Project"** -> **"Deploy from GitHub repo"** -> Select `pranova`.
3. **Add MySQL Database:**
   - In the same Railway project canvas, click **"Create"** -> **"Database"** -> **"Add MySQL"**.
   - Railway will provision a managed MySQL 8 instance.
4. **Connect Database to Web Service:**
   - In the web service settings under **Variables**, click **"Add Reference"** and select `DATABASE_URL` from the MySQL service.
   - PRANOVA's configuration automatically recognizes Railway's `DATABASE_URL` or `MYSQL_URL`.
5. **Configure Additional Environment Variables (Optional):**
   - `JWT_SECRET`: Any 32+ character secure random string.
   - `JWT_REFRESH_SECRET`: Any 32+ character secure random string.
   - `ADMIN_EMAIL`: (Defaults to `admin@pranova.com`).
   - `ADMIN_PASSWORD`: (Defaults to `Admin@123456`).
6. **Deploy:**
   - Railway automatically executes:
     - **Build Command:** `npm install && npm run build`
     - **Start Command:** `npx prisma db push --skip-generate && cross-env NODE_ENV=production npm start`
7. **Access Your Live Platform:**
   - Open your generated Railway domain (e.g. `https://pranova-production.up.railway.app`).
   - The React-Admin console loads instantly at the root URL.
   - Log in using your Super Admin credentials.

---

## Features & Modules

### 1. Central Clinical Administration
- **Patient Management:** Complete profile registry with blood group, allergies, emergency contacts, and linked clinical documents.
- **Care Manager Operations:** Dispatch field officers to emergency incidents, view active cases, and monitor caseload distribution.
- **Provider Registry:** Multi-type network directory covering Hospitals, Clinics, Diagnostic Labs, Pharmacies, and Ambulance fleets with GPS mapping.
- **Emergency Case Triage:** P1, P2, and P3 priority dispatching with live map visualization, automatic reference numbering (`PRN-2026-XXXX`), and immutable activity timelines.

### 2. Telemedicine & Appointments
- **Specialty Directory:** Cardiology, Pediatrics, General Medicine, Orthopedics, Dermatology, and more.
- **Doctor Catalog:** Bio, qualifications, consultation fees, experience, and availability slots.
- **Booking Flow:** Consultation scheduling with support for in-clinic visits and virtual video/audio tele-consultation rooms.

### 3. Pharmacy & Medicine Logistics
- **Medicine Catalog:** Prescription requirements, dosage forms (tablets, syrups, injections), manufacturers, and retail pricing.
- **Order Processing:** Prescription upload verification, delivery address recording, payment tracking, and status dispatch.

### 4. Diagnostic Tests & Laboratory Bookings
- **Test Catalog:** Pathology panels (CBC, Lipid profile, HbA1c, etc.) with preparation instructions and turnaround times.
- **Sample Collection:** Choice between home phlebotomist dispatch and physical clinic visits with lab report attachments.

### 5. Real-Time Telemetry & Emergency Alerting
- Bidirectional WebSocket communication powered by **Socket.IO**.
- When an emergency SOS is triggered, the server broadcasts an audio-visual emergency alert to all connected clinical operators with GPS coordinates and incident addresses.

---

## Client Operations & User Guide

A comprehensive, production-aligned user manual is available for platform administrators, healthcare coordinators, and dispatchers:
- **Online Markdown Guide:** [docs/USER_GUIDE.md](docs/USER_GUIDE.md) — Complete operational manual viewable directly in GitHub.
- **Executive PDF Manual:** [docs/PRANOVA_User_Guide.pdf](docs/PRANOVA_User_Guide.pdf) — Formatted clinical operations guide for distribution and offline review.

---

## Interactive API Documentation

When `ENABLE_SWAGGER=true` is set in `.env`:
- **Interactive OpenAPI Explorer:** `http://localhost:5000/api-docs`
- **Specification Source:** `swagger/swagger.json`
- **Standalone Viewer:** Open `swagger/index.html` directly in any web browser.

---

## Available Production NPM Scripts

| Command | Description |
| :--- | :--- |
| `npm install` | Installs dependencies and generates Prisma Client |
| `npm run build` | Compiles backend TypeScript and builds the Admin Web Vite bundle |
| `npm run build:server` | Compiles backend TypeScript to `dist/` |
| `npm run build:admin` | Installs dependencies and builds the React-Admin web console |
| `npm start` | Boots the compiled production server (`dist/server.js`) in `NODE_ENV=production` |
| `npm run prisma:push` | Synchronizes Prisma schema definitions with the MySQL database |
| `npm run seed` | Seeds baseline test records (doctors, medicines, tests, settings) |
| `npm run db:import` | Restores verified platform database records from backup |
| `npm run generate:swagger` | Re-generates OpenAPI 3.0 specification from code annotations |

---

## License

This project is licensed under the [MIT License](LICENSE).
