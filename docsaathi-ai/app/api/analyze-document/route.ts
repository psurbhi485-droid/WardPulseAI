import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import type { DocumentAnalysis, AnalyzeDocumentRequest } from "@/types";

function getClient(): GoogleGenerativeAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }
  return new GoogleGenerativeAI(key);
}

function buildAnalysisPrompt(language: string, languageCode: string): string {
  return `You are DocSaathi AI, a helpful Pan-India document understanding assistant.

Analyze the uploaded document and provide a comprehensive explanation in ${language} (language code: ${languageCode}).

CRITICAL RULES:
- Respond ONLY in ${language} language. All fields must be in ${language}.
- Do NOT invent or fabricate information not present in the document.
- If information for a section is not available in the document, say so explicitly.
- Be clear, simple, and easy to understand for a common Indian citizen.
- Use plain language, avoid legal/bureaucratic jargon.

Respond with ONLY a valid JSON object (no markdown, no code blocks) in this exact structure:
{
  "title": "Document title",
  "category": "One of: government | education | financial | legal | healthcare | employment | personal | other",
  "summary": "One paragraph plain-language summary",
  "explanation": "Detailed 2-3 paragraph explanation of what this document is, its purpose, and what the person needs to know",
  "importantDates": [
    {"title": "Date label", "content": "Date and what it means", "priority": "high|medium|low"}
  ],
  "feesAndPayments": [
    {"title": "Fee label", "content": "Amount and payment details", "priority": "high|medium|low"}
  ],
  "eligibility": [
    {"title": "Eligibility criterion", "content": "Details", "priority": "high|medium|low"}
  ],
  "requiredDocuments": [
    {"title": "Document name", "content": "Why it is needed and where to get it", "priority": "high|medium|low"}
  ],
  "warnings": [
    {"title": "Warning heading", "content": "Warning details - only real warnings from the document", "priority": "high|medium|low"}
  ],
  "checklist": [
    {"id": "1", "text": "Action step in plain language", "completed": false, "priority": "urgent|normal"}
  ],
  "language": "${language}"
}

If a section has no applicable items, return an empty array [].
The checklist should have concrete, actionable steps (3-8 items) derived from the document.`;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: AnalyzeDocumentRequest = await req.json();
    const { fileData, mimeType, language, languageCode } = body;

    if (!fileData || !mimeType) {
      return NextResponse.json(
        { success: false, error: "Missing fileData or mimeType." },
        { status: 400 }
      );
    }

    const client = getClient();
    const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = buildAnalysisPrompt(language, languageCode);

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: fileData,
              },
            },
            { text: prompt },
          ],
        },
      ],
    });

    const responseText = result.response.text().trim();

    // Strip markdown code fences if present
    const jsonText = responseText
      .replace(/^```(?:json)?\n?/, "")
      .replace(/\n?```$/, "")
      .trim();

    let analysis: DocumentAnalysis;
    try {
      analysis = JSON.parse(jsonText);
    } catch {
      console.error("Failed to parse Gemini response as JSON:", jsonText.slice(0, 500));
      return NextResponse.json(
        { success: false, error: "The AI returned an unexpected response format. Please try again." },
        { status: 502 }
      );
    }

    // Ensure all required fields are present
    analysis.importantDates = analysis.importantDates ?? [];
    analysis.feesAndPayments = analysis.feesAndPayments ?? [];
    analysis.eligibility = analysis.eligibility ?? [];
    analysis.requiredDocuments = analysis.requiredDocuments ?? [];
    analysis.warnings = analysis.warnings ?? [];
    analysis.checklist = (analysis.checklist ?? []).map((item, i) => ({
      ...item,
      id: item.id ?? String(i + 1),
      completed: false,
    }));

    return NextResponse.json({ success: true, analysis });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error occurred.";
    console.error("Document analysis error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
