"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, IconButton, Paper, Stack, TextField, Typography } from "@mui/material";
import { askAssistant, getAssistantStatus, transcribeAssistantAudio, type AssistantConversationMessage, type AssistantStatus } from "../assistantApi";

type Message = { id: string; role: "user" | "assistant"; text: string; language?: string; failed?: boolean };

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

const MAX_CONTEXT_MESSAGES = 10;
const MAX_CONTEXT_MESSAGE_CHARACTERS = 4000;
const MAX_TOTAL_CONTEXT_CHARACTERS = 8000;
const MAX_RECORDING_BYTES = 25 * 1024 * 1024;

function boundedHistory(messages: Message[], currentQuestion: string): AssistantConversationMessage[] {
  let remaining = MAX_TOTAL_CONTEXT_CHARACTERS - currentQuestion.length;
  const selected: AssistantConversationMessage[] = [];
  const omittedPrefix = "[Earlier portion omitted]\n";
  const truncateTail = (text: string, maximum: number) => maximum <= omittedPrefix.length
    ? text.slice(-maximum)
    : `${omittedPrefix}${text.slice(-(maximum - omittedPrefix.length))}`;
  for (const message of messages.slice(-MAX_CONTEXT_MESSAGES).reverse()) {
    if (remaining <= 0) break;
    let text = message.text.trim();
    if (text.length > MAX_CONTEXT_MESSAGE_CHARACTERS) {
      text = truncateTail(text, MAX_CONTEXT_MESSAGE_CHARACTERS);
    }
    if (text.length > remaining) {
      text = truncateTail(text, remaining);
    }
    selected.unshift({ role: message.role, text });
    remaining -= text.length;
  }
  return selected;
}

