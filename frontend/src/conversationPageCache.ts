export interface ConversationPageCacheEntry<T> {
  conversations: T[];
  total: number;
  source_counts?: Array<{ source: string; total: number }>;
  cachedAt: string;
}

export interface ConversationDetailCacheEntry<T> {
  data: T;
  cachedAt: string;
}

export const CONVERSATION_PAGE_CACHE_PREFIX = "listen:conversation-page:v1:";
export const CONVERSATION_DETAIL_CACHE_PREFIX = "listen:conversation-detail:v1:";

export function conversationPageCacheKey(path: string): string {
  return `${CONVERSATION_PAGE_CACHE_PREFIX}${path}`;
}

export function conversationDetailCacheKey(id: string): string {
  return `${CONVERSATION_DETAIL_CACHE_PREFIX}${id}`;
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
      source_counts: Array.isArray(parsed.source_counts) ? parsed.source_counts : undefined,
      cachedAt: typeof parsed.cachedAt === "string" ? parsed.cachedAt : "",
    };
  } catch {
    storage.removeItem(conversationPageCacheKey(path));
    return null;
  }
}

export function writeConversationPageCache<T>(
  path: string,
  data: {
    conversations: T[];
    total: number;
    source_counts?: Array<{ source: string; total: number }>;
  },
): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(
      conversationPageCacheKey(path),
      JSON.stringify({
        conversations: data.conversations,
        total: data.total,
        source_counts: data.source_counts,
        cachedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // Cache writes are best-effort; server reads remain the source of truth.
  }
}

export function readConversationDetailCache<T>(id: string): ConversationDetailCacheEntry<T> | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(conversationDetailCacheKey(id));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ConversationDetailCacheEntry<T>>;
    if (!parsed || typeof parsed !== "object" || !("data" in parsed)) {
      storage.removeItem(conversationDetailCacheKey(id));
      return null;
    }

    return {
      data: parsed.data as T,
      cachedAt: typeof parsed.cachedAt === "string" ? parsed.cachedAt : "",
    };
  } catch {
    storage.removeItem(conversationDetailCacheKey(id));
    return null;
  }
}

export function writeConversationDetailCache<T>(id: string, data: T): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(
      conversationDetailCacheKey(id),
      JSON.stringify({
        data,
        cachedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // Cache writes are best-effort; server reads remain the source of truth.
  }
}
