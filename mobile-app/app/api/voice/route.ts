import { NextRequest, NextResponse } from "next/server";
import { runConversationTurn } from "@/lib/ai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body debe ser JSON." }, { status: 400 });
  }

  if (!body.text || typeof body.text !== "string") {
    return NextResponse.json({ error: "Falta 'text' en el body." }, { status: 400 });
  }

  try {
    const result = await runConversationTurn(body.text);
    return NextResponse.json({
      response_text: result.responseText,
      tool_calls: result.toolCalls,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    // Nunca dejar al cliente esperando en silencio (Sección 10 de la spec).
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
