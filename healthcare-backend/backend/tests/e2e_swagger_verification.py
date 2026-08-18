from __future__ import annotations

import io
import sqlite3
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient
from PIL import Image

from app.database.session import init_db
from app.main import app
from app.models.notification import Notification
from app.database.session import SessionLocal


@dataclass
class Check:
    name: str
    passed: bool
    status_code: int | None = None
    detail: str = ""
    elapsed_ms: float = 0.0


@dataclass
class Report:
    checks: list[Check] = field(default_factory=list)
    bugs: list[str] = field(default_factory=list)
    fixes_needed: list[str] = field(default_factory=list)
    openapi_operations: list[str] = field(default_factory=list)
    db_counts: dict[str, int] = field(default_factory=dict)

    def add(self, name: str, response=None, expected: set[int] | None = None, detail: str = "", elapsed_ms: float = 0.0):
        status_code = getattr(response, "status_code", None)
        passed = status_code in expected if expected is not None else True
        body = ""
        if response is not None and not passed:
            try:
                body = str(response.json())[:500]
            except Exception:
                body = response.text[:500]
        self.checks.append(Check(name, passed, status_code, detail or body, elapsed_ms))
        return response


def timed(call):
    start = time.perf_counter()
    response = call()
    return response, (time.perf_counter() - start) * 1000


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def make_png_bytes() -> bytes:
    image = Image.new("RGB", (220, 80), "white")
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return buf.getvalue()


def assert_keys(report: Report, name: str, data: dict[str, Any], keys: set[str]):
    missing = sorted(keys - set(data))
    report.checks.append(Check(name, not missing, detail=f"Missing keys: {missing}" if missing else ""))


def seed_notification(user_id: str) -> str:
    db = SessionLocal()
    try:
        notification = Notification(user_id=user_id, message="E2E verification notification")
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return str(notification.id)
    finally:
        db.close()


def collect_db_counts() -> dict[str, int]:
    db_path = Path("health_explained.db")
    tables = [
        "users",
        "patient_profiles",
        "medical_history_entries",
        "ocr_documents",
        "medical_reports",
        "simplifications",
        "translations",
        "notifications",
        "activity_logs",
        "audit_logs",
        "token_blocklist",
    ]
    counts: dict[str, int] = {}
    with sqlite3.connect(db_path) as con:
        for table in tables:
            try:
                counts[table] = con.execute(f"select count(*) from {table}").fetchone()[0]
            except sqlite3.Error:
                counts[table] = -1
    return counts


