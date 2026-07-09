import type { DelegatedAccess } from "@listen/server";
import { normalizeOtter } from "../adapters/otter.js";
import type { OtterSpeech } from "./otter-client.js";
import { persistConversation, updateConversationFromNormalized } from "./persist-conversation.js";

export interface OtterSyncResult {
  status: "created" | "updated" | "error";
  otid: string;
  conversationId?: string;
  title?: string;
  startedAt?: string | null;
  error?: string;
}

/** Normalize one Otter speech (+ its diarized export) and persist it as a conversation. */
export async function persistOtterSpeech(
  speech: OtterSpeech,
  transcriptTxt: string,
  access: DelegatedAccess,
  existingConversationId?: string,
): Promise<OtterSyncResult> {
  try {
    const normalized = normalizeOtter(speech, transcriptTxt);
    if (existingConversationId) {
      await updateConversationFromNormalized(access, existingConversationId, normalized);
      return {
        status: "updated",
        otid: speech.otid,
        conversationId: existingConversationId,
        title: normalized.conversation.title ?? undefined,
        startedAt: normalized.conversation.started_at,
      };
    }

    await persistConversation(access, normalized);
    return {
      status: "created",
      otid: speech.otid,
      conversationId: normalized.conversation.id,
      title: normalized.conversation.title ?? undefined,
      startedAt: normalized.conversation.started_at,
    };
  } catch (err) {
    return {
      status: "error",
      otid: speech.otid,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
