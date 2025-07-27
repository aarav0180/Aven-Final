import logging
import os
from pinecone import Pinecone, ServerlessSpec
from config import PINECONE_API_KEY, PINECONE_ENV, PINECONE_INDEX

logger = logging.getLogger("pinecone_client")

# Initialize Pinecone client
pc = Pinecone(api_key=PINECONE_API_KEY)

# Create index if it doesn't exist
if PINECONE_INDEX not in pc.list_indexes().names():
    pc.create_index(
        name=PINECONE_INDEX,
        dimension=384,  # Based on embedding size
        metric="cosine",
        spec=ServerlessSpec(
            cloud="aws",  # You may want to make this configurable
            region="us-west-2"  # You may want to make this configurable
        )
    )

index = pc.Index(PINECONE_INDEX)

def upsert_new_vectors(vectors):
    # Get all existing IDs in Pinecone
    all_ids = [vid for vid, _, _ in vectors]
    logger.info(f"Checking {len(all_ids)} IDs for existence in Pinecone...")
    existing = set()
    # Pinecone fetch returns dict of id: vector
    for i in range(0, len(all_ids), 100):
        batch = all_ids[i:i+100]
        fetch_result = index.fetch(ids=batch)
        existing.update(fetch_result.get('vectors', {}).keys())
    logger.info(f"{len(existing)} IDs already exist in Pinecone.")
    # Only upsert new ones
    new_vectors = [(vid, emb, meta) for vid, emb, meta in vectors if vid not in existing]
    if not new_vectors:
        logger.info("No new vectors to upsert.")
        return
    logger.info(f"Upserting {len(new_vectors)} new vectors to Pinecone...")
    index.upsert(vectors=new_vectors)
    logger.info("Upsert complete.") 