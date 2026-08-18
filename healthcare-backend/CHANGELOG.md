# CHANGELOG — Phase 2: Full Backend Integration

This completes the work described in `Foundation-Fix-Integration-Report.md`
(Phase 1: Auth foundation fix). Phase 2 merges every remaining module into
one FastAPI application, one database, one auth system.

## Summary

- 4 previously-independent apps (Landing/Auth, OCR+NLP, Dashboard, Medical
  History/Profile) are now **1 unified FastAPI app** (`backend/app`),
  started with `uvicorn app.main:app --reload`, verified to actually boot
  and serve `/`, `/docs`, `/openapi.json`, and every API route below.
- **1 shared SQLite/Postgres database** (`DATABASE_URL` in `.env`) — every
  model shares the same `Base`/engine/session (`app/database/`).
- **1 authentication system** — all new modules depend on
  `app.api.deps.get_current_user`; every record created by a module is
  tied to the authenticated `users.id`.
- **1 OCR pipeline, 1 NLP pipeline** — the duplicate copy that lived in
  `medicalHistory_and_Profile_backend` was deleted; `medical_ai_api`'s
  services are now the single canonical implementation, mounted as a
  router (`/api/v1/ocr`) instead of a standalone app.
- **All fake/placeholder/in-memory data removed** — Dashboard's seeded
  fake `User`/`Prescription`/`Notification` models and the Medical
  History/Profile module's in-memory stub dicts are gone, replaced by
  real SQLAlchemy models and queries scoped to the authenticated user.
- Verified end-to-end with a real `TestClient` run (register → login →
  set language → profile CRUD → medical history CRUD → OCR upload → NLP
  entity extraction → simplification → translation → dashboard stats →
  error handling → token revocation) — all passing — and a real
  `uvicorn app.main:app` boot test hitting `/`, `/health/`, `/docs`,
  `/openapi.json`, `/api/v1/languages`.

## New files

