import logging
from fastapi import FastAPI
from fastapi.responses import JSONResponse
import uvicorn
from scraper import scrape_aven
from filtering import filter_chunks
from embedding import embed_batch
from pinecone_client import upsert_new_vectors

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

app = FastAPI()

@app.post("/run")
def run_pipeline():
    logger.info("Starting Aven data pipeline...")
    chunks = scrape_aven()
    filtered = filter_chunks(chunks)
    vectors = embed_batch(filtered)
    upsert_new_vectors(vectors)
    logger.info("Pipeline complete.")
    return JSONResponse({
        "scraped": len(chunks),
        "filtered": len(filtered),
        "upserted": len(vectors)
    })

if __name__ == "__main__":
    # CLI run
    logger.info("Running pipeline via CLI...")
    chunks = scrape_aven()
    filtered = filter_chunks(chunks)
    vectors = embed_batch(filtered)
    upsert_new_vectors(vectors)
    logger.info("Pipeline complete.")
    print(f"Scraped: {len(chunks)}, Filtered: {len(filtered)}, Upserted: {len(vectors)}") 