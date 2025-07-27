import { type NextRequest, NextResponse } from "next/server"
import { getRagDataModel } from "@/lib/rag-data"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId") || "anonymous"


    const RagData = await getRagDataModel();
    const documents = await RagData.find({
      userId: userId,
      type: { $ne: "instructional_prompt" },
    }).lean();

    return NextResponse.json({
      success: true,
      documents: documents.map((doc: any) => ({
        id: doc._id,
        name: doc.filename,
        type: doc.fileType,
        size: doc.fileSize,
        uploadDate: doc.uploadDate,
      })),
    })
  } catch (error) {
    console.error("Document list error:", error)
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 })
  }
}