**Models** (`backend/app/models/`)
- `patient_profile.py` — `PatientProfile` (1:1 with User)
- `medical_history.py` — `MedicalHistoryEntry`
- `ocr_document.py` — `OCRDocument`
- `medical_report.py` — `MedicalReport` (OCR + NLP result, replaces
  Dashboard's fake `Prescription` rows)
- `simplification.py` — `Simplification`
- `translation.py` — `Translation`
- `notification.py` — `Notification`
- `activity_log.py` — `ActivityLog` (user-facing activity feed)
- `audit_log.py` — `AuditLog` (security/compliance event log)

**Services** (`backend/app/services/`)
- `ocr_service.py`, `nlp_service.py`, `pipeline.py` — moved in from
  `medical_ai_api`, import paths repointed to the unified `app.core.*`
  namespace; the duplicate copy under `medicalHistory_and_Profile_backend`
  was deleted.
- `report_pipeline_service.py` — **new**: orchestrates
  OCR → NLP → Simplification → Translation → DB storage → API response,
  associates every stage with the authenticated user.
- `simplification_service.py` — **new**: Medical Text Simplification
  (medical-jargon → plain-language term substitution + a templated
  "what this means for you" summary built from extracted entities).
- `translation_service.py` — **new**: Multilingual Translation for
  en/ta/kn/te/hi. Protects dosages, units, dates, and medicine names from
  translation; phrase-dictionary substitution for the rest.
- `profile_service.py` — **new**: Patient Profile + Medical History CRUD.
- `dashboard_service.py` — **new**: real stats/activity queries.
- `activity_service.py` — **new**: shared `log_activity()` / `log_audit()`
  helpers used by auth, profile, medical history, and OCR.

**Schemas** (`backend/app/schemas/`)
- `reports.py`, `profile.py`, `dashboard.py` — new Pydantic models for
  the new endpoints. `ocr.py` — moved in from `medical_ai_api`.

**Routers** (`backend/app/api/v1/`)
- `ocr.py` — `POST /ocr/extract`, `GET /ocr`, `GET /ocr/{id}`,
  `DELETE /ocr/{id}`, `GET /ocr/{id}/simplified`,
  `POST /ocr/{id}/translate`
- `profile.py` — `GET/PUT /profile`
- `medical_history.py` — full CRUD at `/medical-history`
- `dashboard.py` — `GET /dashboard`, notifications endpoints
- `languages.py` — `GET /languages`
- `simplify_translate.py` — standalone `POST /simplify`,
  `POST /translate` (operate on a stored report or raw ad-hoc text)

## Modified files

- `app/main.py` — now mounts every router under one app (auth, profile,
  medical-history, ocr, simplify/translate, languages, dashboard, plus
  the existing health/contact routers).
- `app/core/config.py` — `Settings` extended to absorb every config
  surface previously scattered across 4 separate `config.py`/`.env`
  files (OCR, NLP, upload, storage-path settings all added).
- `app/core/logging_config.py` — added rotating file handler; this is
  now the single logging entrypoint every module imports (`get_logger`),
  replacing `medical_ai_api`'s separate logger module.
- `app/core/exception_handlers.py` — added a handler for the app's own
  `MedicalAIError` hierarchy (OCR/NLP/upload errors) so they return
  their correct status codes (400/413/415/422) instead of falling
  through to a generic 500.
- `app/database/session.py` — `init_db()` now imports and registers
  every new model so `Base.metadata.create_all()` creates all 11 tables.
- `app/api/v1/auth.py` — added `log_audit()` calls on register/login
  events (Phase 14 logging requirement).
- `app/models/patient_profile.py`, `medical_report.py`,
  `simplification.py` — fixed a real SQLAlchemy bug found during
  testing: `relationship(..., backref="x", uselist=False)` does **not**
  make the backref scalar — `uselist=False` must be passed to
  `backref()` itself. Fixed via `backref=backref("x", uselist=False)`.
- `requirements.txt`, `.env.example` — consolidated from 4 separate
  copies into one; documents which packages are installed vs. which
  are commented out and why (see "Known limitations" below).

## Removed

- `Dashboard_Backend_API/` (entire standalone app — fake seeded models,
  own SQLite DB)
- `medicalHistory_and_Profile_backend/` (entire standalone app,
  including its duplicate copy of the OCR/NLP services)
- `backend/medical_ai_api/` (standalone app; its services were moved
  into `backend/app` and it was deleted once nothing else referenced it)
- Stray `vite.config.js` (unrelated frontend leftover in the backend
  repo root)

## Database changes

11 tables now created by `init_db()` against the single shared
`DATABASE_URL`: `users`, `token_blocklist`, `patient_profiles`,
`medical_history_entries`, `ocr_documents`, `medical_reports`,
`simplifications`, `translations`, `notifications`, `activity_logs`,
`audit_logs`. All new tables carry a `user_id` foreign key to `users.id`.
`LanguagePreferences` was intentionally **not** created as a separate
table — `preferred_language` already lives on `users` (Phase 1), which
is sufficient and avoids an unnecessary join.

## APIs added

| Method | Path |
|---|---|
| POST | `/api/v1/ocr/extract` |
| GET | `/api/v1/ocr` |
| GET | `/api/v1/ocr/{id}` |
| DELETE | `/api/v1/ocr/{id}` |
| GET | `/api/v1/ocr/{id}/simplified` |
| POST | `/api/v1/ocr/{id}/translate` |
| GET / PUT | `/api/v1/profile` |
| GET / POST | `/api/v1/medical-history` |
| PUT / DELETE | `/api/v1/medical-history/{id}` |
| GET | `/api/v1/dashboard` |
| GET | `/api/v1/dashboard/notifications` |
| PUT | `/api/v1/dashboard/notifications/{id}/read` |
| GET | `/api/v1/languages` |
| POST | `/api/v1/simplify` |
| POST | `/api/v1/translate` |

(plus the already-fixed `/api/v1/auth/*` routes from Phase 1, including
`PUT /api/v1/auth/profile/language`.)

## Known limitations / recommendations for a production deployment

This sandbox has no internet access to model-weight servers, so two
components run in a documented, clearly-logged fallback mode rather
than downloading multi-hundred-MB models:

1. **OCR (PaddleOCR)** — not installed here. `ocr_service.py` detects
   this and falls back to a stub engine (`OCR_ALLOW_STUB_ENGINE=True`)
   that exercises the full pipeline but returns placeholder text with
   confidence `0.01`, so `needs_review` correctly trips. **For
   production**: `pip install paddlepaddle paddleocr` (commented out in
   `requirements.txt`) in an environment with internet access, and set
   `OCR_ALLOW_STUB_ENGINE=False`.
2. **NLP (BioClinicalBERT)** — `transformers`/`torch` not installed.
   `nlp_service.py` already had a graceful regex/keyword-only fallback
   built in (this predates my changes); it was verified working and
   correctly extracts doctor name, hospital, disease, symptoms, and
   medicines with dosage/frequency in testing. **For production**:
   `pip install torch transformers` (commented out in
   `requirements.txt`) — no code changes needed, it upgrades itself.
3. **Translation** is a curated phrase-dictionary substitution covering
   the Simplification module's templated output and common
   prescription vocabulary for en/ta/kn/te/hi, with dosages/units/dates/
   medicine names protected from translation. It is not a full neural
   MT engine. `translation_service.py`'s docstring explains the intended
   swap-in point (`TranslationService.translate`) for a production
   engine (e.g. IndicTrans2 or a cloud Translation API) without any
   router or DB changes.

Everything else — auth, patient profile, medical history, OCR upload
persistence, NLP entity extraction, simplification, translation
caching, dashboard stats, notifications, activity/audit logging — runs
for real, with no stubs, against the shared database.
