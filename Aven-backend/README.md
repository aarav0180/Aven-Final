# Aven-backend

Aven-backend is a modular, low-latency Retrieval-Augmented Generation (RAG) API for AI-powered customer support. It provides a `/api/chat` endpoint that combines semantic search with LLMs (OpenRouter, Gemini fallback) to answer user questions about Aven.

## Features
- Fast `/api/chat` endpoint for text/voice chat with AI
- RAG pipeline: embedding, vector DB retrieval, context assembly
- Uses local or HuggingFace `all-MiniLM-L6-v2` for embeddings
- OpenRouter LLM with Gemini fallback
- Modular code: easy to extend with guardrails, tool-calling, etc.

## Setup
1. **Clone the repo and enter the backend folder:**
   ```sh
   cd Aven-backend
   ```
2. **Install dependencies:**
   ```sh
   pip install -r requirements.txt
   ```
3. **Download the embedding model (optional, for local use):**
   - Place the `all-MiniLM-L6-v2` model in `Aven-backend/models/` or let the backend download from HuggingFace Hub on first run.
4. **Set environment variables:**
   - `OPENROUTER_API_KEY`: Your OpenRouter API key
   - `GEMINI_API_KEY`: Your Gemini API key (for fallback)
   - `PINECONE_API_KEY`, `PINECONE_ENDPOINT`: Your Pinecone vector DB credentials

   Example (Linux/macOS):
   ```sh
   export OPENROUTER_API_KEY=sk-...
   export GEMINI_API_KEY=your-gemini-key
   export PINECONE_API_KEY=...
   export PINECONE_ENDPOINT=...
   ```

## Running
```sh
python app.py
```

## API Reference
### POST `/api/chat`
**Description:**
Chat with the Aven AI support agent using RAG and LLMs.

**Request JSON:**
```
{
  "query": "string",           // User's question (required)
  "chatHistory": [              // Optional chat history
    {"role": "user"|"assistant", "content": "string"}
  ]
}
```

**Response JSON:**
```
{
  "response": "string"         // AI's answer
}
```

**Notes:**
- Embeddings are required for every `/chat` request (see below).
- If OpenRouter is unavailable, Gemini is used as fallback.

## Embedding Model
- Uses `sentence-transformers/all-MiniLM-L6-v2` (384-dim vectors)
- Loads from local `models/` if available, else from HuggingFace Hub

## Fallback Logic
- If OpenRouter LLM call fails, Gemini is used automatically.

## Email and Meeting Integration

This app can now send emails and schedule meetings using free services:

### Email (Gmail SMTP)
- Set the following environment variables:
  - `SENDER_EMAIL`: Your Gmail address
  - `EMAIL_APP_PASSWORD`: Your Gmail app password (see Google Account > Security > App Passwords)
  - `AVEN_SUPPORT_EMAIL`: Support team email address
- The app uses Gmail SMTP to send emails to users or team members.
- **Note**: You must use an App Password, not your regular Gmail password.

### Meetings (Jitsi Meet)
- Meetings are scheduled using free Jitsi Meet links (no signup required).
- When a meeting is scheduled, a unique Jitsi Meet link is generated and sent via email to the recipient.

### Contact Detection
- The system detects when users want to contact the team using various phrases:
  - "contact team", "tell team", "inform team", "notify team"
  - "reach out", "get in touch", "let them know", "report", "escalate"
  - "send email", "mail", "schedule meeting", etc.
- Users can provide their email address in the chat (using `/mail email@example.com` or just typing their email).
- Email addresses are no longer blocked by guardrails.

### Error Handling
- If email sending fails due to configuration issues, users get a helpful message directing them to contact support directly.
- All email operations are wrapped in try-catch blocks for better reliability.

## Response Caching

The app now includes intelligent response caching to improve performance and reduce costs:

### How It Works
- **Cache Duration**: Responses are cached for 24 hours (configurable)
- **Cache Key**: Based on user query (normalized and hashed)
- **Persistence**: Cache is stored in `response_cache.json` file
- **Auto-cleanup**: Expired entries are automatically removed

### Benefits
- **Faster Responses**: Cached responses return instantly
- **Cost Reduction**: Fewer LLM API calls for repeated questions
- **Better UX**: Consistent responses for similar queries
- **Offline Capability**: Cached responses work even if LLM is down

### Cache Management Endpoints
- `GET /api/cache/stats` - View cache statistics
- `POST /api/cache/clear` - Clear all cache entries
- `POST /api/cache/clear-expired` - Remove expired entries only

### Cache Statistics
The system logs cache stats on startup:
- Active entries count
- Total entries count
- Cache file size
- Cache hit/miss logging

---

## Contributing / Contact
- For issues or contributions, open a pull request or contact the maintainer. 