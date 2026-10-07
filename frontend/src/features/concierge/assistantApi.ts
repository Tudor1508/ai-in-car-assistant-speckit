import { apiRequest, apiRequestAudio, apiRequestBlob } from "@/lib/api/client";

export type AssistantReply = { text: string; language: string; is_demo: false };
export type AssistantConversationMessage = { role: "user" | "assistant"; text: string };
export type AssistantStatus = {
  enabled: boolean;
  availability: "available" | "temporarily_unavailable";
};

export function getAssistantStatus() {
  return apiRequest<AssistantStatus>("/assistant/status");
}

export function askAssistant(question: string, locale: "ro" | "en", history: AssistantConversationMessage[] = []) {
  return apiRequest<{ reply: AssistantReply }>("/assistant/messages", "POST", { question, locale, history });
}

export function requestAssistantSpeech(text: string, language: string, signal?: AbortSignal) {
  return apiRequestBlob("/assistant/speech", { text, language }, signal);
}

export function transcribeAssistantAudio(audio: Blob, signal?: AbortSignal) {
  return apiRequestAudio<{ text: string }>("/assistant/transcriptions", audio, signal);
}
