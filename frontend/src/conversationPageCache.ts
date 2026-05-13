export interface ConversationPageCacheEntry<T> {
  conversations: T[];
  total: number;
  cachedAt: string;
}

export const CONVERSATION_PAGE_CACHE_PREFIX = "listen:conversation-page:v1:";

export function conversationPageCacheKey(path: string): string {
  return `${CONVERSATION_PAGE_CACHE_PREFIX}${path}`;
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readConversationPageCache<T>(path: string): ConversationPageCacheEntry<T> | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(conversationPageCacheKey(path));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ConversationPageCacheEntry<T>>;
    if (!Array.isArray(parsed.conversations) || typeof parsed.total !== "number") {
      storage.removeItem(conversationPageCacheKey(path));
      return null;
    }

    return {
      conversations: parsed.conversations,
      total: parsed.total,
      cachedAt: typeof parsed.cachedAt === "string" ? parsed.cachedAt : "",
    };
  } catch {
    storage.removeItem(conversationPageCacheKey(path));
    return null;
  }
}

export function writeConversationPageCache<T>(
  path: string,
  data: { conversations: T[]; total: number },
): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(
      conversationPageCacheKey(path),
      JSON.stringify({
        conversations: data.conversations,
        total: data.total,
        cachedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // Cache writes are best-effort; server reads remain the source of truth.
  }
}
