import { NextRequest } from "next/server";
import { createTutorInstructions, explanationLanguages, levels, modes, type LearningSettings } from "../../../lib/tutorInstructions";

export const runtime = "nodejs";
const maxBodyLength = 8_000;

function isSettings(value: unknown): value is LearningSettings {
  if (!value || typeof value !== "object") return false;
  const settings = value as Record<string, unknown>;
  return explanationLanguages.includes(settings.language as LearningSettings["language"]) && levels.includes(settings.level as LearningSettings["level"]) && modes.includes(settings.mode as LearningSettings["mode"]);
}

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) return Response.json({ error: "Verba is missing its server API configuration. Add OPENAI_API_KEY and restart the app." }, { status: 503 });
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > maxBodyLength) return Response.json({ error: "The session request was too large." }, { status: 413 });

  let settings: unknown;
  try { settings = await request.json(); } catch { return Response.json({ error: "Please choose valid learning settings and try again." }, { status: 400 }); }
  if (!isSettings(settings)) return Response.json({ error: "Please choose valid learning settings and try again." }, { status: 400 });

  try {
    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ session: { type: "realtime", model: "gpt-realtime-2.1", audio: { output: { voice: "marin" } }, instructions: createTutorInstructions(settings) } })
    });
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok || !data || typeof data !== "object") return Response.json({ error: "We couldn't create a voice session. Please check your API access and try again." }, { status: 502 });
    const secret = (data as { value?: unknown }).value;
    if (typeof secret !== "string") return Response.json({ error: "The voice provider returned an invalid session credential." }, { status: 502 });
    return Response.json({ clientSecret: secret }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "We couldn't reach the voice service. Check your connection and try again." }, { status: 502 }); }
}
