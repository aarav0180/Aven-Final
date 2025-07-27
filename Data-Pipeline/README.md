# Aven Production Data Pipeline

This pipeline scrapes data from aven.com, filters and deduplicates the content, generates embeddings, and upserts the results to Pinecone for use in RAG applications.

## Architecture
- **Scraping:** Uses Firecrawl to extract content from aven.com (markdown, html).
- **Filtering:** Cleans and filters raw text (removes boilerplate, empty, or duplicate content).
- **Embedding:** Uses a local or remote embedding model to generate vector representations for each chunk.
- **Deduplication:** Checks Pinecone for existing vectors to avoid duplicate upserts.
- **Upsert:** Inserts new/updated vectors into Pinecone with metadata.

## Structure
- `main.py` — Entrypoint for the pipeline (production server, orchestration)
- `scraper.py` — Firecrawl scraping logic
- `filtering.py` — Text cleaning and filtering
- `embedding.py` — Embedding logic (calls model or API)
- `pinecone_client.py` — Pinecone upsert and deduplication logic
- `config.py` — Centralized config/env loading

## .env Example
Create a file named `.env` in your `Data-Pipeline` folder and fill in your credentials:

```
# Firecrawl API key
FIRECRAWL_API_KEY=fc-xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Pinecone settings
PINECONE_API_KEY=pcsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
PINECONE_ENVIRONMENT=gcp-starter
PINECONE_INDEX=aven
PINECONE_ENDPOINT=your-pinecone-endpoint.svc.region.pinecone.io

# Embedding API (e.g., your Hugging Face Space or other model endpoint)
EMBEDDING_API_URL=https://your-embedding-api/predict
EMBEDDING_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Running the Pipeline

**Install requirements:**
```sh
pip install -r requirements.txt
```

**Run as a FastAPI server:**
```sh
uvicorn main:app --host 0.0.0.0 --port 8000
```

**Run as a CLI script:**
```sh
python main.py
```

Just create a file named `.env.example` in your `Data-Pipeline` folder and paste the above content.  
This will help anyone set up the pipeline with the correct environment variables!

- The pipeline is modular and can be extended for other sources or more advanced filtering.
- All steps are logged for traceability. 

# Data Pipeline API

## API Endpoints

### POST /run
Runs the full Aven data pipeline: scraping, filtering, embedding, and upserting to Pinecone.

**Request:**
- No body required.

**Response:**
- JSON object with the following fields:
  - `scraped`: Number of chunks scraped
  - `filtered`: Number of chunks after filtering
  - `upserted`: Number of vectors upserted to Pinecone

**Example:**
```http
POST /run
```
**Response:**
```json
{
  "scraped": 123,
  "filtered": 100,
  "upserted": 100
}
``` 
