import os
import json
import time
from dotenv import load_dotenv
from pinecone import Pinecone

load_dotenv("e:/infosys-chatbot/.env")

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "infosys-healthcare-ai-assistant")

print(f"Connecting to Pinecone index '{INDEX_NAME}'...")
pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index(INDEX_NAME)

json_path = "e:/bge_testing/outputs/exported_chroma_embeddings.json"
print(f"Loading full vector dataset from: {json_path}...")

with open(json_path, "r", encoding="utf-8") as f:
    data = json.load(f)

total_vectors = len(data)
print(f"Loaded {total_vectors:,} total vectors from disk.")

BATCH_SIZE = 100
start_time = time.time()
upserted_count = 0

batch_payload = []
for i, item in enumerate(data):
    vec_id = str(item.get("id") or f"vector_{i}")
    vec_embedding = [float(x) for x in item["embedding"]]
    
    meta = item.get("metadata") or {}
    if not isinstance(meta, dict):
        meta = {}
    
    if "contextualized_text" not in meta and item.get("text"):
        meta["contextualized_text"] = item["text"][:1000] # truncate if huge for Pinecone 40KB metadata limit
    if "raw_text" not in meta and item.get("text"):
        meta["raw_text"] = item["text"][:1000]
        
    cleaned_meta = {}
    for k, v in meta.items():
        if isinstance(v, (str, int, float, bool)):
            cleaned_meta[k] = v
        elif isinstance(v, list):
            cleaned_meta[k] = [str(x) for x in v]
        elif v is not None:
            cleaned_meta[k] = str(v)

    batch_payload.append({
        "id": vec_id,
        "values": vec_embedding,
        "metadata": cleaned_meta
    })

    if len(batch_payload) >= BATCH_SIZE or i == total_vectors - 1:
        index.upsert(vectors=batch_payload)
        upserted_count += len(batch_payload)
        batch_payload = []
        if upserted_count % 1000 == 0 or upserted_count == total_vectors:
            print(f"  [Progress]: Upserted {upserted_count:,}/{total_vectors:,} vectors...")

elapsed = time.time() - start_time
print(f"\n========================================================")
print(f"Successfully upserted {upserted_count:,} vectors in {elapsed:.2f}s!")
time.sleep(2)
stats = index.describe_index_stats()
print("Updated Pinecone Stats:", stats)
print(f"========================================================")
