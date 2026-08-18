from app.services.translation_service import get_translation_service

service = get_translation_service()

text = "Take Paracetamol 500 mg twice a day after food."

result = service.translate(
    text=text,
    target_lang="kn",
    protect_terms=["Paracetamol"],
)

print(result)