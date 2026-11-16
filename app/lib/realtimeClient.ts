import type { LearningSettings } from "./tutorInstructions";

export type TranscriptTurn = { id: string; role: "user" | "assistant"; text: string };
type Events = { onStatus: (status: string) => void; onError: (message: string) => void; onTranscript: (turn: TranscriptTurn) => void };

export class RealtimeClient {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private stream: MediaStream | null = null;
  private events: Events;
  constructor(events: Events) { this.events = events; }

  async connect(settings: LearningSettings) {
    if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) throw new Error("Your browser does not support the microphone features Verba needs. Try a current desktop or mobile browser.");
    this.events.onStatus("Connecting");
    const tokenResponse = await fetch("/api/realtime/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
    const tokenData = await tokenResponse.json().catch(() => ({})) as { clientSecret?: string; error?: string };
    if (!tokenResponse.ok || !tokenData.clientSecret) throw new Error(tokenData.error ?? "We couldn't create a secure voice session.");
    try { this.stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { throw new Error("Microphone access was not granted. Allow microphone access in your browser and try again."); }
    const pc = new RTCPeerConnection(); this.peerConnection = pc;
    this.stream.getTracks().forEach(track => pc.addTrack(track, this.stream!));
    const channel = pc.createDataChannel("oai-events"); this.dataChannel = channel;
    channel.addEventListener("open", () => this.events.onStatus("Listening"));
    channel.addEventListener("message", event => this.handleEvent(event.data));
    pc.addEventListener("connectionstatechange", () => {
      if (pc.connectionState === "connected") this.events.onStatus("Listening");
      if (["failed", "disconnected"].includes(pc.connectionState)) this.events.onError("The voice connection was lost. You can start a new conversation.");
      if (pc.connectionState === "closed") this.events.onStatus("Disconnected");
    });
    const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
    const response = await fetch("https://api.openai.com/v1/realtime/calls", { method: "POST", headers: { Authorization: `Bearer ${tokenData.clientSecret}`, "Content-Type": "application/sdp" }, body: offer.sdp });
    if (!response.ok) throw new Error("The voice service could not accept the connection. Please try again.");
    await pc.setRemoteDescription({ type: "answer", sdp: await response.text() });
  }

  sendText(text: string) {
    if (!this.dataChannel || this.dataChannel.readyState !== "open") throw new Error("Connect to a conversation before sending a message.");
    const id = crypto.randomUUID(); this.events.onTranscript({ id, role: "user", text });
    this.dataChannel.send(JSON.stringify({ type: "conversation.item.create", item: { type: "message", role: "user", content: [{ type: "input_text", text }] } }));
    this.dataChannel.send(JSON.stringify({ type: "response.create", response: { output_modalities: ["audio", "text"] } }));
  }
  disconnect() { this.dataChannel?.close(); this.peerConnection?.close(); this.stream?.getTracks().forEach(track => track.stop()); this.dataChannel = null; this.peerConnection = null; this.stream = null; this.events.onStatus("Disconnected"); }
  private handleEvent(raw: unknown) {
    try {
      const event = JSON.parse(String(raw)) as { type?: string; transcript?: string; delta?: string; item_id?: string };
      if (event.type === "conversation.item.input_audio_transcription.completed" && event.transcript) this.events.onTranscript({ id: event.item_id ?? crypto.randomUUID(), role: "user", text: event.transcript });
      if (event.type === "response.output_audio_transcript.done" && event.transcript) this.events.onTranscript({ id: event.item_id ?? crypto.randomUUID(), role: "assistant", text: event.transcript });
      if (event.type === "error") this.events.onError("The voice service reported a problem. Please end the conversation and try again.");
    } catch { /* Ignore non-JSON channel messages. */ }
  }
}
