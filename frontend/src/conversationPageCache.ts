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

export type ConversationCacheScope = string | null | undefined;

function normalizeCacheScope(scope: ConversationCacheScope): string | null {
  const normalized = scope?.trim().toLowerCase();
  return normalized ? encodeURIComponent(normalized) : null;
}

export function conversationPageCacheKey(path: string, scope?: ConversationCacheScope): string {
  const normalizedScope = normalizeCacheScope(scope);
  if (normalizedScope) return `${CONVERSATION_PAGE_CACHE_PREFIX}${normalizedScope}:${path}`;
  return `${CONVERSATION_PAGE_CACHE_PREFIX}${path}`;
}

export function conversationDetailCacheKey(id: string, scope?: ConversationCacheScope): string {
  const normalizedScope = normalizeCacheScope(scope);
  if (normalizedScope) return `${CONVERSATION_DETAIL_CACHE_PREFIX}${normalizedScope}:${id}`;
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

export function readConversationPageCache<T>(
  path: string,
  scope?: ConversationCacheScope,
): ConversationPageCacheEntry<T> | null {
  const storage = getStorage();
  if (!storage) return null;
  const key = conversationPageCacheKey(path, scope);

  try {
    const raw = storage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ConversationPageCacheEntry<T>>;
    if (!Array.isArray(parsed.conversations) || typeof parsed.total !== "number") {
      storage.removeItem(key);
      return null;
    }

    return {
      conversations: parsed.conversations,
      total: parsed.total,
      source_counts: Array.isArray(parsed.source_counts) ? parsed.source_counts : undefined,
      cachedAt: typeof parsed.cachedAt === "string" ? parsed.cachedAt : "",
    };
  } catch {
    storage.removeItem(key);
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
  scope?: ConversationCacheScope,
): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(
      conversationPageCacheKey(path, scope),
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

export function readConversationDetailCache<T>(
  id: string,
  scope?: ConversationCacheScope,
): ConversationDetailCacheEntry<T> | null {
  const storage = getStorage();
  if (!storage) return null;
  const key = conversationDetailCacheKey(id, scope);

  try {
    const raw = storage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ConversationDetailCacheEntry<T>>;
    if (!parsed || typeof parsed !== "object" || !("data" in parsed)) {
      storage.removeItem(key);
      return null;
    }

    return {
      data: parsed.data as T,
      cachedAt: typeof parsed.cachedAt === "string" ? parsed.cachedAt : "",
    };
  } catch {
    storage.removeItem(key);
    return null;
  }
}

export function writeConversationDetailCache<T>(
  id: string,
  data: T,
  scope?: ConversationCacheScope,
): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(
      conversationDetailCacheKey(id, scope),
      JSON.stringify({
        data,
        cachedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // Cache writes are best-effort; server reads remain the source of truth.
  }
}
