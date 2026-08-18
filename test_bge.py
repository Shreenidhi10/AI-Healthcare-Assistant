import os
import re
import glob
from pypdf import PdfReader
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction
from langchain_text_splitters import RecursiveCharacterTextSplitter
import ollama
import time
from pinecone import Pinecone
from concurrent.futures import ThreadPoolExecutor, as_completed  # Clean, unmixed import

def clean_medical_text(text):
    """
    Cleans structural noise, page indicators, and formatting issues 
    inherited from raw PDF text extractions.
    """
    text = re.sub(r'(\w+)-\n\s*(\w+)', r'\1\2', text)
    text = re.sub(r'Page\s*\|\s*\d+', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\d+\s+P\s*RINCIPLES\s+OF\s+FOOD\s+SANITATION', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\n+', '\n', text)
    text = re.sub(r' +', ' ', text)
    return text.strip()

text_splitter = RecursiveCharacterTextSplitter(
    separators=["\n\n", "\n", ". ", "? ", "! ", " "], 
    chunk_size=1000,       
    chunk_overlap=300,   
    length_function=len
)

# Forcing BGE embedding processing onto your RTX 4060 GPU VRAM
bge_embedding_function = SentenceTransformerEmbeddingFunction(
    model_name="BAAI/bge-m3",
    device="cuda"
)

# PINECONE INITIALIZATION
# Replace with your actual key from your Pinecone dashboard
PINECONE_API_KEY = "pcsk_6ihmSX_EUVLkXRBLKobgCDEvvxJcngsU7kX41SgTK1xrmd7PDa87i3spYJFpqm1q1ExTf" 
INDEX_NAME = "infosys-healthcare-ai-assistant"

pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index(INDEX_NAME)

CONTEXT_PROMPT_TEMPLATE = """
You are an expert document preprocessor for a vector search engine. 
Your single goal is to write a brief 1-2 sentence context banner that anchors the provided text chunk within its original source document.

CRITICAL RULES:
1. Do NOT use generic placeholder text like "Global documentation fragment", "This chunk describes", or "This is an excerpt".
2. Identify the specific medical, clinical, or operational protocol being handled.
3. Keep the output under 30 words.

Now, process this specific tracking execution:
<document>
{WHOLE_DOCUMENT}
</document>

Here is the chunk we want to situate within the whole document:
<chunk>
{CHUNK_CONTENT}
</chunk>

Succinct Context Banner:
"""

def process_single_chunk(args):
    """Worker function executed in parallel threads to query Ollama simultaneously."""
    i, chunk, doc_summary, pdf_filename = args
    prompt = CONTEXT_PROMPT_TEMPLATE.format(
        WHOLE_DOCUMENT=doc_summary,
        CHUNK_CONTENT=chunk
    )
    
    try:
        response = ollama.chat(
            model='gemma3',
            messages=[
                {'role': 'system', 'content': 'You are a precise context extraction assistant. Output only the raw context string requested.'},
                {'role': 'user', 'content': prompt}
            ],
            options={'temperature': 0.0}
        )
        context_banner = response.message.content.strip()
        augmented_text = f"[Context: {context_banner}]\nContent: {chunk}"
        
        return {
            "text": augmented_text,
            "id": f"{pdf_filename}_local_ctx_{i}",
            "metadata": {"source": pdf_filename, "raw_text": chunk}
        }
    except Exception as e:
        print(f"Error processing chunk {i}: {e}")
        return None

pdf_files = glob.glob("*.pdf")

