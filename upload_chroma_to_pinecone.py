import os
import time
from dotenv import load_dotenv
import chromadb
from pinecone import Pinecone

# 1. Load environment variables
load_dotenv(dotenv_path="e:/infosys-chatbot/.env")

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY", "").strip()
INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "infosys-healthcare-ai-assistant").strip()

if not PINECONE_API_KEY or PINECONE_API_KEY.startswith("YOUR_"):
    raise ValueError("Valid PINECONE_API_KEY not found in .env")

print(f"Connecting to Pinecone index: {INDEX_NAME}...")
pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index(INDEX_NAME)

# 2. Connect to Local Chroma DB
print("Loading local Chroma vector database from ./pdf_vector_db...")
chroma_client = chromadb.PersistentClient(path="./pdf_vector_db")
collection = chroma_client.get_collection("local_contextual_collection")
total_count = collection.count()
print(f"Found {total_count} total vectors in ChromaDB collection 'local_contextual_collection'.")

# 3. Batch extract and upsert to Pinecone
BATCH_SIZE = 100
start_time = time.time()
upserted_count = 0

# Fetch in pagination chunks from ChromaDB
page_size = 500
offset = 0

while offset < total_count:
    print(f"\nFetching batch {offset} to {min(offset + page_size, total_count)} from ChromaDB...")
    batch_data = collection.get(
        limit=page_size,
        offset=offset,
        include=["embeddings", "metadatas", "documents"]
    )
    
    ids = batch_data["ids"]
    embeddings = batch_data["embeddings"]
    metadatas = batch_data["metadatas"]
    documents = batch_data["documents"]
    
    if not ids:
        break
        
    vectors_to_upsert = []
    for i in range(len(ids)):
        vec_id = ids[i]
        # Cast embedding numpy floats to standard Python float list
        vec_values = [float(v) for v in embeddings[i]]
        
        meta = metadatas[i].copy() if metadatas and metadatas[i] else {}
        if documents and i < len(documents) and documents[i]:
            meta["contextualized_text"] = documents[i]
            if "raw_text" not in meta:
                meta["raw_text"] = documents[i]
                
        # Pinecone metadata values must be string, number, boolean, or list of strings
        cleaned_meta = {}
        for k, v in meta.items():
            if isinstance(v, (str, int, float, bool)):
                cleaned_meta[k] = v
            elif isinstance(v, list):
                cleaned_meta[k] = [str(item) for item in v]
            else:
                cleaned_meta[k] = str(v)
                
        vectors_to_upsert.append({
            "id": vec_id,
            "values": vec_values,
            "metadata": cleaned_meta
        })
        
    # Upsert in sub-batches of 100 to Pinecone
    for b_start in range(0, len(vectors_to_upsert), BATCH_SIZE):
        sub_batch = vectors_to_upsert[b_start : b_start + BATCH_SIZE]
        index.upsert(vectors=sub_batch)
        upserted_count += len(sub_batch)
        print(f"  -> Upserted {upserted_count}/{total_count} vectors to Pinecone...")

    offset += page_size

elapsed = time.time() - start_time
print(f"\n========================================================")
print(f"Successfully uploaded {upserted_count} vectors to Pinecone in {elapsed:.2f} seconds!")
print(f"Fetching updated index stats from Pinecone...")
time.sleep(2)
stats = index.describe_index_stats()
print("Updated Pinecone Stats:", stats)
print(f"========================================================")
