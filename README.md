# SARN — Full-Stack Reference Management System

A full-stack web application for managing Safety Data Sheet (SDS) references through multi-stage workflows, with role-based access for Super Admin, Admin, and Users.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + React Router v6 |
| Backend | Node.js + Express.js |
| Database | Firebase Firestore |
| Storage | Firebase Storage |
| Auth | Firebase Authentication |
| PDF Generation | PDFKit |
| Excel Parsing | SheetJS (xlsx) |

---

## Features

- **Role-Based Access Control** — Super Admin, Admin, and User roles with protected routes
- **Excel Upload** — Bulk upload references via Excel files
- **SDS Workflow** — 4-stage pipeline: Search → Supersede → Transcription → Billing
- **Batch Workflow** — Batch processing of SDS documents with assignment and reporting
- **DQ (Data Quality) Workflow** — Data quality review, processing, and billing pipeline
- **Reference Database** — Browse, filter, and manage all uploaded references
- **User Management** — Admins can create users and assign work stages
- **Attendance Tracking** — Super Admin attendance management
- **PDF Report Generation** — Generate billing and completion reports

---

## Project Structure

```
SARN Final/
├── frontend/                  # React + Vite app
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Auth/          # Login, ResetPassword
│   │   │   ├── Admin/         # Dashboard, Upload, References, Workflow, Assign, Users, etc.
│   │   │   ├── AdminBatch/    # Batch workflow pages (Assign, Upload, Dashboard, Reports)
│   │   │   ├── AdminDQ/       # DQ workflow pages (Dashboard, Assign, Upload, Billing, etc.)
│   │   │   ├── SuperAdmin/    # Super admin pages (Dashboard, CreateUser, UserList, Attendance)
│   │   │   └── User/          # User-facing pages (Dashboard, AssignedWork, Forms, etc.)
│   │   ├── components/        # Shared components
│   │   ├── layouts/           # Layout wrappers
│   │   ├── api/               # API helper functions
│   │   ├── config/            # App config
│   │   ├── App.jsx            # Routes + Protected Components
│   │   └── main.jsx
│   ├── package.json
│   └── index.html
│
├── backend/                   # Express.js server
│   ├── server.js              # Main Express server
│   ├── functions/             # Firebase Cloud Functions
│   ├── firestore.rules        # Firestore security rules
│   ├── firestore.indexes.json # Firestore indexes
│   ├── storage.rules          # Storage security rules
│   └── package.json
│
├── firebase.json              # Firebase project config
├── .firebaserc                # Firebase project alias
└── .gitignore
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- Firebase CLI: `npm install -g firebase-tools`
- A Firebase project (or use the emulator for local dev)

### 1. Clone the Repository

```bash
git clone https://github.com/samrudhrao13/SARN-Tech.git
cd SARN-Tech
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

### 4. Configure Firebase

Set up your Firebase credentials:

```bash
# Set the path to your Firebase service account key
export GOOGLE_APPLICATION_CREDENTIALS="path/to/your-service-account.json"
```

Or for local development with the Firebase Emulator:

```bash
cd backend
npm run emulate
```

This starts local emulators for:
- Firestore at `127.0.0.1:8080`
- Auth at `127.0.0.1:9099`
- Storage at `127.0.0.1:9199`
- Emulator UI at `http://localhost:4000`

### 5. Start the Backend

```bash
cd backend
npm start
```

Backend runs at `http://localhost:4002`

### 6. Start the Frontend

```bash
cd frontend
npm run dev
```

Frontend runs at `http://localhost:5173`

---

## API Endpoints

### References
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload-excel` | Upload Excel file with references |
| GET | `/references` | List references (query: `company`, `sheet`) |
| GET | `/references/:company/:sheet/:refId` | Get single reference |

### SDS Workflow
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/workflow/search` | Submit Search stage |
| POST | `/workflow/supersede` | Submit Supersede stage |
| POST | `/workflow/transcription` | Submit Transcription stage |
| POST | `/workflow/billing` | Submit Billing stage |

### Assignments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/assign` | Assign users to workflow stages |
| GET | `/assigned/:email` | Get assignments for a user |

---

## User Roles

| Role | Access |
|------|--------|
| **Super Admin** | Full system access — create users, manage attendance, view all workflows |
| **Admin** | Upload references, assign work, monitor all workflow stages, generate reports |
| **User** | View and complete assigned workflow tasks (Search, Supersede, Transcription, Billing) |

---

## Workflows

### SDS Workflow
Manages Safety Data Sheet processing through four sequential stages:
1. **Search** — Locate SDS documents
2. **Supersede** — Check for newer/superseding versions
3. **Transcription** — Data entry from source documents
4. **Billing** — Generate billing records

### Batch Workflow
Handles bulk SDS processing with batch assignment, tracking, and reporting.

### DQ (Data Quality) Workflow
Quality review pipeline covering data validation, processing, and sign-off with billing integration.

---

## Environment Variables

Create a `.env` file in the `backend/` directory (never commit this file):

```env
GOOGLE_APPLICATION_CREDENTIALS=./path-to-service-account.json
PORT=4002
```

---

## License

This project is proprietary. All rights reserved.