for pdf_filename in pdf_files:
    print(f"\n--- Parallel Processing for Pinecone: {pdf_filename} ---")
    
    # Check Pinecone status to avoid duplicate ingestion overhead
    try:
        first_chunk_id = f"{pdf_filename}_local_ctx_0"
        fetch_response = index.fetch(ids=[first_chunk_id])
        if fetch_response and fetch_response.get('vectors'):
            print(f"--> [SKIPPING]: {pdf_filename} has already been fully ingested. Moving on...")
            continue
    except Exception as db_err:
        print(f"[Status Check Warning]: Could not read Pinecone status for {pdf_filename}: {db_err}")
        
    try:
        reader = PdfReader(pdf_filename)
        long_dataset_text = ""
        for page in reader.pages:
            text = page.extract_text()
            if text:
                long_dataset_text += text + "\n"
                
        long_dataset_text = clean_medical_text(long_dataset_text)
        
        if not long_dataset_text.strip():
            print(f"Skipping empty or scanned file: {pdf_filename}")
            continue
            
        raw_chunks = text_splitter.split_text(long_dataset_text)
        total_chunks = len(raw_chunks)
        print(f"File sliced into {total_chunks} blocks. Beginning local contextualization...")
        
        print(f"Creating lightweight context summary for {pdf_filename}...")
        summary_response = ollama.chat(
            model='gemma3',
            messages=[{
                'role': 'user',
                'content': f"Write a concise 2-sentence overview of the core medical focus of this document:\n\n{long_dataset_text[:6000]}"
            }],
            options={'temperature': 0.0}
        )
        
        doc_summary = summary_response.message.content.strip()
        print(f"[Document Context established]: {doc_summary[:100]}...")
        
        print("Launching ThreadPoolExecutor to force GPU Batch Processing...")
        worker_tasks = [(i, chunk, doc_summary, pdf_filename) for i, chunk in enumerate(raw_chunks)]
        
        results_dict = {}
        
        # Parallel Execution Core with Real-Time Printing Updates
        with ThreadPoolExecutor(max_workers=4) as executor:
            future_to_idx = {executor.submit(process_single_chunk, task): task[0] for task in worker_tasks}
            completed_count = 0
            
            for future in as_completed(future_to_idx):
                idx = future_to_idx[future]
                try:
                    res = future.result()
                    if res:
                        results_dict[idx] = res
                    completed_count += 1
                    
                    if completed_count % 10 == 0 or completed_count == total_chunks:
                        print(f"    [GPU Activity]: Parallel pipeline processed chunk {completed_count}/{total_chunks}...")
                except Exception as exc:
                    print(f"    [Thread Error]: Chunk {idx} generated an exception: {exc}")
        
        # Re-assemble the parallel out-of-order map strings back into crisp sequential data arrays
        all_contextualized_text = []
        all_ids = []
        all_metadatas = []
        
        for i in range(total_chunks):
            if i in results_dict:
                all_contextualized_text.append(results_dict[i]["text"])
                all_ids.append(results_dict[i]["id"])
                all_metadatas.append(results_dict[i]["metadata"])
                
        print(f"Generating high-dimensional embeddings locally for {pdf_filename}...")
        all_embeddings = bge_embedding_function(all_contextualized_text)
        
        # PINECONE CLOUD TRANSFORMATION AND SERIALIZATION FIX
        vectors_to_upsert = []
        for idx in range(len(all_ids)):
            metadata_payload = all_metadatas[idx].copy()
            metadata_payload["contextualized_text"] = all_contextualized_text[idx] 
            
            # Explicitly cast numpy.float32 array coordinates into standard Python float types
            native_vector = [float(x) for x in all_embeddings[idx]]
            
            vectors_to_upsert.append((
                all_ids[idx],
                native_vector,
                metadata_payload
            ))
        
        print(f"Upserting vectors into Pinecone Index [{INDEX_NAME}]...")
        batch_size = 100
        for b_start in range(0, len(vectors_to_upsert), batch_size):
            batch = vectors_to_upsert[b_start : b_start + batch_size]
            index.upsert(vectors=batch)
            
        print(f"Successfully finalized and saved cloud dataset to Pinecone for: {pdf_filename}")
        
    except Exception as e:
        print(f"Local workflow tracking error on {pdf_filename}: {e}")

print("\nIngestion Complete! All contextualized vector embeddings are safely live on your Pinecone dashboard.")