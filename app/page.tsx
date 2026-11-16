"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { RealtimeClient, type TranscriptTurn } from "./lib/realtimeClient";
import { explanationLanguages, levels, modes, type LearningSettings } from "./lib/tutorInstructions";
import { readVocabulary, writeVocabulary, type VocabularyItem } from "./lib/vocabularyStorage";

const initialSettings: LearningSettings = { language: "English", level: "Intermediate", mode: "Vocabulary" };

export default function Home() {
  const [settings, setSettings] = useState<LearningSettings>(initialSettings);
  const [status, setStatus] = useState("Disconnected");
  const [notice, setNotice] = useState("");
  const [turns, setTurns] = useState<TranscriptTurn[]>([]);
  const [message, setMessage] = useState("");
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>(() => readVocabulary());
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ word: "", meaning: "", example: "", pronunciation: "" });
  const client = useRef<RealtimeClient | null>(null);

  useEffect(() => () => client.current?.disconnect(), []);
  function addTurn(turn: TranscriptTurn) { setTurns(current => current.some(item => item.id === turn.id) ? current : [...current, turn]); }
  async function startConversation() {
    if (client.current || status === "Connecting") return;
    setNotice(""); setTurns([]); const connection = new RealtimeClient({ onStatus: setStatus, onError: message => { setNotice(message); connection.disconnect(); }, onTranscript: addTurn });
    client.current = connection;
    try { await connection.connect(settings); } catch (error) { setNotice(error instanceof Error ? error.message : "We couldn't start the conversation."); connection.disconnect(); client.current = null; }
  }
  function endConversation() { client.current?.disconnect(); client.current = null; }
  function sendMessage(event: FormEvent) { event.preventDefault(); const text = message.trim(); if (!text) return; try { client.current?.sendText(text); setMessage(""); } catch (error) { setNotice(error instanceof Error ? error.message : "Message not sent."); } }
  function saveWord(event: FormEvent) { event.preventDefault(); if (!draft.word.trim() || !draft.meaning.trim() || !draft.example.trim()) return; const item: VocabularyItem = { id: crypto.randomUUID(), word: draft.word.trim(), meaning: draft.meaning.trim(), example: draft.example.trim(), pronunciation: draft.pronunciation.trim() || undefined, savedAt: new Date().toISOString() }; const next = [item, ...vocabulary]; setVocabulary(next); writeVocabulary(next); setDraft({ word: "", meaning: "", example: "", pronunciation: "" }); setShowAdd(false); }
  function removeWord(id: string) { const next = vocabulary.filter(item => item.id !== id); setVocabulary(next); writeVocabulary(next); }
  const active = status === "Listening" || status === "Connected";
  return <main>
    <header><a className="brand" href="#top" aria-label="Verba home">verba<span>·</span></a><p>Find your words. Find your voice.</p><div className="privacy">Saved words stay in this browser</div></header>
    <section className="hero" id="top"><div><p className="eyebrow">English, in your own voice</p><h1>Words become yours when you use them.</h1><p className="intro">Practise vocabulary through a conversation that meets you at your level.</p></div><div className="orb" aria-hidden="true"><i /><i /><i /></div></section>
    <section className="workspace" aria-label="Learning workspace">
      <aside className="settings"><h2>Make it yours</h2><label>Explain in<select value={settings.language} onChange={event => setSettings({ ...settings, language: event.target.value as LearningSettings["language"] })} disabled={active}>{explanationLanguages.map(language => <option key={language}>{language}</option>)}</select></label><label>Your level<select value={settings.level} onChange={event => setSettings({ ...settings, level: event.target.value as LearningSettings["level"] })} disabled={active}>{levels.map(level => <option key={level}>{level}</option>)}</select></label><fieldset disabled={active}><legend>How would you like to learn?</legend>{modes.map(mode => <label className="mode" key={mode}><input type="radio" name="mode" checked={settings.mode === mode} onChange={() => setSettings({ ...settings, mode })} /><span><strong>{mode}</strong><small>{mode === "Vocabulary" ? "Discover useful everyday words" : mode === "Conversation" ? "Speak naturally in English" : "Recall and reuse saved words"}</small></span></label>)}</fieldset></aside>
      <section className="conversation"><div className="conversationHead"><div><span className={`dot ${status.toLowerCase()}`} /> <span aria-live="polite">{status}</span></div>{active && <button className="quietButton" onClick={endConversation}>End conversation</button>}</div><div className="voiceStage">{!active ? <><div className="micRing"><span>⌁</span></div><h2>Ready when you are.</h2><p>Start a voice conversation, or type once you&apos;re connected.</p><button className="startButton" onClick={startConversation} disabled={status === "Connecting"}>{status === "Connecting" ? "Connecting…" : "Start speaking"}</button></> : <><div className="listeningMark"><span /><span /><span /><span /><span /></div><h2>I&apos;m listening.</h2><p>Speak naturally — pauses are welcome.</p></>}</div>{notice && <p className="notice" role="alert">{notice}</p>}<div className="transcript" aria-live="polite">{turns.length === 0 && active && <p className="emptyTranscript">Your conversation will appear here.</p>}{turns.map(turn => <article className={`turn ${turn.role}`} key={turn.id}><span>{turn.role === "user" ? "You" : "Verba"}</span><p>{turn.text}</p></article>)}</div><form className="messageForm" onSubmit={sendMessage}><label className="srOnly" htmlFor="message">Type a message</label><input id="message" value={message} onChange={event => setMessage(event.target.value)} placeholder={active ? "Type a message…" : "Start a conversation to type"} disabled={!active} /><button aria-label="Send message" disabled={!active || !message.trim()}>↑</button></form></section>
    </section>
    <section className="vocabulary"><div className="vocabHead"><div><p className="eyebrow">Your word shelf</p><h2>Keep the words you want to keep.</h2></div><button className="addButton" onClick={() => setShowAdd(true)}>+ Add a word</button></div>{showAdd && <form className="addForm" onSubmit={saveWord}><label>Word<input autoFocus value={draft.word} onChange={event => setDraft({ ...draft, word: event.target.value })} required /></label><label>Meaning<input value={draft.meaning} onChange={event => setDraft({ ...draft, meaning: event.target.value })} required /></label><label>Example sentence<input value={draft.example} onChange={event => setDraft({ ...draft, example: event.target.value })} required /></label><label>Pronunciation <em>(optional)</em><input value={draft.pronunciation} onChange={event => setDraft({ ...draft, pronunciation: event.target.value })} /></label><button className="startButton">Save word</button><button type="button" className="quietButton" onClick={() => setShowAdd(false)}>Cancel</button></form>}{vocabulary.length ? <div className="wordGrid">{vocabulary.map(item => <article className="wordCard" key={item.id}><button onClick={() => removeWord(item.id)} aria-label={`Remove ${item.word}`}>×</button><h3>{item.word}</h3>{item.pronunciation && <p className="pronunciation">{item.pronunciation}</p>}<p>{item.meaning}</p><blockquote>“{item.example}”</blockquote></article>)}</div> : !showAdd && <div className="emptyWords"><span>✦</span><p>Your saved words will live here.</p><small>They’re saved only in this browser, and never synced elsewhere.</small></div>}</section>
    <footer>Verba is a learning companion, not a replacement for a teacher.</footer>
  </main>;
}
