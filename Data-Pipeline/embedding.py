import requests
import os
import json
import logging
from typing import List

# Setup logging
batch_log = logging.getLogger('embedding_batch')
batch_log.setLevel(logging.DEBUG)
handler = logging.StreamHandler()
formatter = logging.Formatter('%(asctime)s %(levelname)s [%(name)s] %(message)s')
handler.setFormatter(formatter)
batch_log.addHandler(handler)

HF_TOKEN = os.getenv("HUGGINGFACE_TOKEN", "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")
HF_SPACE = "aarav0180-aven-backend.hf.space"
BASE_URL = f"https://{HF_SPACE}/gradio_api/call/predict"
HEADERS = {
    "Authorization": f"Bearer {HF_TOKEN}",
    "Content-Type": "application/json",
}


def embed_batch(queries: List[str], batch_size: int = 8) -> List[List[float]]:
    """
    Embeds a list of queries in batches for higher accuracy.
    Returns a list of embedding vectors (one per query).
    """
    all_embeddings = []
    for i in range(0, len(queries), batch_size):
        batch = queries[i:i+batch_size]
        payload = {"data": batch}
        batch_log.info(f"POST batch {i//batch_size+1}: {batch!r}")
        try:
            resp = requests.post(BASE_URL, headers=HEADERS, json=payload, timeout=60)
            batch_log.debug(f"Raw POST response: status={resp.status_code}, body={resp.text}")
            resp.raise_for_status()
            jr = resp.json()
            event_id = jr.get("event_id") or jr.get("id")
            if not event_id:
                batch_log.error("No event_id or id in response JSON")
                raise ValueError(f"Missing event ID in response: {resp.text}")
        except Exception:
            batch_log.exception("Failed to start Gradio run for batch")
            all_embeddings.extend([[0.0]*384 for _ in batch])
            continue

        # STEP 2: Stream results
        result_url = f"{BASE_URL}/{event_id}"
        batch_log.info(f"GET (stream) → {result_url}")
        try:
            stream_resp = requests.get(result_url, headers=HEADERS, stream=True, timeout=120)
            stream_resp.raise_for_status()
        except Exception:
            batch_log.exception("Failed to fetch streaming results for batch")
            all_embeddings.extend([[0.0]*384 for _ in batch])
            continue

        batch_embeddings = []
        for idx, raw_line in enumerate(stream_resp.iter_lines(decode_unicode=True)):
            if not raw_line:
                continue
            text = raw_line.decode('utf-8') if isinstance(raw_line, bytes) else raw_line
            json_str = text
            if text.startswith("data:"):
                json_str = text[len("data:"):].strip()
            try:
                payload_chunk = json.loads(json_str)
            except json.JSONDecodeError:
                continue
            # Try to extract embeddings from the payload
            data = None
            if isinstance(payload_chunk, dict) and "data" in payload_chunk:
                data = payload_chunk["data"]
            elif isinstance(payload_chunk, list):
                data = payload_chunk
            if data is not None:
                # Handle various nesting
                try:
                    # List of embeddings: [[...], [...], ...]
                    if isinstance(data[0], list) and all(isinstance(x, (int, float)) for x in data[0]):
                        batch_embeddings = data
                        break
                    # Nested: [[[...]], [[...]], ...]
                    elif (isinstance(data[0], list) and isinstance(data[0][0], list)
                          and all(isinstance(x, (int, float)) for x in data[0][0])):
                        batch_embeddings = [d[0] for d in data]
                        break
                    # Dict with embedding key
                    elif isinstance(data[0], dict) and "embedding" in data[0]:
                        batch_embeddings = [d["embedding"] for d in data]
                        break
                except Exception:
                    batch_log.exception(f"Error extracting batch embeddings from data: {data}")
        if not batch_embeddings or len(batch_embeddings) != len(batch):
            batch_log.error(f"Batch embedding failed or incomplete, got {len(batch_embeddings)} for {len(batch)} queries")
            batch_embeddings = [[0.0]*384 for _ in batch]
        all_embeddings.extend(batch_embeddings)
    return all_embeddings 