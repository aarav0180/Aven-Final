import requests
import os
import json
import logging

# Setup logging
tmp_log = logging.getLogger('embeddings')
tmp_log.setLevel(logging.DEBUG)  # DEBUG for full trace
handler = logging.StreamHandler()
formatter = logging.Formatter('%(asctime)s %(levelname)s [%(name)s] %(message)s')
handler.setFormatter(formatter)
tmp_log.addHandler(handler)

HF_TOKEN = os.getenv("HUGGINGFACE_TOKEN", "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")
HF_SPACE = "aarav0180-aven-backend.hf.space"
BASE_URL = f"https://{HF_SPACE}/gradio_api/call/predict"
HEADERS = {
    "Authorization": f"Bearer {HF_TOKEN}",
    "Content-Type": "application/json",
}


def get_query_embedding(query: str) -> list:
    """
    Sends `query` to the Gradio Space in a two-step POST/GET workflow,
    parses the streaming SSE response, and returns the embedding list.
    Logs detailed information and errors for debugging and monitoring.
    """
    payload = {"data": [query]}
    tmp_log.info(f"STEP1: POST → {BASE_URL}  payload={payload!r}")

    # STEP 1: Start run and grab event_id
    try:
        resp = requests.post(BASE_URL, headers=HEADERS, json=payload, timeout=30)
        tmp_log.debug(f"Raw POST response: status={resp.status_code}, body={resp.text}")
        resp.raise_for_status()
        jr = resp.json()
        tmp_log.debug(f"POST JSON parsed: {jr}")
        event_id = jr.get("event_id") or jr.get("id")
        if not event_id:
            tmp_log.error("No event_id or id in response JSON")
            raise ValueError(f"Missing event ID in response: {resp.text}")
        tmp_log.info(f"Obtained event_id: {event_id}")
    except Exception:
        tmp_log.exception("Failed to start Gradio run (STEP1)")
        return [0.0] * 384

    # STEP 2: Stream results
    result_url = f"{BASE_URL}/{event_id}"
    tmp_log.info(f"STEP2: GET (stream) → {result_url}")
    try:
        stream_resp = requests.get(result_url, headers=HEADERS, stream=True, timeout=60)
        tmp_log.debug(f"Raw GET response: status={stream_resp.status_code}, headers={stream_resp.headers}")
        stream_resp.raise_for_status()
    except Exception:
        tmp_log.exception("Failed to fetch streaming results (STEP2)")
        return [0.0] * 384

    embedding = None
    # Parse SSE lines
    for idx, raw_line in enumerate(stream_resp.iter_lines(decode_unicode=True)):
        tmp_log.debug(f"SSE raw_line[{idx}]: {raw_line}")
        if not raw_line:
            continue
        text = raw_line.decode('utf-8') if isinstance(raw_line, bytes) else raw_line
        json_str = text
        if text.startswith("data:"):
            json_str = text[len("data:"):].strip()
        try:
            payload_chunk = json.loads(json_str)
            tmp_log.debug(f"Parsed JSON chunk: {payload_chunk}")
        except json.JSONDecodeError as jde:
            tmp_log.warning(f"Line {idx} not JSON or incomplete: {jde}")
            continue
        # CASE 1: dict with 'data' key
        if isinstance(payload_chunk, dict) and "data" in payload_chunk:
            data = payload_chunk["data"]
            tmp_log.info(f"Received payload_chunk['data']: {data}")
        # CASE 2: payload is list (nested embeddings)
        elif isinstance(payload_chunk, list):
            data = payload_chunk
            tmp_log.info(f"Received top-level list payload: {data}")
        else:
            tmp_log.error(f"Unexpected SSE payload format: {type(payload_chunk)} -> {payload_chunk}")
            continue
        # Attempt to extract embedding from various nesting:
        try:
            # depth-1 list of floats
            if isinstance(data[0], (int, float)):
                embedding = data
                tmp_log.info("Parsed embedding as direct list of numbers")
            # depth-2 list: [ [floats] ]
            elif isinstance(data[0], list) and all(isinstance(x, (int, float)) for x in data[0]):
                embedding = data[0]
                tmp_log.info("Parsed embedding from depth-2 nesting")
            # depth-3 list: [ [ [floats] ] ]
            elif (isinstance(data[0], list)
                  and isinstance(data[0][0], list)
                  and all(isinstance(x, (int, float)) for x in data[0][0])):
                embedding = data[0][0]
                tmp_log.info("Parsed embedding from depth-3 nesting")
            # dict with embedding key
            elif isinstance(data[0], dict) and "embedding" in data[0]:
                embedding = data[0]["embedding"]
                tmp_log.info("Parsed embedding from dict with 'embedding'")
            else:
                tmp_log.error(f"Unrecognized data structure for embedding: {data}")
        except Exception as e:
            tmp_log.exception(f"Error extracting embedding from data: {data}")
        if embedding is not None:
            break

    if embedding is None:
        tmp_log.error("No valid embedding found after streaming SSE; returning zero-vector")
        return [0.0] * 384

    tmp_log.info("Successfully retrieved embedding vector via SSE")
    return embedding
