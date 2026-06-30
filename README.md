# SARN Technologies — Workflow Management Platform

> A cloud-native, role-based platform for Safety Data Sheet (SDS) verification, Data Queue (DQ) processing, and Batch document operations — with built-in messaging, video calls, AI translation, and full audit trail export.

**Live deployment:**
- Frontend — Firebase Hosting
- Backend — Google Cloud Run (asia-south1)

---

## Overview

SARN Technologies replaces fragmented spreadsheet-driven document workflows with a single, auditable, real-time system. Every record uploaded into SARN moves through a structured, stage-gated pipeline — with every action attributed to a named user and timestamped. Administrators get live visibility, users get a clear task queue, and billing teams get an instant, accurate export.

---

## Features

### Three Workflow Modules

| Module | Stages |
|---|---|
| **SDS** (Safety Data Sheets) | Search → Supersede → Transcription → Billing |
| **DQ** (Data Queue) | Transcription → Billing |
| **Batch** | Verification → Billing |

All three share the same infrastructure, role system, reporting engine, and communication layer.

### Core Capabilities

| Feature | Description |
|---|---|
| **Upload & Duplicate Detection** | Admin uploads Excel; records imported in bulk with automatic duplicate flagging |
| **Assignment Engine** | Admin assigns records to users per sheet; real-time assigned/in-progress/completed counts |
| **Stage-Gated Workflow** | Users complete structured forms per stage; system auto-advances records |
| **Audit Trail Export** | One-click Excel export — every field, who completed each stage, date completed |
| **Billing Module** | Records auto-flagged billing-ready on final stage; admin marks done with timestamp |
| **Reports & Analytics** | Per-user productivity, period filtering, all-time vs period breakdown, company-wide view |
| **SDS Scanner** | Upload PDFs; AI-assisted field extraction reduces manual transcription |
| **Team Chat + DMs** | Built-in messaging with unread badge and MS Teams-style sliding toast notifications |
| **Google Meet** | Start or join video calls directly from the platform |
| **AI Translation** | GROQ-powered chatbot for SDS content translation and PDF Q&A |
| **Attendance Tracking** | Login/logout timestamps per user; Super Admin attendance dashboard |
| **Database View** | Full record database per sheet with search, filter, status, and export |

### Role-Based Access

| Role | Capabilities |
|---|---|
| **Super Admin** | Full system — all users, all processes, attendance, company-wide reports, notifications |
| **Admin** | Upload, assign, workflow monitor, billing, reports, database export — per process |
| **User** | Own assigned tasks, completed history, profile, messaging |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + React Router v6 |
| Frontend Hosting | Firebase Hosting (global CDN) |
| Backend | Node.js + Express.js |
| Backend Hosting | Google Cloud Run (serverless, auto-scales) |
| Database | Google Firestore (real-time NoSQL) |
| File Storage | Google Cloud Storage |
| Authentication | JWT — role-encoded claims, 12-hour expiry |
| Password Security | bcryptjs — salt factor 12 |
| Excel I/O | @e965/xlsx (CVE-patched SheetJS fork) |
| PDF Processing | pdfkit (generate) + pdfjs-dist + pdf-parse (extract) |
| AI | GROQ API — LLaMA 3.3 70B |
| Video Calls | Google Calendar API v3 + Google Meet |
| Email | Nodemailer (Gmail SMTP) |
| Scheduling | node-cron (background notification jobs) |

---

## Security

| Layer | Measure |
|---|---|
| Authentication | JWT required on all protected endpoints via `verifyToken` middleware |
| Passwords | bcrypt hashed (12 salt rounds) — no plaintext storage; lazy migration on login |
| CORS | Restricted to specific Firebase Hosting domains only |
| Rate Limiting | `express-rate-limit` — 20 attempts / 15 min on `/auth/login` and `/auth/reset` |
| File Uploads | Server-side mimetype + extension validation — only `.xlsx`, `.xls`, `.pdf` accepted |
| Error Handling | `err.message` never sent to client — only generic messages returned; real errors logged server-side |
| Drive Query | Input stripped to alphanumeric + safe characters only before Drive API query |
| Credentials | All API keys in Cloud Run environment variables — never in source code or committed files |
| Excel CVE | `@e965/xlsx` replaces abandoned `xlsx@0.18.5` (CVE-2023-30533) |
| Chatbot | Input sanitised for prompt injection; system prompt enforces hard rules |

---

