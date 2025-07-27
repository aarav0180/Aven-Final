// Pinecone RAG Data Model (replaces MongoDB)
// Requires: npm install axios dotenv mongoose

const axios = require("axios")
require("dotenv").config()
const mongoose = require("mongoose")

const PINECONE_API_KEY = process.env.Pinecone_URI || process.env.PINECONE_URI
const PINECONE_INDEX = process.env.PINECONE_INDEX // e.g. 'ragdata'
const PINECONE_PROJECT = process.env.PINECONE_PROJECT // e.g. 'xxxxxx' (your project ID)
const PINECONE_ENV = process.env.PINECONE_ENV // e.g. 'us-west1-gcp'
const PINECONE_ENDPOINT = process.env.PINECONE_ENDPOINT // e.g. ragdata-xxxxxx.svc.us-west1-gcp.pinecone.io
const MONGODB_URI = process.env.MONGODB_URI2 || process.env.MONGODB_URI
// Always use 'databases' as the database name for rag_data collection
const MONGODB_DATABASE = "databases"

// Add config validation and helpful error
if (!PINECONE_API_KEY) {
  throw new Error("Pinecone API key is missing. Set Pinecone_URI or PINECONE_URI in your .env file.")
}
if (!PINECONE_INDEX) {
  throw new Error('Pinecone index name is missing. Set PINECONE_INDEX in your .env file (e.g., "ragdata").')
}

// Fetch the correct data plane endpoint from Pinecone control plane
let PINECONE_BASE_URL = null
async function getPineconeBaseUrl() {
  // Use endpoint from env if available
  if (PINECONE_ENDPOINT) {
    if (!PINECONE_BASE_URL) {
      PINECONE_BASE_URL = `https://${PINECONE_ENDPOINT}`
    }
    return PINECONE_BASE_URL
  }
  if (PINECONE_BASE_URL) return PINECONE_BASE_URL
  const describeUrl = `https://api.pinecone.io/v2/indexes/${PINECONE_INDEX}`
  const headers = {
    "Api-Key": PINECONE_API_KEY,
    "Content-Type": "application/json",
  }
  try {
    const res = await axios.get(describeUrl, { headers })
    if (!res.data || !res.data.status || !res.data.status.host) {
      throw new Error("Could not fetch Pinecone index endpoint. Check your index name and API key.")
    }
    PINECONE_BASE_URL = `https://${res.data.status.host}`
    return PINECONE_BASE_URL
  } catch (err) {
    throw new Error(
      `Failed to fetch Pinecone index endpoint from control plane. ` +
        `Check that your PINECONE_INDEX is correct and your API key has access. ` +
        `Original error: ${err.message}`,
    )
  }
}

function getPineconeHeaders() {
  return {
    "Api-Key": PINECONE_API_KEY,
    "Content-Type": "application/json",
  }
}

// Add helper function for text chunking
// Update chunkText to include document title
function chunkText(text, documentTitle, maxChunkSize = 500) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
  const chunks = []
  let currentChunk = ""
  const header = `Document: ${documentTitle}\n---\n`

  for (const sentence of sentences) {
    // Account for header length in chunk size calculation
    if ((currentChunk + sentence).length + header.length > maxChunkSize) {
      if (currentChunk) {
        chunks.push(header + currentChunk.trim())
      }
      currentChunk = sentence
    } else {
      currentChunk += " " + sentence
    }
  }
  if (currentChunk) {
    chunks.push(header + currentChunk.trim())
  }
  return chunks
}

// Add batch embedding function
export async function getBatchEmbeddings(texts) {
  const HF_TOKEN = process.env.HUGGINGFACE_TOKEN
  if (!HF_TOKEN) throw new Error("HUGGINGFACE_TOKEN not set in .env")

  try {
    const { Client } = await import("@gradio/client")
    const client = await Client.connect("aarav0180/aven-backend", { hf_token: HF_TOKEN })

    // Process in batches of 10
    const batchSize = 10
    const embeddings = []

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize)
      const promises = batch.map((text) => client.predict("/predict", { inputs: text }))
      const results = await Promise.all(promises)

      for (const result of results) {
        console.log("[DEBUG] Gradio embedding result:", JSON.stringify(result));
        if (result.data?.[0]?.embedding) {
          embeddings.push(result.data[0].embedding)
        } else if (Array.isArray(result.data) && result.data.every((v) => typeof v === "number")) {
          embeddings.push(result.data)
        } else if (
          Array.isArray(result.data) &&
          result.data.length === 1 &&
          Array.isArray(result.data[0]) &&
          result.data[0].length === 1 &&
          Array.isArray(result.data[0][0]) &&
          result.data[0][0].every((v) => typeof v === "number")
        ) {
          // Handle [[[...]]] format
          embeddings.push(result.data[0][0])
        } else {
          throw new Error("Invalid embedding format: " + JSON.stringify(result.data));
        }
      }
    }

    return embeddings
  } catch (e) {
    console.error("Batch embedding error:", e)
    throw e
  }
}

