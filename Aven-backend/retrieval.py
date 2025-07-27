import os
import requests
from functools import lru_cache
from dotenv import load_dotenv
from pymongo import MongoClient
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()
PINECONE_API_KEY = os.getenv("PINECONE_URI", "pcsk_77x46t_Gwjs73cN42q8XoQXSfjwAeR216qKxgxTSJJPGeznRvSFPDYoaKhGRnfHhJTx1cH")
PINECONE_INDEX = os.getenv("PINECONE_INDEX", "aven")
PINECONE_ENDPOINT = os.getenv("PINECONE_ENDPOINT", "aven-fl0czaf.svc.aped-4627-b74a.pinecone.io")
MONGODB_URI = os.getenv("MONGODB_URI2")


def fetch_instructional_prompt():
    """Fetch instructional prompt for Aven from MongoDB 'databases.rag_data'."""
    if not MONGODB_URI:
        return ''
    try:
        client = MongoClient(MONGODB_URI)
        db = client['databases']
        collection = db['rag_data']
        entry = collection.find_one({'subject': 'Aven', 'topic': 'instructional_prompt'})
        if entry:
            logger.info(f"Found instructional prompt for Aven")
        else:
            logger.info(f"No instructional prompt found for Aven")
        return entry['content'] if entry else ''
    except Exception as e:
        logger.error(f"Error fetching instructional prompt: {e}", exc_info=True)
        return ''


def retrieve_context(query, embedding, pinecone_filter=None):
    """
    Retrieve context from Pinecone with NO filter (all vectors eligible).
    Returns (context, instructional_prompt) tuple.
    """
    instructional_prompt = fetch_instructional_prompt()
    if not (PINECONE_API_KEY and PINECONE_ENDPOINT):
        logger.error("Pinecone API key or endpoint not set.")
        return '', instructional_prompt
    base_url = f"https://{PINECONE_ENDPOINT}/query"
    headers = {"Api-Key": PINECONE_API_KEY, "Content-Type": "application/json"}
    body = {
        "vector": embedding,
        "topK": 5,
        "includeMetadata": True,
        "includeValues": False
    }
    try:
        logger.info(f"Querying Pinecone for context. No filter.")
        response = requests.post(base_url, headers=headers, json=body, timeout=7)
        response.raise_for_status()
        results = response.json()
        matches = results.get("matches", [])
        logger.info(f"Pinecone returned {len(matches)} matches.")
        top_contexts = [m["metadata"].get("content", "") for m in matches[:5]]
        return "\n\n".join(top_contexts), instructional_prompt
    except Exception as e:
        logger.error(f"Error during Pinecone retrieval: {e}", exc_info=True)
        return '', instructional_prompt 