export function TravelConcierge() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<AssistantStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusChecked, setStatusChecked] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingError, setRecordingError] = useState("");
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [transcriptionConsentGranted, setTranscriptionConsentGranted] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [playbackError, setPlaybackError] = useState("");
  const [activeSpeech, setActiveSpeech] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const transcriptionAbortRef = useRef<AbortController | null>(null);
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);
  const messagesContentRef = useRef<HTMLDivElement | null>(null);
  const openRef = useRef(open);
  const pendingRequestRef = useRef(false);
  const speechRequestRef = useRef(0);
  const latestAnswer = [...messages].reverse().find((message) => message.role === "assistant");
  const locale: "ro" | "en" = typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("ro") ? "ro" : "en";

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    setRecording(false);
  }

  async function transcribeRecording(audio: Blob) {
    const controller = new AbortController();
    transcriptionAbortRef.current = controller;
    setTranscribing(true);
    setRecordingError("");
    try {
      const result = await transcribeAssistantAudio(audio, controller.signal);
      if (!openRef.current || controller.signal.aborted) return;
      const transcript = result.text.trim();
      if (!transcript) throw new Error("empty_transcript");
      setDraft((current) => `${current.trim()} ${transcript}`.trim());
    } catch {
      if (!controller.signal.aborted) {
        setRecordingError("Transcription failed. Your typed question is still available; you can try recording again.");
      }
    } finally {
      if (transcriptionAbortRef.current === controller) transcriptionAbortRef.current = null;
      setTranscribing(false);
    }
  }

  function acceptTranscriptionConsent() {
    if (!recordedAudio) return;
    const audio = recordedAudio;
    setTranscriptionConsentGranted(true);
    setRecordedAudio(null);
    void transcribeRecording(audio);
  }

  function discardRecordedAudio() {
    setRecordedAudio(null);
    setRecordingError("Recording discarded. You can type your question or record again.");
  }

  function stopPlayback() {
    speechRequestRef.current += 1;
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setActiveSpeech(null);
  }

  function closeChat() {
    openRef.current = false;
    const recorder = mediaRecorderRef.current;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.onerror = null;
      if (recorder.state !== "inactive") recorder.stop();
      mediaRecorderRef.current = null;
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    audioChunksRef.current = [];
    transcriptionAbortRef.current?.abort();
    transcriptionAbortRef.current = null;
    setRecordedAudio(null);
    setTranscriptionConsentGranted(false);
    setRecording(false);
    stopPlayback();
    setOpen(false);
  }

  useEffect(() => () => {
    const recorder = mediaRecorderRef.current;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.onerror = null;
      if (recorder.state !== "inactive") recorder.stop();
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    transcriptionAbortRef.current?.abort();
    speechRequestRef.current += 1;
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, []);

  useEffect(() => { openRef.current = open; }, [open]);

  useEffect(() => {
    if (!open) return;
    const viewport = messagesViewportRef.current;
    const content = messagesContentRef.current;
    if (!viewport || !content) return;
    const scrollToLatest = () => { viewport.scrollTop = viewport.scrollHeight; };
    scrollToLatest();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scrollToLatest);
    observer?.observe(content);
    return () => observer?.disconnect();
  }, [open, messages, pending, error, recordingError]);

  useEffect(() => {
    if (!open || statusChecked || statusLoading) return;
    setStatusLoading(true);
    getAssistantStatus()
      .then(setStatus)
      .catch(() => setError("Assistant availability could not be checked. Please try again later."))
      .finally(() => { setStatusLoading(false); setStatusChecked(true); });
  }, [open, statusChecked, statusLoading]);

  async function startRecording() {
    setRecordingError("");
    setRecordedAudio(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder === "undefined") {
      setRecordingError("Audio recording is unavailable in this browser. You can still type your question.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!openRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      const preferredType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : undefined;
      const recorder = preferredType
        ? new MediaRecorder(stream, { mimeType: preferredType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setRecording(false);
        setRecordingError("Recording failed. You can still type your question.");
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
      };
      recorder.onstop = () => {
        mediaRecorderRef.current = null;
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        setRecording(false);
        const audio = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        audioChunksRef.current = [];
        if (!openRef.current) return;
        if (!audio.size) {
          setRecordingError("No audio was recorded. You can still type your question or try again.");
        } else if (audio.size > MAX_RECORDING_BYTES) {
          setRecordingError("This recording is too large to transcribe. Record a shorter question or type it instead.");
        } else if (transcriptionConsentGranted) {
          void transcribeRecording(audio);
        } else {
          setRecordedAudio(audio);
        }
      };
      recorder.start();
      setRecording(true);
    } catch (cause) {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
      const name = cause instanceof DOMException ? cause.name : "";
      setRecordingError(name === "NotAllowedError" || name === "SecurityError"
        ? "Microphone permission was denied. You can still type your question."
        : name === "NotFoundError"
          ? "No microphone is available. You can still type your question."
          : "Recording could not start. You can still type your question or try again.");
    }
  }

  async function submitQuestion(question: string, existingMessageId?: string) {
    if (!question || pendingRequestRef.current || status?.enabled !== true) return;
    pendingRequestRef.current = true;
    const existingIndex = existingMessageId ? messages.findIndex((message) => message.id === existingMessageId) : -1;
    const history = boundedHistory(existingIndex >= 0 ? messages.slice(0, existingIndex) : messages, question);
    stopPlayback();
    setError("");
    setPending(true);
    let messageId = existingMessageId;
    if (messageId) {
      setMessages((current) => current.map((message) => message.id === messageId ? { ...message, failed: false } : message));
    } else {
      messageId = newId();
      setDraft("");
      const userMessage: Message = { id: messageId, role: "user", text: question };
      setMessages((current) => [...current, userMessage]);
    }
    try {
      const result = await askAssistant(question, locale, history);
      setMessages((current) => [...current, { id: newId(), role: "assistant", text: result.reply.text, language: result.reply.language }]);
    } catch {
      const failedMessageId = messageId;
      setMessages((current) => current.map((message) => message.id === failedMessageId ? { ...message, failed: true } : message));
    } finally {
      pendingRequestRef.current = false;
      setPending(false);
    }
  }

  function sendQuestion() {
    void submitQuestion(draft.trim());
  }

  function play(message: Message) {
    setPlaybackError("");
    if (activeSpeech === message.id) {
      stopPlayback();
      return;
    }
    if (!message.language) {
      setPlaybackError("The answer language could not be determined, so matching speech is unavailable. The written answer is still available.");
      return;
    }
    const synthesis = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    if (!synthesis || typeof window.SpeechSynthesisUtterance === "undefined") {
      setPlaybackError("Speech playback is unavailable in this browser. The written answer is still available.");
      return;
    }
    const requestId = ++speechRequestRef.current;
    synthesis.cancel();
    setActiveSpeech(message.id);
    const desiredLanguage = message.language;
    const voices = synthesis.getVoices();
    const languagePrefix = desiredLanguage.toLowerCase().split("-")[0];
    const voice = voices.find((item) => item.lang.toLowerCase() === desiredLanguage.toLowerCase())
      ?? voices.find((item) => item.lang.toLowerCase().split("-")[0] === languagePrefix);
    const utterance = new window.SpeechSynthesisUtterance(message.text);
    utterance.lang = desiredLanguage;
    if (voice) utterance.voice = voice;
    utterance.onend = () => { if (requestId === speechRequestRef.current) setActiveSpeech(null); };
    utterance.onerror = () => {
      if (requestId === speechRequestRef.current) {
        setActiveSpeech(null);
        setPlaybackError("Speech playback failed. The written answer is still available.");
      }
    };
    try {
      synthesis.speak(utterance);
    } catch {
      if (requestId === speechRequestRef.current) {
        setActiveSpeech(null);
        setPlaybackError("Speech playback is unavailable in this browser. The written answer is still available.");
      }
    }
  }

  return <>
    {!open && <IconButton aria-label="Open Drivewise Assistant" onClick={() => setOpen(true)} sx={{ position: "fixed", zIndex: 1300, right: 24, bottom: 24, width: 60, height: 60, color: "#071827", bgcolor: "#58dced", boxShadow: 6, "&:hover": { bgcolor: "#77e8f4" } }}>✦</IconButton>}
    {open && <Paper role="dialog" aria-label="Drivewise Assistant" elevation={16} sx={{ position: "fixed", zIndex: 1300, right: { xs: 8, sm: 24 }, bottom: { xs: 8, sm: 24 }, width: { xs: "calc(100vw - 16px)", sm: 304 }, height: { xs: "min(78dvh, 560px)", sm: 416 }, maxHeight: "calc(100dvh - 16px)", display: "flex", flexDirection: "column", bgcolor: "#0d1b2a", color: "white", border: "1px solid #4ca8b7", borderRadius: 3, overflow: "hidden" }}>
      <Stack direction="row" sx={{ px: 2, py: 1, minHeight: 48, borderBottom: "1px solid #25394b", alignItems: "center", justifyContent: "space-between" }}>
        <Typography sx={{ fontWeight: 800 }}>Drivewise Assistant</Typography>
        <IconButton aria-label="Close chat" onClick={closeChat} sx={{ color: "white", p: 0.5 }}>×</IconButton>
      </Stack>
      <Box ref={messagesViewportRef} data-testid="concierge-messages" aria-live="polite" sx={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", px: 2, py: 1 }}>
        <Box ref={messagesContentRef} sx={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
        {statusLoading && <Typography role="status" sx={{ color: "#58dced" }}>Checking assistant availability…</Typography>}
        {status && !status.enabled && <Alert severity="warning" role="status">The assistant is temporarily unavailable because the OpenAI provider configuration is not ready. Check the backend configuration and try again.</Alert>}
        {statusChecked && !status && <Alert severity="error" role="alert" action={<Button color="inherit" size="small" onClick={() => { setStatusChecked(false); setError(""); }}>Retry</Button>}>Assistant availability could not be checked.</Alert>}
        {messages.length === 0 && <Box sx={{ flex: 1, minHeight: 0, display: "grid", placeItems: "center" }}>
          <Box data-testid="concierge-empty-state" sx={{ px: 2.5, py: 1.5, borderRadius: "22px 22px 22px 6px", bgcolor: "#58dced", border: "1px solid #58dced", color: "#071827", boxShadow: 4, fontSize: "15px", fontWeight: 700, lineHeight: 1.35 }}>Ask me a question</Box>
        </Box>}
        {messages.map((message) => <Stack key={message.id} sx={{ alignItems: message.role === "user" ? "flex-end" : "flex-start", mb: 1 }}>
          <Box data-testid={`${message.role}-message`} sx={{ maxWidth: "88%", p: 1.1, borderRadius: message.role === "user" ? "14px 14px 3px 14px" : "14px 14px 14px 3px", bgcolor: message.role === "user" ? "#21495b" : "#263242", border: message.role === "user" ? "1px solid #438597" : "1px solid #465263", fontSize: "0.78rem", lineHeight: 1.35, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{message.text}</Box>
          {message.role === "user" && message.failed && <Alert severity="error" role="alert" action={<Button color="inherit" size="small" disabled={pending} onClick={() => void submitQuestion(message.text, message.id)}>Retry</Button>} sx={{ mt: 0.5, maxWidth: "92%" }}>The assistant could not answer. Your question is still in the conversation.</Alert>}
        </Stack>)}
        {pending && <Stack sx={{ alignItems: "flex-start", mb: 1 }}>
          <Box data-testid="assistant-loading-bubble" role="status" aria-label="Preparing answer" sx={{ display: "flex", alignItems: "center", gap: 0.75, maxWidth: "88%", px: 1.1, py: 0.8, borderRadius: "14px 14px 14px 3px", bgcolor: "#263242", border: "1px solid #465263", color: "#b9c7d5", fontSize: "0.68rem", lineHeight: 1.3 }}>
            <span>Preparing answer</span>
            <Box component="span" aria-hidden="true" sx={{ display: "inline-flex", gap: "3px", "@keyframes concierge-dot-pulse": { "0%, 60%, 100%": { opacity: 0.3, transform: "translateY(0)" }, "30%": { opacity: 1, transform: "translateY(-2px)" } }, "& span": { width: 3, height: 3, borderRadius: "50%", bgcolor: "#58dced", animation: "concierge-dot-pulse 1.1s infinite ease-in-out" }, "& span:nth-of-type(2)": { animationDelay: "0.15s" }, "& span:nth-of-type(3)": { animationDelay: "0.3s" } }}>
              <span /><span /><span />
            </Box>
          </Box>
        </Stack>}
        {error && <Alert severity="error" role="alert">{error}</Alert>}
        {recordingError && <Alert severity="warning" role="alert">{recordingError}</Alert>}
        </Box>
      </Box>
      <Stack spacing={0.5} sx={{ flexShrink: 0, p: 1, borderTop: "1px solid #25394b" }}>
        {recording && <Alert severity="warning" role="status" sx={{ py: 0 }}>Recording on this device… Press Stop when finished.</Alert>}
        {transcribing && <Typography role="status" sx={{ color: "#58dced", fontSize: "0.72rem" }}>Transcribing your recording…</Typography>}
        {recordedAudio && <Box role="group" aria-labelledby="transcription-consent-title" sx={{ p: 1, bgcolor: "#14283a", border: "1px solid #58dced", borderRadius: 1.5 }}>
          <Typography id="transcription-consent-title" sx={{ color: "white", fontSize: "0.72rem", lineHeight: 1.4, mb: 0.75 }}>
            To transcribe your spoken question, this audio recording will be sent to OpenAI. The transcript will appear in the editable question field and will not be sent until you press Send. This request may incur company charges. Allow this upload? Your consent covers later recordings until you close this chat.
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="contained" onClick={acceptTranscriptionConsent} sx={{ minHeight: 30, textTransform: "none" }}>Allow and transcribe</Button>
            <Button size="small" onClick={discardRecordedAudio} sx={{ minHeight: 30, color: "#b9c7d5", textTransform: "none" }}>No, discard</Button>
          </Stack>
        </Box>}
        {playbackError && <Typography role="alert" sx={{ color: "#ffcc80", fontSize: "0.72rem" }}>{playbackError}</Typography>}
        <Stack data-testid="concierge-composer" direction="row" spacing={0.5} sx={{ alignItems: "center", minWidth: 0 }}>
          <TextField value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendQuestion(); } }} size="small" placeholder="Ask me a question." slotProps={{ htmlInput: { "aria-label": "Travel question" } }} sx={{ flex: 1, minWidth: 0, "& .MuiInputBase-root": { color: "white", fontSize: "0.78rem", height: 34 }, "& .MuiOutlinedInput-notchedOutline": { borderColor: "#3c4a5b" } }} />
          <IconButton aria-label={activeSpeech ? "Stop audio" : "Read latest answer aloud"} disabled={!activeSpeech && !latestAnswer} onClick={() => activeSpeech ? stopPlayback() : latestAnswer && void play(latestAnswer)} sx={{ color: "#58dced", width: 32, height: 34, borderRadius: 1 }}>{activeSpeech ? "■" : "▶"}</IconButton>
          <IconButton onClick={recording ? stopRecording : () => void startRecording()} disabled={transcribing || Boolean(recordedAudio)} aria-label={recording ? "Stop recording" : "Record question"} sx={{ color: "#58dced", width: 32, height: 34, borderRadius: 1 }}>{recording ? "■" : "♩"}</IconButton>
          <Button variant="contained" size="small" disabled={!draft.trim() || pending || statusLoading || status?.enabled !== true} onClick={() => void sendQuestion()} sx={{ minWidth: 50, px: 1, height: 34, borderRadius: 2, fontSize: "0.72rem", textTransform: "none" }}>Send</Button>
        </Stack>
      </Stack>
    </Paper>}
  </>;
}
