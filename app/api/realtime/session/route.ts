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
  if (!process.env.GEMINI_API_KEY) return Response.json({ error: "Verba is missing its server API configuration. Add GEMINI_API_KEY and restart the app." }, { status: 503 });
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > maxBodyLength) return Response.json({ error: "The session request was too large." }, { status: 413 });

  let settings: unknown;
  try { settings = await request.json(); } catch { return Response.json({ error: "Please choose valid learning settings and try again." }, { status: 400 }); }
  if (!isSettings(settings)) return Response.json({ error: "Please choose valid learning settings and try again." }, { status: 400 });

  try {
    const expiresAt = new Date(Date.now() + 25 * 60 * 1000).toISOString();
    const newSessionExpiresAt = new Date(Date.now() + 60 * 1000).toISOString();
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/auth_tokens", {
      method: "POST",
      headers: { "x-goog-api-key": process.env.GEMINI_API_KEY, "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ uses: 1, expireTime: expiresAt, newSessionExpireTime: newSessionExpiresAt })
    });
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok || !data || typeof data !== "object") return Response.json({ error: "We couldn't create a voice session. Please check your API access and try again." }, { status: 502 });
    const secret = (data as { name?: unknown }).name;
    if (typeof secret !== "string") return Response.json({ error: "The voice provider returned an invalid session credential." }, { status: 502 });
    return Response.json({ clientSecret: secret, instructions: createTutorInstructions(settings) }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "We couldn't reach the voice service. Check your connection and try again." }, { status: 502 }); }
}
