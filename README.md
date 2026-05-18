<div align="center">

<img src="https://img.shields.io/badge/Oracle-21c%20XE-F80000?style=for-the-badge&logo=oracle&logoColor=white"/>
<img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white"/>
<img src="https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white"/>
<img src="https://img.shields.io/badge/Ionic-3880FF?style=for-the-badge&logo=ionic&logoColor=white"/>
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white"/>

# Chapai
### Smart Campus Printing Management System

*A full-stack, three-tier enterprise print management platform built for NED University of Engineering and Technology*

---

</div>

## Overview

Chapai is an end-to-end campus printing management system that replaces manual print queues, cash-based transactions, and untracked document handling with a centralized, digitally audited, and hardware-aware platform.

The system connects students and faculty through a cross-platform mobile application, kiosk operators through a real-time web dashboard, and system administrators through a full control panel — all backed by an enterprise-grade Oracle 21c relational database with stored procedures, views, and triggers enforcing data integrity at the database layer.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Tier                    │
│                                                         │
│   Ionic Angular Mobile App      Angular Web Dashboard   │
│   (Students & Faculty)          (Operators & Admins)    │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API (JWT Bearer)
┌──────────────────────▼──────────────────────────────────┐
│                      Logic Tier                         │
│                                                         │
│              NestJS API — localhost:3000                │
│     Auth · Jobs · Transactions · Admin · Operator       │
│              Reports · Notifications                    │
└──────────────────────┬──────────────────────────────────┘
                       │ node-oracledb (Thin Mode)
┌──────────────────────▼──────────────────────────────────┐
│                       Data Tier                         │
│                                                         │
│         Oracle 21c XE — PrintAdmin Schema               │
│    19 Tables · 5 Views · 3 Stored Procedures · 1 Trigger│
└─────────────────────────────────────────────────────────┘
```

---

## Key Features

**For Students & Faculty (Mobile App)**
- PDF upload with automatic server-side page count extraction
- Real-time print cost estimator updating as settings change
- Collection slot scheduling with 2-hour pickup windows
- Faculty priority queue — faculty jobs processed before student jobs
- QR code generation for secure document collection
- Digital wallet with balance top-up and full transaction history
- Live job status tracking with countdown timers
- Push-style notifications for job lifecycle events

**For Operators (Dashboard)**
- Live print queue sorted by priority and submission time
- Split-panel job inspection with full metadata view
- Bin assignment with real-time capacity visualization
- QR token verification for secure document handover
- Recent handover lookup history cached locally

**For Administrators (Dashboard)**
- Global read-only queue across all kiosks
- User, operator, and kiosk management with full CRUD
- Bin topology management with nested capacity tracking
- Daily analytics reports with revenue and volume metrics
- Full audit log and access log viewer with filtering

**Database Layer**
- `SP_SUBMIT_JOB` — atomic job submission with balance check, pricing, and ledger update
- `SP_CONFIRM_HANDOVER` — atomic handover with bin capacity decrement and notification
- `SP_TOPUP_BALANCE` — row-locked balance top-up with audit trail
- `TRG_DELETE_USER_JOBS` — cascades user deletion through the associative bridge table
- 5 optimized views flattening normalized schema for API consumption

---

## Tech Stack

| Layer | Technology |
|---|---|
| Database | Oracle 21c Express Edition (XE) in Podman |
| Backend | NestJS (Node.js + TypeScript) |
| Mobile | Ionic Angular |
| Dashboard | Angular NgModules |
| DB Driver | node-oracledb (Thin Mode) |
| Auth | JWT (RS256) + bcrypt |
| PDF Processing | pdf-lib |

---

## Repository Structure

```
chapai/
├── backend/                  # NestJS REST API
│   ├── src/
│   │   ├── auth/             # Authentication & RBAC
│   │   ├── jobs/             # Print job lifecycle
│   │   ├── transactions/     # Wallet & ledger
│   │   ├── admin/            # Admin endpoints
│   │   ├── operator/         # Operator endpoints
│   │   ├── reports/          # Analytics
│   │   └── notifications/    # Notification system
│   └── src/environments/
│       └── environment.ts    # DB connection config
│
├── mobile/                   # Ionic Angular mobile app
│   └── src/app/
│       ├── jobs/             # Job list, submit, detail
│       ├── auth/             # Login, register, OTP
│       ├── profile/          # Wallet, transactions
│       └── notifications/    # Notification centre
│
├── dashboard/                # Angular web dashboard
│   └── src/app/
│       ├── operator/         # Queue, handover, bins
│       └── admin/            # Users, kiosks, reports, logs
│
└── database/
    └── schema_exported.sql   # Full Oracle schema dump
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Oracle Database 21c XE running (via Podman or native install)
- Ionic CLI: `npm install -g @ionic/cli`
- Angular CLI: `npm install -g @angular/cli`

