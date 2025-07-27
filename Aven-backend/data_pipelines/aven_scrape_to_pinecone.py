import os
import logging
from firecrawl import FirecrawlApp
import pinecone
from embeddings import get_query_embedding
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("aven_pipeline")

load_dotenv()
FIRECRAWL_API_KEY = os.getenv("FIRECRAWL_API_KEY")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY") or os.getenv("PINECONE_URI")
PINECONE_ENV = os.getenv("PINECONE_ENVIRONMENT") or "gcp-starter"
PINECONE_INDEX = os.getenv("PINECONE_INDEX", "aven")
PINECONE_ENDPOINT = os.getenv("PINECONE_ENDPOINT")

if not FIRECRAWL_API_KEY:
    raise RuntimeError("FIRECRAWL_API_KEY not set")
if not PINECONE_API_KEY:
    raise RuntimeError("PINECONE_API_KEY not set")

# 1. Scrape aven.com
app = FirecrawlApp(api_key=FIRECRAWL_API_KEY)
logger.info("Scraping aven.com with Firecrawl...")
scrape_result = app.scrape_url('aven.com', formats=['markdown', 'html'])
logger.info(f"Scrape result keys: {list(scrape_result.keys())}")

# 2. Extract text chunks (from markdown or html)
chunks = []
if 'markdown' in scrape_result:
    # Split markdown into paragraphs or sections
    text = scrape_result['markdown']
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
    for idx, para in enumerate(paragraphs):
        chunks.append({
            'content': para,
            'source': 'aven.com',
            'chunk_index': idx
        })
elif 'html' in scrape_result:
    # Fallback: treat the whole HTML as one chunk
    chunks.append({
        'content': scrape_result['html'],
        'source': 'aven.com',
        'chunk_index': 0
    })
else:
    logger.error("No markdown or html found in scrape result!")
    exit(1)

logger.info(f"Extracted {len(chunks)} text chunks from aven.com")

# 3. Initialize Pinecone
pinecone.init(api_key=PINECONE_API_KEY, environment=PINECONE_ENV)
index = pinecone.Index(PINECONE_INDEX)

# 4. Embed and upsert each chunk
for chunk in chunks:
    text = chunk['content']
    embedding = get_query_embedding(text)
    vector_id = f"aven-{chunk['chunk_index']}"
    meta = {
        'source': chunk['source'],
        'content': text,
        'chunk_index': chunk['chunk_index']
    }
    logger.info(f"Upserting chunk {vector_id} to Pinecone...")
    index.upsert(vectors=[(vector_id, embedding, meta)])

logger.info("All chunks upserted to Pinecone.") 