def run() -> Report:
    init_db()
    report = Report()
    unique = uuid.uuid4().hex[:10]
    email = f"e2e.{unique}@example.com"
    phone = f"+9198{str(int(unique, 16))[-8:]}"
    password = "StrongPass1!"
    new_password = "NewStrongPass2!"

    with TestClient(app) as client:
        openapi = client.get("/openapi.json").json()
        for path, methods in openapi["paths"].items():
            for method in methods:
                if method in {"get", "post", "put", "delete", "patch"}:
                    report.openapi_operations.append(f"{method.upper()} {path}")

        for path in ["/", "/docs", "/openapi.json", "/health/", "/contact/", "/api/v1/languages"]:
            response, elapsed = timed(lambda p=path: client.get(p))
            expected = {200} if path != "/docs" else {200}
            report.add(f"reachable GET {path}", response, expected, elapsed_ms=elapsed)

        valid_contact = {"name": "Manjunath", "email": "patient@example.com", "message": "Please contact me about my report."}
        response, elapsed = timed(lambda: client.post("/contact/", json=valid_contact))
        report.add("valid contact submission", response, {200}, elapsed_ms=elapsed)
        response, elapsed = timed(lambda: client.post("/contact/", json={**valid_contact, "name": "Bad123"}))
        report.add("invalid contact name rejected", response, {400}, elapsed_ms=elapsed)
        response, elapsed = timed(lambda: client.post("/contact/", json={**valid_contact, "email": "bad"}))
        report.add("invalid contact email rejected", response, {422}, elapsed_ms=elapsed)

        protected_gets = [
            "/api/v1/auth/profile",
            "/api/v1/profile",
            "/api/v1/medical-history",
            "/api/v1/ocr",
            "/api/v1/dashboard",
            "/api/v1/dashboard/notifications",
        ]
        for path in protected_gets:
            response, elapsed = timed(lambda p=path: client.get(p))
            report.add(f"unauthorized rejected GET {path}", response, {401}, elapsed_ms=elapsed)

        registration = {
            "full_name": "E2E Patient",
            "email": email,
            "phone_number": phone,
            "password": password,
            "role": "patient",
        }
        response, elapsed = timed(lambda: client.post("/api/v1/auth/register", json=registration))
        report.add("register valid user", response, {201}, elapsed_ms=elapsed)
        user = response.json()
        user_id = user.get("id")
        assert_keys(report, "register response schema", user, {"id", "full_name", "email", "phone_number", "role", "is_active", "preferred_language", "created_at"})

        response, elapsed = timed(lambda: client.post("/api/v1/auth/register", json={**registration, "email": f"weak.{unique}@example.com", "password": "weak"}))
        report.add("weak password rejected", response, {422}, elapsed_ms=elapsed)
        response, elapsed = timed(lambda: client.post("/api/v1/auth/register", json=registration))
        report.add("duplicate registration rejected", response, {409}, elapsed_ms=elapsed)

        response, elapsed = timed(lambda: client.post("/api/v1/auth/login-json", json={"email": email, "password": password}))
        report.add("login-json valid credentials", response, {200}, elapsed_ms=elapsed)
        tokens = response.json()
        if "access_token" not in tokens:
            return report
        access = tokens["access_token"]
        refresh = tokens["refresh_token"]
        headers = auth_header(access)
        assert_keys(report, "token response schema", tokens, {"access_token", "refresh_token", "token_type"})

        response, elapsed = timed(lambda: client.post("/api/v1/auth/login-json", json={"email": email, "password": "WrongPass1!"}))
        report.add("login-json bad password rejected", response, {401}, elapsed_ms=elapsed)
        response, elapsed = timed(lambda: client.post("/api/v1/auth/login", data={"username": email, "password": password}))
        report.add("oauth2 swagger login valid", response, {200}, elapsed_ms=elapsed)
        response, elapsed = timed(lambda: client.post("/api/v1/auth/refresh", json={"refresh_token": refresh}))
        report.add("refresh token valid", response, {200}, elapsed_ms=elapsed)
        refreshed = response.json()

        response, elapsed = timed(lambda: client.get("/api/v1/auth/profile", headers=headers))
        report.add("auth profile valid token", response, {200}, elapsed_ms=elapsed)
        response, elapsed = timed(lambda: client.put("/api/v1/auth/profile/language", json={"preferred_language": "kn"}, headers=headers))
        report.add("language preference valid", response, {200}, elapsed_ms=elapsed)
        response, elapsed = timed(lambda: client.put("/api/v1/auth/profile/language", json={"preferred_language": "xx"}, headers=headers))
        report.add("language preference invalid rejected", response, {422}, elapsed_ms=elapsed)

        profile_payload = {
            "age": 35,
            "gender": "Male",
            "blood_group": "O+",
            "phone": phone,
            "address": "Bengaluru",
            "allergies": ["penicillin"],
            "chronic_conditions": ["diabetes"],
        }
        response, elapsed = timed(lambda: client.get("/api/v1/profile", headers=headers))
        report.add("get patient profile creates/read DB row", response, {200}, elapsed_ms=elapsed)
        response, elapsed = timed(lambda: client.put("/api/v1/profile", json=profile_payload, headers=headers))
        report.add("update patient profile valid", response, {200}, elapsed_ms=elapsed)
        response, elapsed = timed(lambda: client.put("/api/v1/profile", json={**profile_payload, "age": 151}, headers=headers))
        report.add("profile age edge rejected", response, {422}, elapsed_ms=elapsed)
        response, elapsed = timed(lambda: client.put("/api/v1/profile", json={**profile_payload, "blood_group": "Z+"}, headers=headers))
        report.add("profile invalid blood group rejected", response, {422}, elapsed_ms=elapsed)

        history_payload = {"condition": "Hypertension", "diagnosed_date": "2023-01-05", "status": "active", "notes": "Controlled"}
        response, elapsed = timed(lambda: client.post("/api/v1/medical-history", json=history_payload, headers=headers))
        report.add("create medical history valid", response, {201}, elapsed_ms=elapsed)
        entry_id = response.json().get("id")
        response, elapsed = timed(lambda: client.get("/api/v1/medical-history", headers=headers))
        report.add("list medical history", response, {200}, elapsed_ms=elapsed)
        response, elapsed = timed(lambda: client.put(f"/api/v1/medical-history/{entry_id}", json={"status": "resolved", "notes": "Resolved"}, headers=headers))
        report.add("update medical history valid", response, {200}, elapsed_ms=elapsed)
        response, elapsed = timed(lambda: client.post("/api/v1/medical-history", json={**history_payload, "status": "unknown"}, headers=headers))
        report.add("medical history invalid status rejected", response, {422}, elapsed_ms=elapsed)
        response, elapsed = timed(lambda: client.put(f"/api/v1/medical-history/{uuid.uuid4()}", json={"status": "active"}, headers=headers))
        report.add("medical history missing id rejected", response, {404}, elapsed_ms=elapsed)
        response, elapsed = timed(lambda: client.put("/api/v1/medical-history/not-a-real-id", json={"status": "active"}, headers=headers))
        report.add("medical history malformed id rejected", response, {422}, elapsed_ms=elapsed)

        png = make_png_bytes()
        response, elapsed = timed(lambda: client.post("/api/v1/ocr/extract", files={"file": ("report.png", png, "image/png")}, headers=headers))
        report.add("ocr upload png supported", response, {201}, elapsed_ms=elapsed)
        report_data = response.json() if response.status_code == 201 else {}
        report_id = report_data.get("id")
        assert_keys(report, "ocr report response schema", report_data, {"id", "document_id", "ocr_text", "ocr_confidence", "language", "entities", "status", "needs_review", "processing_time", "created_at"})
        response, elapsed = timed(lambda: client.post("/api/v1/ocr/extract", files={"file": ("report.txt", b"hello", "text/plain")}, headers=headers))
        report.add("ocr unsupported file type rejected", response, {415}, elapsed_ms=elapsed)
        response, elapsed = timed(lambda: client.post("/api/v1/ocr/extract", files={"file": ("empty.png", b"", "image/png")}, headers=headers))
        report.add("ocr empty file rejected", response, {400}, elapsed_ms=elapsed)

        if report_id:
            response, elapsed = timed(lambda: client.get("/api/v1/ocr", headers=headers))
            report.add("list OCR reports", response, {200}, elapsed_ms=elapsed)
            response, elapsed = timed(lambda: client.get(f"/api/v1/ocr/{report_id}", headers=headers))
            report.add("retrieve OCR report", response, {200}, elapsed_ms=elapsed)
            response, elapsed = timed(lambda: client.get(f"/api/v1/ocr/{report_id}/simplified", headers=headers))
            report.add("retrieve simplified report", response, {200}, elapsed_ms=elapsed)
            response, elapsed = timed(lambda: client.post(f"/api/v1/ocr/{report_id}/translate", json={"target_language": "hi"}, headers=headers))
            report.add("translate report valid language", response, {200}, elapsed_ms=elapsed)
            response, elapsed = timed(lambda: client.post(f"/api/v1/ocr/{report_id}/translate", json={"target_language": "xx"}, headers=headers))
            report.add("translate report invalid language rejected", response, {422}, elapsed_ms=elapsed)
            response, elapsed = timed(lambda: client.get(f"/api/v1/ocr/{uuid.uuid4()}", headers=headers))
            report.add("missing OCR report rejected", response, {404}, elapsed_ms=elapsed)
            response, elapsed = timed(lambda: client.get("/api/v1/ocr/not-a-real-report", headers=headers))
            report.add("malformed OCR report id rejected", response, {422}, elapsed_ms=elapsed)

        response, elapsed = timed(lambda: client.post("/api/v1/simplify", json={"text": "Take tablet metformin 500 mg twice daily after food."}, headers=headers))
        report.add("simplify raw text valid", response, {200}, elapsed_ms=elapsed)
        response, elapsed = timed(lambda: client.post("/api/v1/simplify", json={}, headers=headers))
        report.add("simplify missing input rejected", response, {422}, elapsed_ms=elapsed)
        response, elapsed = timed(lambda: client.post("/api/v1/translate", json={"text": "Take medicine after food.", "target_language": "ta"}, headers=headers))
        report.add("translate raw text valid", response, {200}, elapsed_ms=elapsed)
        response, elapsed = timed(lambda: client.post("/api/v1/translate", json={"text": "Take medicine.", "target_language": "xx"}, headers=headers))
        report.add("translate raw text invalid language rejected", response, {422}, elapsed_ms=elapsed)

        response, elapsed = timed(lambda: client.get("/api/v1/dashboard", headers=headers))
        report.add("dashboard overview valid", response, {200}, elapsed_ms=elapsed)
        notification_id = seed_notification(user_id)
        response, elapsed = timed(lambda: client.get("/api/v1/dashboard/notifications", headers=headers))
        report.add("list notifications valid", response, {200}, elapsed_ms=elapsed)
        response, elapsed = timed(lambda: client.put(f"/api/v1/dashboard/notifications/{notification_id}/read", headers=headers))
        report.add("mark notification read valid", response, {200}, elapsed_ms=elapsed)
        response, elapsed = timed(lambda: client.put(f"/api/v1/dashboard/notifications/{uuid.uuid4()}/read", headers=headers))
        report.add("missing notification rejected", response, {404}, elapsed_ms=elapsed)
        response, elapsed = timed(lambda: client.put("/api/v1/dashboard/notifications/not-a-real-id/read", headers=headers))
        report.add("malformed notification id rejected", response, {422}, elapsed_ms=elapsed)

        response, elapsed = timed(lambda: client.post("/api/v1/auth/change-password", json={"old_password": "bad", "new_password": new_password}, headers=headers))
        report.add("change password bad old password rejected", response, {400}, elapsed_ms=elapsed)
        response, elapsed = timed(lambda: client.post("/api/v1/auth/change-password", json={"old_password": password, "new_password": new_password}, headers=headers))
        report.add("change password valid", response, {200}, elapsed_ms=elapsed)
        response, elapsed = timed(lambda: client.post("/api/v1/auth/login-json", json={"email": email, "password": new_password}))
        report.add("login with changed password valid", response, {200}, elapsed_ms=elapsed)

        logout_headers = auth_header(refreshed["access_token"])
        response, elapsed = timed(lambda: client.post("/api/v1/auth/logout", headers=logout_headers))
        report.add("logout valid token", response, {200}, elapsed_ms=elapsed)
        response, elapsed = timed(lambda: client.get("/api/v1/auth/profile", headers=logout_headers))
        report.add("revoked token rejected after logout", response, {401}, elapsed_ms=elapsed)

        if entry_id:
            response, elapsed = timed(lambda: client.delete(f"/api/v1/medical-history/{entry_id}", headers=headers))
            report.add("delete medical history valid", response, {200}, elapsed_ms=elapsed)
        if report_id:
            response, elapsed = timed(lambda: client.delete(f"/api/v1/ocr/{report_id}", headers=headers))
            report.add("delete OCR report valid", response, {200}, elapsed_ms=elapsed)

    report.db_counts = collect_db_counts()
    return report


if __name__ == "__main__":
    result = run()
    passed = sum(1 for c in result.checks if c.passed)
    failed = [c for c in result.checks if not c.passed]
    print(f"OpenAPI operations: {len(result.openapi_operations)}")
    for op in result.openapi_operations:
        print(f"  {op}")
    print(f"Checks: {passed}/{len(result.checks)} passed")
    print(f"DB counts: {result.db_counts}")
    if failed:
        print("Failures:")
        for check in failed:
            print(f"  FAIL {check.name}: status={check.status_code} detail={check.detail}")
        raise SystemExit(1)
    slow = [c for c in result.checks if c.elapsed_ms > 2000]
    if slow:
        print("Slow checks (>2000ms):")
        for check in slow:
            print(f"  {check.name}: {check.elapsed_ms:.1f}ms")
    print("All checks passed")