## Project Structure

```
SARN Final/
├── frontend/                        # React + Vite SPA
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Admin/               # SDS admin pages (Dashboard, Upload, Workflow, Billing, Reports, Scanner, Database)
│   │   │   ├── AdminDQ/             # DQ admin pages
│   │   │   ├── AdminBatch/          # Batch admin pages (includes Database)
│   │   │   ├── User/                # SDS user pages + workflow forms
│   │   │   ├── UserDQ/              # DQ user pages
│   │   │   ├── UserBatch/           # Batch user pages
│   │   │   ├── SuperAdmin/          # Super admin pages
│   │   │   ├── Chat/                # Unified messaging hub (ChatHub, TeamChat, DirectChat)
│   │   │   ├── CallsMeetings/       # Google Meet integration
│   │   │   └── Auth/                # Login, ResetPassword
│   │   ├── components/
│   │   │   ├── AdminSidebar.jsx     # Role-aware sidebar with unread badge
│   │   │   ├── UserSidebar.jsx
│   │   │   ├── SuperAdminSidebar.jsx
│   │   │   ├── ChatBot.jsx          # AI chatbot with PDF Q&A and translation
│   │   │   └── CallNotificationOverlay.jsx
│   │   ├── context/
│   │   │   └── ChatContext.jsx      # Global unread count + toast notification provider
│   │   ├── layouts/                 # AdminLayout, UserLayout, SuperAdminLayout
│   │   └── config/
│   │       └── apiClient.js         # Axios instance with JWT interceptor
│   └── public/
│
├── backend/
│   ├── server.js                    # All API routes and business logic
│   └── package.json
│
├── sds-scanner/                     # Python Flask AI microservice
│   ├── app.py                       # /scan endpoint
│   ├── utils/
│   │   ├── pdf_text.py
│   │   ├── pdf_images.py
│   │   ├── pictogram.py             # GHS pictogram detection
│   │   └── groq_llm.py
│   └── requirements.txt
│
├── firebase.json
├── .gitignore
└── .gcloudignore
```

---

## Getting Started

### Prerequisites
- Node.js v18+
- Python 3.9+ (for SDS Scanner)
- Firebase CLI: `npm install -g firebase-tools`
- Google Cloud SDK: `gcloud` CLI

### Install Dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install

# SDS Scanner
cd sds-scanner && pip install -r requirements.txt
```

### Environment Variables

**Backend — set as Cloud Run environment variables (never in code):**

```
JWT_SECRET=
GROQ_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
EMAIL_USER=
EMAIL_PASS=
```

For local development, create `backend/.env` with the above values.

### Run Locally

```bash
# Backend
cd backend && node server.js

# Frontend
cd frontend && npm run dev

# SDS Scanner (optional)
cd sds-scanner && python app.py
```

---

## Deployment

### Frontend → Firebase Hosting

```bash
cd frontend
npm run build
firebase deploy --only hosting
```

### Backend → Google Cloud Run

```bash
cd backend
gcloud run deploy sarn-backend \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

---

## SDS Workflow Detail

```
Upload (Admin)  →  Records created in Firestore
      ↓
Assign (Admin)  →  User receives task in sidebar
      ↓
Stage 1: Search        (web search, comments, flags)
      ↓
Stage 2: Supersede     (new repo number, optional PDF upload)
      ↓
Stage 3: Transcription (data entry, verification date)
      ↓
Billing Ready (auto-flagged by system)
      ↓
Billing Complete (Admin marks done — ID + timestamp captured)
      ↓
COMPLETED — full audit trail in Excel export
```

---

## Excel Export Columns (SDS)

The SDS database export includes every field plus completion audit data:

| Group | Columns |
|---|---|
| Record | ReferenceID, WorkflowStatus, CurrentStage, AssignedTo |
| Common | BusinessEntity, RepositoryNumber, ChemicalProduct, ManufacturerName, RevisionDate, VerificationDate |
| Search | CompletedBy, CompletedAt, Websearch1/2, Comments1/2, Remarks, StartDate, EndDate, NotPublishable |
| Supersede | CompletedBy, CompletedAt, NewRepositoryNumber, Date, VerifiedDate, Comments1/2, Remarks |
| Transcription | CompletedBy, CompletedAt, VerifiedDate, Comments1/2, Remarks |
| Billing | CompletedBy, CompletedAt, Status |

---

## License

Private — SARN Technologies. All rights reserved.
