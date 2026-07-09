import type { DelegatedAccess } from "@listen/server";
import type { GranolaNote } from "./granola-client.js";
import { normalizeGranola } from "../adapters/granola.js";
import { persistConversation, updateConversationFromNormalized } from "./persist-conversation.js";

export interface GranolaSyncResult {
  status: "created" | "updated" | "error";
  noteId: string;
  conversationId?: string;
  title?: string;
  startedAt?: string | null;
  error?: string;
}

export async function persistGranolaNote(
  note: GranolaNote,
  access: DelegatedAccess,
  existingConversationId?: string,
): Promise<GranolaSyncResult> {
  try {
    const normalized = normalizeGranola(note);
    if (existingConversationId) {
      await updateConversationFromNormalized(access, existingConversationId, normalized);
      return {
        status: "updated",
        noteId: note.id,
        conversationId: existingConversationId,
        title: normalized.conversation.title ?? undefined,
        startedAt: normalized.conversation.started_at,
      };
    }

    await persistConversation(access, normalized);
    return {
      status: "created",
      noteId: note.id,
      conversationId: normalized.conversation.id,
      title: normalized.conversation.title ?? undefined,
      startedAt: normalized.conversation.started_at,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: "error", noteId: note.id, error: message };
  }
}
