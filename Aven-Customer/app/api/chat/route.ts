import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    // For now, just echo the prompt or return a canned response
    // Replace this with your OpenRouter/LLM integration as needed
    return NextResponse.json({
      success: true,
      response: `Echo: ${prompt}`
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
