import { useEffect, useMemo, useState, type CSSProperties, type FC } from "react";
import type { ApiClient } from "@listen/client";
import type { TranscriptSentence } from "../TranscriptPane";
import {
  readConversationDetailCache,
  readConversationPageCache,
  writeConversationDetailCache,
  writeConversationPageCache,
} from "../../conversationPageCache";
import { ConnectionsScreen } from "../ConnectionsScreen";
import type { ShellRoute } from "../AppShell";
import { MobileChat, type MobileChatCitation, type MobileChatMessage } from "./MobileChat";
import { MobileDetail, type MobileDetailData, type MobileDetailSentence } from "./MobileDetail";
import { MobileInbox, type MobileInboxItem } from "./MobileInbox";
import { MobileShell, type MobileTab } from "./MobileShell";
import {
  normalizeConversationMetadata,
  normalizeTranscript,
} from "../../lib/tinycloudConversations";

interface ConversationSummary {
  id: string;
  title: string;
  source: string;
  source_url: string | null;
  started_at: string | null;
  duration_secs: number | null;
  summary: string | null;
  metadata?: Record<string, unknown>;
}

interface ConversationsResponse {
  conversations: ConversationSummary[];
  total: number;
}

interface DetailResponse {
  conversation: ConversationSummary;
  transcript: TranscriptSentence[] | null;
}

interface MobileExperienceProps {
  api: ApiClient;
  activeRoute: ShellRoute;
  selectedConversationId: string | null;
  refreshKey: number;
  hasFireflies: boolean;
  hasGranola?: boolean;
  hasSoundcore?: boolean;
  hasGoogleMeet: boolean;
  hasFirefliesBackendAccess: boolean;
  hasGranolaBackendAccess?: boolean;
  hasSoundcoreBackendAccess?: boolean;
  hasAssemblyAIKey?: boolean | null;
  hasAssemblyAIBackendAccess?: boolean | null;
  hasDeepgramKey?: boolean | null;
  hasDeepgramBackendAccess?: boolean | null;
  googleMeetAvailable: boolean;
  chatEnabled: boolean;
  onRouteChange: (route: ShellRoute) => void;
  onSelectConversation: (id: string | null) => void;
  onAddSource: () => void;
  onRefresh: () => void;
}

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "for",
  "from",
  "how",
  "the",
  "this",
  "that",
  "was",
  "were",
  "what",
  "when",
  "where",
  "with",
]);

const MOBILE_CONVERSATIONS_PATH = "/api/conversations?limit=100&offset=0";

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

