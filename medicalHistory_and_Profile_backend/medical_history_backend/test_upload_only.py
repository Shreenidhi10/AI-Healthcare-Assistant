import urllib.request
import urllib.error
import uuid
import fitz
import json

doc = fitz.open()
page = doc.new_page()
page.insert_text((50, 100), "Rx: Tab Paracetamol 500mg\nTake 1 tablet after meals for fever.\nDr. Sharma", fontsize=14)
file_bytes = doc.tobytes()
doc.close()

boundary = "----WebKitFormBoundary" + uuid.uuid4().hex
content_type = f"multipart/form-data; boundary={boundary}"

body = (
    f"--{boundary}\r\n"
    f'Content-Disposition: form-data; name="file"; filename="test_prescription.pdf"\r\n'
    f"Content-Type: application/pdf\r\n\r\n"
).encode("utf-8") + file_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

req = urllib.request.Request(
    "http://localhost:8000/api/medical-history/upload",
    data=body,
    headers={"Content-Type": content_type},
    method="POST"
)

try:
    with urllib.request.urlopen(req) as resp:
        print("SUCCESS:", resp.status, json.loads(resp.read().decode("utf-8")))
except urllib.error.HTTPError as e:
    print("HTTP ERROR:", e.code, e.read().decode("utf-8"))
