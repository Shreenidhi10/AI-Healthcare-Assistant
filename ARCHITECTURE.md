# FRONTEND ARCHITECTURE

## App Flow

Splash
↓
Login / Register
↓
Home
↓
Upload Prescription
↓
OCR Preview
↓
Results
  ├─ Original
  ├─ Simplified
  ├─ Translation
  └─ Readability
↓
History
↓
Profile

## Team Ownership

- Amrutha → Authentication
- Hyndavi → Home + Upload + OCR Preview
- Santosh → Results (Simplify, Translate, Readability)
- Yasaswini → History + Prescription Details
- Team Lead → Routing, Theme, Shared Components, API Integration

## Folder Structure

src/
├── assets
├── components
├── constants
├── contexts
├── data
├── hooks
├── lib
├── pages
├── routes
├── services
├── styles
└── utils

## Shared Components

- Button
- Input
- Card
- Badge
- Tabs
- Select
- Alert
- Loader
- BottomNav
- PrescriptionCard
- ResultCard

## Theme

Background: #FAF8F2
Primary: #2F6F5E
Accent: #F59E0B

Fonts:
- Display: Fraunces
- Body: Inter

Icons:
- lucide-react only

Rules:
- Use shadcn/ui components.
- Never hardcode colors.
- Use CSS variables and Tailwind semantic classes.

## API Contract

POST /auth/login
POST /auth/register
GET  /auth/me

POST /process

GET    /prescriptions
GET    /prescriptions/:id
DELETE /prescriptions/:id

GET /profile
PUT /profile

## Git Workflow

main
└── frontend
    ├── feature/auth
    ├── feature/home
    ├── feature/upload
    ├── feature/results
    └── feature/history

Open PRs into frontend only.
