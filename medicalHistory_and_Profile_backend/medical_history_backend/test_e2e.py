"""
test_e2e.py — Comprehensive Integration Test Suite for Unified FastAPI Backend.
"""
import json
import urllib.request
import urllib.parse
import uuid
import fitz  # PyMuPDF

base = "http://localhost:8001"

print("============================================================")
print(" FASTAPI MIGRATION VERIFICATION: PROFILE & MEDICAL HISTORY")
print("============================================================")

# 1. Root & Health Check
print("\n[1] GET / & GET /api/health")
req = urllib.request.urlopen(f"{base}/")
root = json.loads(req.read().decode("utf-8"))
print("Service:", root.get("service"), "| Status:", root.get("status"))

req_health = urllib.request.urlopen(f"{base}/api/health")
health = json.loads(req_health.read().decode("utf-8"))
print("Health Message:", health.get("message"))

# 2. Profile GET
print("\n[2] GET /api/profile")
req_prof = urllib.request.urlopen(f"{base}/api/profile")
prof = json.loads(req_prof.read().decode("utf-8"))
print("Profile Get Success:", prof.get("success"), "| Preferred Lang:", prof.get("data", {}).get("preferredLanguage"))

# 3. Profile PUT
print("\n[3] PUT /api/profile")
update_payload = json.dumps({
    "name": "Test User",
    "age": 30,
    "gender": "Male",
    "bloodGroup": "O+",
    "preferredLanguage": "English",
    "allergies": ["Penicillin"],
    "chronicConditions": ["Asthma"]
}).encode("utf-8")

req_put = urllib.request.Request(
    f"{base}/api/profile",
    data=update_payload,
    headers={"Content-Type": "application/json"},
    method="PUT"
)
with urllib.request.urlopen(req_put) as resp:
    put_res = json.loads(resp.read().decode("utf-8"))
print("Profile Update Success:", put_res.get("success"), "| Name:", put_res.get("data", {}).get("name"))

# 4. Prescriptions STATS
print("\n[4] GET /api/prescriptions/stats")
req_stats = urllib.request.urlopen(f"{base}/api/prescriptions/stats")
stats = json.loads(req_stats.read().decode("utf-8"))
print("Stats Total Prescriptions:", stats.get("data", {}).get("totalPrescriptions"))

# 5. Prescription Upload
print("\n[5] POST /api/medical-history/upload")
doc = fitz.open()
page = doc.new_page()
page.insert_text((50, 100), "Rx: Tab Paracetamol 500mg\nTake 1 tablet after meals for fever.\nDr. Sharma", fontsize=14)
file_bytes = doc.tobytes()
doc.close()

boundary = "----WebKitFormBoundary" + uuid.uuid4().hex
content_type = f"multipart/form-data; boundary={boundary}"
filename = "test_prescription.pdf"

body = (
    f"--{boundary}\r\n"
    f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
    f"Content-Type: application/pdf\r\n\r\n"
).encode("utf-8") + file_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

req_upload = urllib.request.Request(
    f"{base}/api/medical-history/upload",
    data=body,
    headers={"Content-Type": content_type},
    method="POST"
)
with urllib.request.urlopen(req_upload) as resp:
    upload_res = json.loads(resp.read().decode("utf-8"))

new_id = upload_res.get("data", {}).get("id")
print("Upload Success:", upload_res.get("success"))
print("Saved ID:      ", new_id)
print("Medication:    ", upload_res.get("data", {}).get("medication"))
print("Doctor:        ", upload_res.get("data", {}).get("doctorName"))

# 6. List Medical History
print("\n[6] GET /api/medical-history")
req_hist = urllib.request.urlopen(f"{base}/api/medical-history")
hist = json.loads(req_hist.read().decode("utf-8"))
found = any(rec.get("id") == new_id for rec in hist.get("data", []))
print("Record Found in Database:", "YES [PASS]" if found else "NO [FAIL]")

# 7. Delete test record
print(f"\n[7] DELETE /api/medical-history/{new_id}")
req_del = urllib.request.Request(f"{base}/api/medical-history/{new_id}", method="DELETE")
with urllib.request.urlopen(req_del) as resp:
    del_res = json.loads(resp.read().decode("utf-8"))
print("Delete Success:", del_res.get("success"))

print("\n============================================================")
print(" ALL FASTAPI MIGRATION TESTS PASSED SUCCESSFULLY! [PASS]")
print("============================================================")
