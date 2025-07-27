import { type NextRequest, NextResponse } from "next/server"
import { upsertRagEntry, getBatchEmbeddings } from "@/lib/rag-data"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const userId = (formData.get("userId") as string) || "anonymous"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Read file content
    const buffer = await file.arrayBuffer()
    const content = new TextDecoder().decode(buffer)

    // Generate unique ID for the document
    const documentId = `${userId}-${file.name}-${Date.now()}`

    // Create metadata
    const metadata = {
      filename: file.name,
      fileType: file.type,
      fileSize: file.size,
      userId: userId,
      uploadDate: new Date().toISOString(),
      content: content,
      documentOrigin: file.name,
    }

    // Generate embedding for the content
    const embeddings = await getBatchEmbeddings([content])
    const embedding = embeddings[0]

    // Store in Pinecone
    await upsertRagEntry(documentId, embedding, metadata)

    return NextResponse.json({
      success: true,
      documentId,
      message: "Document uploaded and processed successfully",
    })
  } catch (error) {
    console.error("Document upload error:", error)
    return NextResponse.json({ error: "Failed to process document" }, { status: 500 })
  }
}
