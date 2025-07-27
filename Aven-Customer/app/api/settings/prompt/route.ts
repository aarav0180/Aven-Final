import { type NextRequest, NextResponse } from "next/server"
import { upsertInstructionalPrompt, fetchInstructionalPrompt } from "@/lib/rag-data"

export async function POST(request: NextRequest) {
  try {
    const { userId, prompt } = await request.json()

    if (!userId || !prompt) {
      return NextResponse.json({ error: "User ID and prompt required" }, { status: 400 })
    }

    const result = await upsertInstructionalPrompt(userId, prompt)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Prompt save error:", error)
    return NextResponse.json({ error: "Failed to save prompt" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    const prompt = await fetchInstructionalPrompt(userId)

    return NextResponse.json({
      success: true,
      prompt,
    })
  } catch (error) {
    console.error("Prompt fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch prompt" }, { status: 500 })
  }
}
