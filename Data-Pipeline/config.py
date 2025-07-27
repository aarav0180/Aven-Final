import os
from dotenv import load_dotenv

load_dotenv()

FIRECRAWL_API_KEY = os.getenv("FIRECRAWL_API_KEY")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY") or os.getenv("PINECONE_URI")
PINECONE_ENV = os.getenv("PINECONE_ENVIRONMENT") or "gcp-starter"
PINECONE_INDEX = os.getenv("PINECONE_INDEX", "aven")
PINECONE_ENDPOINT = os.getenv("PINECONE_ENDPOINT")
EMBEDDING_API_URL = os.getenv("EMBEDDING_API_URL")
EMBEDDING_API_KEY = os.getenv("EMBEDDING_API_KEY")

if not FIRECRAWL_API_KEY:
    raise RuntimeError("FIRECRAWL_API_KEY not set")
if not PINECONE_API_KEY:
    raise RuntimeError("PINECONE_API_KEY not set")
if not EMBEDDING_API_URL:
    raise RuntimeError("EMBEDDING_API_URL not set") 