// Upsert a RAG entry (id, vector, metadata)
export async function upsertRagEntry(id, vector, metadata = {}) {
  let vectors = []

  // If content is too large, chunk it
  if (metadata.content && metadata.content.length > 1000) {
    const documentTitle = metadata.filename || metadata.documentOrigin || "Unknown Document"
    const chunks = chunkText(metadata.content, documentTitle)
    const embeddings = await getBatchEmbeddings(chunks)

    // Create vectors for each chunk
    vectors = chunks.map((chunk, index) => ({
      id: `${id}-chunk-${index}`,
      values: embeddings[index],
      metadata: {
        ...metadata,
        content: chunk,
        chunk_index: index,
        total_chunks: chunks.length,
        document_title: documentTitle,
      },
    }))
  } else {
    // For small content, use original vector and still include document title
    const documentTitle = metadata.filename || metadata.documentOrigin || "Unknown Document"
    vectors = [
      {
        id,
        values: vector,
        metadata: {
          ...metadata,
          content: `Document: ${documentTitle}\n---\n${metadata.content}`,
          document_title: documentTitle,
        },
      },
    ]
  }

  // Batch upsert to Pinecone
  const baseUrl = await getPineconeBaseUrl()
  const url = `${baseUrl}/vectors/upsert`
  console.log("[PINECONE DEBUG] Upserting vectors to Pinecone:", JSON.stringify(vectors, null, 2))
  console.log("[PINECONE DEBUG] Pinecone upsert endpoint:", url)
  try {
    const response = await axios.post(url, { vectors }, { headers: getPineconeHeaders() })
    console.log("[PINECONE DEBUG] Pinecone upsert response:", JSON.stringify(response.data, null, 2))
  } catch (err) {
    console.error("[PINECONE ERROR] Upsert failed:", err?.response?.data || err.message || err)
    throw err
  }
}

export async function fetchRagEntry(id) {
  const baseUrl = await getPineconeBaseUrl()
  const url = `${baseUrl}/vectors/fetch`
  const body = { ids: [id] }
  const res = await axios.post(url, body, { headers: getPineconeHeaders() })
  return res.data.vectors[id]
}

// Delete a RAG entry by id
export async function deleteRagEntry(id) {
  const baseUrl = await getPineconeBaseUrl()
  const url = `${baseUrl}/vectors/delete`
  const body = { ids: [id] }
  await axios.post(url, body, { headers: getPineconeHeaders() })
}

export async function queryRagEntries(vector, topK = 5, filter = {}) {
  const baseUrl = await getPineconeBaseUrl()
  const url = `${baseUrl}/query`
  const body = {
    vector,
    topK,
    includeMetadata: true,
    filter,
  }
  let lastError = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await axios.post(url, body, { headers: getPineconeHeaders(), timeout: 15000 })
      return res.data.matches
    } catch (err) {
      lastError = err
      if (err.code === "ECONNRESET") {
        console.error(
          `[Pinecone ECONNRESET] Attempt ${attempt}: Connection was reset. Retrying in 1s... Endpoint: ${url}`,
        )
        await new Promise((r) => setTimeout(r, 1000))
        continue
      }
      // Log other network errors
      if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND" || err.code === "ETIMEDOUT") {
        console.error(`[Pinecone Network Error] Attempt ${attempt}: ${err.code} - ${err.message} Endpoint: ${url}`)
        await new Promise((r) => setTimeout(r, 1000))
        continue
      }
      // For other errors, break immediately
      console.error("Error querying Pinecone:", err.message)
      throw err
    }
  }
  // If all retries failed, throw the last error
  console.error("Failed to query Pinecone after 3 attempts:", lastError?.message || lastError)
  throw lastError
}

let mongoConnection = null;
let RagDataModel = null;

export async function getRagDataModel() {
  if (RagDataModel) return RagDataModel;
  if (!mongoConnection) {
    mongoConnection = await mongoose.createConnection(MONGODB_URI, {
      dbName: MONGODB_DATABASE,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }
  const ragDataSchema = new mongoose.Schema({}, { collection: "rag_data", strict: false });
  RagDataModel = mongoConnection.model("RagData", ragDataSchema);
  return RagDataModel;
}

export async function upsertInstructionalPrompt(username, prompt) {
  const RagData = await getRagDataModel();
  const filter = { subject: username, topic: "instructional_prompt" };
  const update = {
    subject: username,
    topic: "instructional_prompt",
    content: prompt,
    contentType: "instructional_prompt",
    type: "instructional_prompt",
    updatedAt: new Date().toISOString(),
  };
  await RagData.updateOne(filter, { $set: update }, { upsert: true });
  return { success: true, message: "Instructional prompt saved" };
}

export async function fetchInstructionalPrompt(username) {
  const RagData = await getRagDataModel();
  const entry = await RagData.findOne({ subject: username, topic: "instructional_prompt" }).lean();
  return entry?.content || "";
}

