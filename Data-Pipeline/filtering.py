import logging
import re

logger = logging.getLogger("filtering")

def filter_chunks(chunks):
    seen = set()
    filtered = []
    for chunk in chunks:
        text = chunk['content'].strip()
        # Remove empty
        if not text:
            continue
        # Remove duplicates
        text_hash = hash(text)
        if text_hash in seen:
            logger.debug(f"Duplicate chunk skipped: {text[:30]}...")
            continue
        seen.add(text_hash)
        # Remove boilerplate (example: copyright, navigation, etc.)
        if re.search(r'copyright|all rights reserved|privacy policy|terms of service', text, re.I):
            logger.debug(f"Boilerplate chunk skipped: {text[:30]}...")
            continue
        filtered.append(chunk)
    logger.info(f"Filtered down to {len(filtered)} chunks (from {len(chunks)})")
    return filtered 