function sourceLabel(source: string): string {
  switch (source) {
    case "fireflies":
      return "FIREFLIES";
    case "google-meet":
      return "GOOGLE MEET";
    case "manual":
      return "MANUAL";
    case "recorder":
      return "RECORDER";
    case "voice_memos":
      return "VOICE MEMOS";
    case "voxterm":
      return "VOXTERM";
    case "soundcore_sync":
      return "SOUNDCORE";
    default:
      return source.toUpperCase();
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function cleanText(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^[-*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreText(text: string, tokens: string[]): number {
  const lower = text.toLowerCase();
  return tokens.reduce((score, token) => score + (lower.includes(token) ? 1 : 0), 0);
}

function snippetFor(text: string, tokens: string[], max = 150): string {
  const clean = cleanText(text);
  const lower = clean.toLowerCase();
  const firstHit = tokens
    .map((token) => lower.indexOf(token))
    .filter((idx) => idx >= 0)
    .sort((a, b) => a - b)[0];
  const start = firstHit == null ? 0 : Math.max(0, firstHit - 40);
  const snippet = clean.slice(start, start + max);
  return `${start > 0 ? "... " : ""}${snippet}${start + max < clean.length ? " ..." : ""}`;
}

function toMobileItem(conversation: ConversationSummary): MobileInboxItem {
  return {
    id: conversation.id,
    title: conversation.title,
    source: conversation.source,
    startedAt: conversation.started_at,
    durationSecs: conversation.duration_secs,
    preview: conversation.summary,
  };
}

function toMobileDetail(conversation: ConversationSummary): MobileDetailData {
  return {
    id: conversation.id,
    title: conversation.title,
    source: conversation.source,
    startedAt: conversation.started_at,
    durationSecs: conversation.duration_secs,
    summary: conversation.summary,
  };
}

function toMobileTranscript(transcript: TranscriptSentence[] | null): MobileDetailSentence[] {
  return (transcript ?? []).map((line) => ({
    speakerName: line.speaker_name,
    startTime: line.start_time,
    text: line.text,
  }));
}

function normalizeDetailResponse(response: DetailResponse): DetailResponse {
  return {
    ...response,
    conversation: {
      ...response.conversation,
      metadata: normalizeConversationMetadata(response.conversation.metadata),
    },
    transcript: normalizeTranscript(response.transcript),
  };
}

function MobileState({
  title,
  detail,
  action,
}: {
  title: string;
  detail?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div style={stateStyles.root}>
      <div style={stateStyles.card}>
        <h2 style={stateStyles.title}>{title}</h2>
        {detail && <p style={stateStyles.detail}>{detail}</p>}
        {action && (
          <button type="button" style={stateStyles.button} onClick={action.onClick}>
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

export const MobileExperience: FC<MobileExperienceProps> = ({
  api,
  activeRoute,
  selectedConversationId,
  refreshKey,
  hasFireflies,
  hasGranola,
  hasSoundcore,
  hasGoogleMeet,
  hasFirefliesBackendAccess,
  hasGranolaBackendAccess,
  hasSoundcoreBackendAccess,
  hasAssemblyAIKey,
  hasAssemblyAIBackendAccess,
  hasDeepgramKey,
  hasDeepgramBackendAccess,
  googleMeetAvailable,
  chatEnabled,
  onRouteChange,
  onSelectConversation,
  onAddSource,
  onRefresh,
}) => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [conversationError, setConversationError] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatMessages, setChatMessages] = useState<MobileChatMessage[]>([
    {
      id: "intro",
      role: "assistant",
      text: "Ask about synced transcripts. I will search titles, summaries, and transcript text, then cite matching conversations.",
    },
  ]);

  useEffect(() => {
    const cached = readConversationPageCache<ConversationSummary>(MOBILE_CONVERSATIONS_PATH);
    let cancelled = false;

    if (cached) {
      setConversations(cached.conversations);
      setTotal(cached.total);
      setConversationError(null);
      setLoadingConversations(false);
    } else {
      setLoadingConversations(true);
    }

    api
      .get<ConversationsResponse>(MOBILE_CONVERSATIONS_PATH)
      .then((res) => {
        if (cancelled) return;
        const next = {
          conversations: Array.isArray(res.conversations) ? res.conversations : [],
          total: Number.isFinite(res.total) ? res.total : 0,
        };
        setConversations(next.conversations);
        setTotal(next.total);
        writeConversationPageCache(MOBILE_CONVERSATIONS_PATH, next);
        setConversationError(null);
      })
      .catch((err) => {
        if (!cancelled && !cached) {
          setConversationError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingConversations(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, refreshKey]);

  useEffect(() => {
    if (!selectedConversationId) {
      setDetail(null);
      setDetailError(null);
      return;
    }

    const cached = readConversationDetailCache<DetailResponse>(selectedConversationId);
    let cancelled = false;
    setDetailError(null);

    if (cached) {
      setDetail(normalizeDetailResponse(cached.data));
      setLoadingDetail(false);
    } else {
      setDetail(null);
      setLoadingDetail(true);
    }

    api
      .get<DetailResponse>(`/api/conversations/${selectedConversationId}`)
      .then((res) => {
        if (cancelled) return;
        const normalized = normalizeDetailResponse(res);
        setDetail(normalized);
        writeConversationDetailCache(selectedConversationId, normalized);
      })
      .catch((err) => {
        if (!cancelled && !cached) {
          setDetailError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, selectedConversationId]);

  const activeTab: MobileTab =
    activeRoute === "chat" ? "chat" : activeRoute === "connections" ? "connections" : "inbox";

  const sources = useMemo(
    () => ["all", ...Array.from(new Set(conversations.map((item) => item.source)))],
    [conversations],
  );
  const visibleConversations =
    sourceFilter === "all"
      ? conversations
      : conversations.filter((conversation) => conversation.source === sourceFilter);

  const suggestions = useMemo(() => {
    const availableSources = sources.filter((source) => source !== "all").map(sourceLabel);
    return [
      "What did we discuss recently?",
      availableSources[0]
        ? `Find ${availableSources[0].toLowerCase()} follow-ups`
        : "Find follow-ups",
      "Which conversations mention roadmap?",
    ];
  }, [sources]);

  const changeTab = (tab: MobileTab) => {
    onSelectConversation(null);
    onRouteChange(tab);
  };

  const selectSource = (source: string) => {
    setSourceFilter((current) => (current === source || source === "all" ? "all" : source));
  };

  const openConversation = (id: string) => {
    onSelectConversation(id);
    onRouteChange("inbox");
  };

  const getConversationDetail = async (
    conversation: ConversationSummary,
  ): Promise<DetailResponse> => {
    const cached = readConversationDetailCache<DetailResponse>(conversation.id);
    const path = `/api/conversations/${conversation.id}`;

    if (cached) {
      void api
        .get<DetailResponse>(path)
        .then((fresh) => writeConversationDetailCache(conversation.id, fresh))
        .catch(() => {});
      return cached.data;
    }

    const fresh = await api.get<DetailResponse>(path);
    writeConversationDetailCache(conversation.id, fresh);
    return fresh;
  };

  const runSearch = async (query: string) => {
    const tokens = tokenize(query);
    if (tokens.length === 0 || chatBusy) return;

    setChatBusy(true);
    setChatMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text: query }]);

    try {
      const ranked = conversations
        .map((conversation) => {
          const haystack = `${conversation.title} ${conversation.source} ${conversation.summary ?? ""}`;
          return { conversation, score: scoreText(haystack, tokens) };
        })
        .sort((a, b) => b.score - a.score);
      const candidates = (
        ranked.some((item) => item.score > 0) ? ranked.filter((item) => item.score > 0) : ranked
      ).slice(0, 8);

      const details = await Promise.all(
        candidates.map(({ conversation }) =>
          getConversationDetail(conversation).catch(() => ({ conversation, transcript: null })),
        ),
      );

      const citations = details
        .map((item) => {
          const transcriptText =
            item.transcript?.map((line) => `${line.speaker_name}: ${line.text}`).join(" ") ?? "";
          const body = `${item.conversation.title} ${item.conversation.summary ?? ""} ${transcriptText}`;
          if (scoreText(body, tokens) === 0) return null;
          return {
            id: item.conversation.id,
            title: item.conversation.title,
            source: sourceLabel(item.conversation.source),
            date: formatDate(item.conversation.started_at),
            snippet: snippetFor(
              item.conversation.summary || transcriptText || item.conversation.title,
              tokens,
            ),
          };
        })
        .filter((item): item is MobileChatCitation => item !== null)
        .slice(0, 4);

      setChatMessages((prev) => [
        ...prev,
        citations.length === 0
          ? {
              id: `a-${Date.now()}`,
              role: "assistant",
              text: "I did not find a matching transcript. Try a source name, meeting title, participant name, or exact phrase.",
            }
          : {
              id: `a-${Date.now()}`,
              role: "assistant",
              text: `I found ${citations.length} matching transcript${
                citations.length === 1 ? "" : "s"
              }. Open a citation to inspect the source.`,
              citations,
            },
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: err instanceof Error ? err.message : String(err),
        },
      ]);
    } finally {
      setChatBusy(false);
    }
  };

  let content;
  if (selectedConversationId) {
    if (loadingDetail) {
      content = <MobileState title="Loading conversation" />;
    } else if (detailError) {
      content = (
        <MobileState
          title="Could not load conversation"
          detail={detailError}
          action={{ label: "Back to inbox", onClick: () => onSelectConversation(null) }}
        />
      );
    } else if (detail) {
      content = (
        <MobileDetail
          conversation={toMobileDetail(detail.conversation)}
          transcript={toMobileTranscript(detail.transcript)}
          onBack={() => onSelectConversation(null)}
        />
      );
    } else {
      content = <MobileState title="Conversation not found" />;
    }
  } else if (activeTab === "chat") {
    content = chatEnabled ? (
      <MobileChat
        scopeLabel={`All transcripts - ${total}`}
        messages={chatMessages}
        suggestions={suggestions}
        busy={chatBusy || loadingConversations}
        onSend={(text) => void runSearch(text)}
        onSelectSuggestion={(text) => void runSearch(text)}
        onOpenConversation={openConversation}
      />
    ) : (
      <MobileState
        title="Chat is under development."
        detail="Transcript chat is currently in beta and is not available in this workspace yet."
      />
    );
  } else if (activeTab === "connections") {
    content = (
      <ConnectionsScreen
        api={api}
        hasFireflies={hasFireflies}
        hasGranola={hasGranola}
        hasSoundcore={hasSoundcore}
        hasGoogleMeet={hasGoogleMeet}
        hasFirefliesBackendAccess={hasFirefliesBackendAccess}
        hasGranolaBackendAccess={hasGranolaBackendAccess}
        hasSoundcoreBackendAccess={hasSoundcoreBackendAccess}
        hasAssemblyAIKey={hasAssemblyAIKey}
        hasAssemblyAIBackendAccess={hasAssemblyAIBackendAccess}
        hasDeepgramKey={hasDeepgramKey}
        hasDeepgramBackendAccess={hasDeepgramBackendAccess}
        googleMeetAvailable={googleMeetAvailable}
        onAddSource={onAddSource}
        onRefresh={onRefresh}
      />
    );
  } else {
    content = (
      <MobileInbox
        items={visibleConversations.map(toMobileItem)}
        total={total}
        sourceFilter={sourceFilter}
        sources={sources}
        onSelectSource={selectSource}
        onSelectConversation={openConversation}
        onSearch={() => onRouteChange("chat")}
        onAdd={onAddSource}
        loading={loadingConversations}
        error={conversationError}
      />
    );
  }

  return (
    <MobileShell activeTab={activeTab} onTabChange={changeTab}>
      {content}
    </MobileShell>
  );
};

const FONT = "var(--lst-font)";

const stateStyles: Record<string, CSSProperties> = {
  root: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    background: "var(--lst-bg)",
    color: "var(--lst-blue)",
    fontFamily: FONT,
  },
  card: {
    border: "var(--lst-border)",
    padding: 18,
    width: "100%",
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 400,
  },
  detail: {
    margin: "8px 0 0",
    color: "var(--lst-ink-70)",
    fontSize: 13,
    lineHeight: 1.45,
  },
  button: {
    marginTop: 14,
    fontFamily: FONT,
    border: "var(--lst-border)",
    background: "var(--lst-blue)",
    color: "var(--lst-bg)",
    borderRadius: 999,
    padding: "8px 12px",
    cursor: "pointer",
  },
};
