# Aven Project Overview

Welcome to the Aven project! This document provides a high-level overview of the project structure, the purpose of each major subfolder, and how the components work together.

---

## Project Structure

```
Aven/
├── Aven-backend/      # Backend API, RAG logic, caching, email/meeting integration
├── Data-Pipeline/     # Data scraping, filtering, and feeding data into Pinecone
├── Customer/          # Frontend Next.js app (user interface)
└── ...                # Other files and folders
```

---

## Subfolder Details

### 1. **Aven-backend/**
- **Purpose:**
  - Handles all backend logic for the Aven platform.
  - Implements Retrieval-Augmented Generation (RAG) for answering user queries.
  - Integrates with Pinecone for vector search.
  - Provides caching for frequently asked questions (improves speed and reduces costs).
  - Manages email and meeting scheduling (SendGrid, Gmail, Jitsi Meet integration).
- **Key Features:**
  - REST API endpoints for chat, cache management, etc.
  - Guardrails for sensitive info and abusive language.
  - Modular utilities for email, meeting, and caching.
- **See:** [Aven-backend/README.md](Aven-backend/README.md)

### 2. **Customer/**
- **Purpose:**
  - The frontend application, built with Next.js.
  - Provides the user interface for interacting with the Aven assistant.
  - Handles chat, call, and meeting flows.
  - Integrates with the backend API for RAG and support features.
- **Key Features:**
  - Modern, responsive UI for users.
  - Local storage for chat/call message history.
  - Vapi integration for calls (if applicable).
- **See:** [Customer/README.md](Customer/README.md)

### 3. **Data-Pipeline/**
- **Purpose:**
  - Contains scripts and logic for scraping data from external sites.
  - Filters and processes scraped data.
  - Feeds processed data into Pinecone for use by the backend RAG system.
- **Key Features:**
  - Configurable scraping and filtering logic.
  - Embedding generation and upsert to Pinecone.
- **See:** [Data-Pipeline/README.md](Data-Pipeline/README.md)

---

## How It All Fits Together

- **User** interacts with the **Customer** frontend (Next.js app).
- The frontend sends queries to the **Aven-backend** API.
- The backend uses RAG logic, Pinecone, and caching to answer queries.
- For new data, the **Data-Pipeline** scrapes, filters, and feeds information into Pinecone.
- Email and meeting features are handled by the backend and surfaced in the frontend.

---

For more details, see the README in each subfolder:
- [Aven-backend/README.md](Aven-backend/README.md)
- [Customer/README.md](Customer/README.md)
- [Data-Pipeline/README.md](Data-Pipeline/README.md) 