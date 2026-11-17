# Verba

**Find your words. Find your voice.** Verba is a voice-first English vocabulary tutor. It uses the Gemini Live API and secure WebSockets for low-latency conversation, with local-only saved vocabulary.

## Run locally

1. Install Node.js 20.9 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY` to a Gemini API key with Live API access.
4. Run `npm run dev`, then open [http://localhost:3000](http://localhost:3000).
5. Allow microphone access when prompted.

Check the production build with `npm run typecheck`, `npm run lint`, and `npm run build`.

## How it works

The browser asks the server route at `/api/realtime/session` for a short-lived Gemini credential. The route validates learning preferences and uses `GEMINI_API_KEY` only on the server to create it. The browser then establishes a direct Gemini Live WebSocket using that credential. The permanent API key is never returned to the browser.

Choose an explanation language, English level, and learning mode before starting. While connected, use voice or the text field. Ending a conversation closes the peer connection and stops microphone tracks.

Saved vocabulary is stored in the browser's `localStorage`, only on the current device and browser. It is not synced or sent to a database. Use **Add a word** to save vocabulary deliberately.

## Deploy

Deploy as a standard Next.js app (for example, on Vercel). Add `GEMINI_API_KEY` as a server-side environment variable in the hosting provider's secret settings; never expose it as a `NEXT_PUBLIC_` variable.

## Limitations

A valid API key, network access, a WebRTC-capable browser, and microphone permission are required for voice conversation. This repository does not include an API key, and real audio connection tests must be performed in the deployer's browser and account.
