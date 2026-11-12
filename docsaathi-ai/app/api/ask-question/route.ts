import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import type { AskQuestionRequest } from "@/types";

function getClient(): GoogleGenerativeAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY environment variable is not set.");
  return new GoogleGenerativeAI(key);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: AskQuestionRequest = await req.json();
    const { question, documentContext, language, languageCode, conversationHistory } = body;

    if (!question?.trim() || !documentContext) {
      return NextResponse.json(
        { success: false, error: "Missing question or document context." },
        { status: 400 }
      );
    }

    const client = getClient();
    const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Build history for chat context
    const historyMessages = conversationHistory.slice(-8).map((msg) => ({
      role: msg.role === "user" ? "user" as const : "model" as const,
      parts: [{ text: msg.content }],
    }));

    const systemPrompt = `You are DocSaathi AI, an expert Pan-India document assistant.

DOCUMENT CONTEXT (the uploaded document analysis):
${documentContext}

RULES:
- Answer ONLY in ${language} (language code: ${languageCode}).
- Base your answers ONLY on the document context provided above.
- If the answer is not available in the document, say "This information is not available in the uploaded document."
- Do NOT fabricate information.
- Be clear, helpful and use simple language for a common Indian citizen.
- If the question is unrelated to the document, politely redirect to document-related questions.
- Format your answer clearly with paragraphs. Use bullet points when listing items.`;

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "Understood! I will answer questions strictly based on the uploaded document in the specified language." }] },
        ...historyMessages,
      ],
    });

    const result = await chat.sendMessage(question);
    const answer = result.response.text();

    return NextResponse.json({ success: true, answer });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error occurred.";
    console.error("Ask question error:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
