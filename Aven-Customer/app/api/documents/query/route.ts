import { type NextRequest, NextResponse } from "next/server"
import { queryRagEntries, getBatchEmbeddings } from "@/lib/rag-data"

export async function POST(request: NextRequest) {
  try {
    const { query, userId, topK = 5 } = await request.json()

    if (!query) {
      return NextResponse.json({ error: "Query text required" }, { status: 400 })
    }

    // Generate embedding for the query
    const embeddings = await getBatchEmbeddings([query])
    const queryEmbedding = embeddings[0]

    // Search in Pinecone with user filter
    const filter = userId ? { userId: userId } : {}
    const results = await queryRagEntries(queryEmbedding, topK, filter)

    return NextResponse.json({
      success: true,
      results: results.map((match: any) => ({
        id: match.id,
        score: match.score,
        content: match.metadata?.content || "",
        filename: match.metadata?.filename || "",
        documentTitle: match.metadata?.document_title || "",
      })),
    })
  } catch (error) {
    console.error("Document query error:", error)
    return NextResponse.json({ error: "Failed to query documents" }, { status: 500 })
  }
}