### 1. Database Setup

Connect to your Oracle instance via SQL Developer using:

| Field | Value |
|---|---|
| Username | `PrintAdmin` |
| Hostname | `localhost` |
| Port | `1521` |
| SID | `XE` |

Run `database/schema_exported.sql` to initialize all tables, views, stored procedures, and triggers.

### 2. Backend

Configure your Oracle connection credentials in `backend/src/environments/environment.ts`:

```typescript
export const environment = {
  db: {
    user: 'PrintAdmin',
    password: 'your_password',
    connectString: 'localhost:1521/XE'
  },
  jwtSecret: 'your_jwt_secret'
};
```

```bash
cd backend
npm install
npm run start:dev
```

API runs at `http://localhost:3000`.

### 3. Dashboard

```bash
cd dashboard
npm install
ng serve
```

Opens at `http://localhost:4200`. Login as admin or operator.

### 4. Mobile App

```bash
cd mobile
npm install
ionic serve
```

To build an Android APK:

```bash
ionic build
npx cap add android
npx cap open android
```

Build and run from Android Studio.

---

## User Roles

| Role | Interface | Access |
|---|---|---|
| `admin` | Web Dashboard | Full system management, reports, logs |
| `operator` | Web Dashboard | Queue management, handover, bins |
| `student` | Mobile App | Submit jobs, track status, collect |
| `faculty` | Mobile App | Same as student with priority queue |

---

## Database Schema

The schema implements a normalized ISA (Is-A) user hierarchy:

```
APP_USER
├── ADMIN
├── OPERATOR  ──────────────► KIOSK ──► COLLECTION_BINS
└── NORMAL_USER
    ├── STUDENT
    └── FACULTY

PRINT_JOB ◄──── SUBMITS ────► APP_USER
    │
    ├── HAS_STATUS ──► JOB_STATUS
    ├── PLACED_IN  ──► COLLECTION_BINS
    ├── GOVERNED_BY ──► PRICE_RATE
    └── GENERATES  ──► FINANCIAL_TRANSACTION
```

All 19 tables are verified to be in Boyce-Codd Normal Form (BCNF).

---

## API Reference

The complete API endpoint reference is available as a Postman collection in the repository. Key module endpoints:

| Module | Base Route |
|---|---|
| Auth | `/auth` |
| Jobs | `/jobs` |
| Transactions | `/transactions` |
| Admin | `/admin` |
| Operator | `/operator` |
| Reports | `/reports` |
| Notifications | `/notifications` |

---

## Academic Context

> This project was developed as a Culminating Experience Project (CEP) for **CS-222 Database Management Systems**, Spring 2026, at NED University of Engineering and Technology, Karachi.

| Member | Roll Number | Contributions |
|---|---|---|
| Muhammad Ahmed Qazi | CS-24045 | Database schema, PL/SQL, NestJS backend, Angular dashboard |
| Mujtaba Jawaid Rao | CS-24047 | Ionic mobile app, Angular dashboard, design system |
| Ahsan Atif Rajput | CS-24044 | Testing, QA, Postman collection, project report |

---

## License

This repository is for academic purposes. All rights reserved by the authors.