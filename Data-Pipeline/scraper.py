import logging
from firecrawl import FirecrawlApp, ScrapeOptions
from config import FIRECRAWL_API_KEY
import requests

logger = logging.getLogger("scraper")

def scrape_aven():
    app = FirecrawlApp(api_key=FIRECRAWL_API_KEY)
    logger.info("Crawling aven.com with Firecrawl...")
    try:
        crawl_result = app.crawl_url(
            'https://aven.com',
            limit=8,
            scrape_options=ScrapeOptions(formats=['markdown', 'html'])
        )
        logger.info(f"Crawl result keys: {list(crawl_result.dict().keys())}")
        logger.info(f"Full crawl result data: {crawl_result.dict()}")
    except requests.exceptions.RequestException as e:
        logger.error(f"Firecrawl API error: {e}")
        return []
    except Exception as e:
        logger.error(f"Unexpected error during Firecrawl crawl: {e}")
        return []
    all_chunks = []
    pages = crawl_result.dict().get('data', [])
    logger.info(f"Crawled {len(pages)} pages from aven.com")
    for page in pages:
        url = page.get('url', 'unknown')
        # Prefer markdown, fallback to html
        text = page.get('markdown') or page.get('html') or ''
        if not text:
            logger.warning(f"No content found for page {url}")
            continue
        paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
        for idx, para in enumerate(paragraphs):
            # Filter out HTML content
            if '<' in para and '>' in para:
                # Likely HTML, skip this chunk
                continue
            all_chunks.append({
                'content': para,
                'source': url,
                'chunk_index': idx
            })
    logger.info(f"Extracted {len(all_chunks)} text chunks from crawl.")
    return all_chunks 