import {
  BrowserWasmBindings,
  KVService,
  deserializeDelegation,
  serializeDelegation,
  type EncodedShareData,
  type TinyCloudWeb,
} from "@tinycloud/web-sdk";
import { ServiceContext, SQLService, type ServiceSession } from "@tinycloud/sdk-core";
import type { ApiClient } from "@listen/client";

import {
  DATABASE_NAME,
  getConversationDetailFromAccess,
  normalizeConversationMetadata,
  type TinyCloudKv,
  type TinyCloudSql,
} from "./tinycloudConversations";
import { resolveAppKvPath } from "./appManifest";

const SHARE_FORMAT = "listen.share";
const SHARE_VERSION = 1;
const SHARE_TOKEN_PREFIX = "ls1:";
const STORAGE_KEY = "listen:shared-with-me:v1";
const DEFAULT_SHARE_DURATION_DAYS = 7;
const SESSION_EXPIRY_SAFETY_MS = 60 * 1000;

export interface ShareableConversationDetail {
  conversation: {
    id: string;
    title: string;
    source: string;
    source_url: string | null;
    started_at: string | null;
    ended_at?: string | null;
    duration_secs: number | null;
    summary: string | null;
    transcript_json?: unknown;
    transcript_text?: string | null;
    metadata: Record<string, unknown>;
    created_at?: string;
    updated_at?: string;
  };
  participants: unknown[];
  transcript: unknown;
}

interface PortableGrant {
  path: string;
  serialized: string;
  expiresAt: string;
}

export interface ListenSharePayload {
  format: typeof SHARE_FORMAT;
  version: typeof SHARE_VERSION;
  id: string;
  conversationId: string;
  title: string;
  createdAt: string;
  expiresAt: string;
  sql: EncodedShareData;
  transcript?: PortableGrant;
  audio?: PortableGrant;
}

export interface StoredListenShare extends ListenSharePayload {
  acceptedAt: string;
  token: string;
}

export interface CreateListenShareOptions {
  includeTranscript: boolean;
  includeAudio: boolean;
  durationDays?: number;
}

function base64UrlEncode(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): string {
  let base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodePayload(payload: ListenSharePayload): string {
  return `${SHARE_TOKEN_PREFIX}${base64UrlEncode(JSON.stringify(payload))}`;
}

export function decodeListenShareToken(token: string): ListenSharePayload {
  const value = token.trim();
  if (!value.startsWith(SHARE_TOKEN_PREFIX)) {
    throw new Error("Invalid Listen share link");
  }

  const parsed = JSON.parse(base64UrlDecode(value.slice(SHARE_TOKEN_PREFIX.length))) as unknown;
  if (
    !parsed ||
    typeof parsed !== "object" ||
    (parsed as ListenSharePayload).format !== SHARE_FORMAT ||
    (parsed as ListenSharePayload).version !== SHARE_VERSION ||
    typeof (parsed as ListenSharePayload).conversationId !== "string" ||
    typeof (parsed as ListenSharePayload).id !== "string"
  ) {
    throw new Error("Unsupported Listen share link");
  }

  return parsed as ListenSharePayload;
}

export function readShareTokenFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash;
  if (!hash.startsWith("#share=")) return null;
  const value = hash.slice("#share=".length);
  return value ? decodeURIComponent(value) : null;
}

function shareLinkForToken(token: string): string {
  const url = new URL(window.location.href);
  url.hash = `share=${encodeURIComponent(token)}`;
  return url.toString();
}

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function listStoredListenShares(): StoredListenShare[] {
  const store = storage();
  if (!store) return [];

  try {
    const parsed = JSON.parse(store.getItem(STORAGE_KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is StoredListenShare =>
        Boolean(
          item &&
          typeof item === "object" &&
          (item as StoredListenShare).format === SHARE_FORMAT &&
          typeof (item as StoredListenShare).token === "string",
        ),
      )
      .filter((item) => new Date(item.expiresAt).getTime() > Date.now())
      .sort((a, b) => Date.parse(b.acceptedAt) - Date.parse(a.acceptedAt));
  } catch {
    return [];
  }
}

function writeStoredListenShares(shares: StoredListenShare[]): void {
  const store = storage();
  if (!store) return;
  store.setItem(STORAGE_KEY, JSON.stringify(shares));
}

export function saveListenShareToken(token: string): StoredListenShare {
  const payload = decodeListenShareToken(token);
  if (new Date(payload.expiresAt).getTime() <= Date.now()) {
    throw new Error("This share link has expired");
  }

  const share: StoredListenShare = {
    ...payload,
    acceptedAt: new Date().toISOString(),
    token,
  };
  const existing = listStoredListenShares().filter((item) => item.id !== share.id);
  writeStoredListenShares([share, ...existing]);
  return share;
}

export function removeStoredListenShare(id: string): void {
  writeStoredListenShares(listStoredListenShares().filter((item) => item.id !== id));
}

function normalizeDurationDays(value?: number): number {
  if (value == null || !Number.isFinite(value) || value <= 0) return DEFAULT_SHARE_DURATION_DAYS;
  return Math.min(365, Math.max(1, Math.round(value)));
}

function sessionExpiryFromSiwe(siwe?: string): Date | null {
  const match = siwe?.match(/^Expiration Time:\s*(.+)$/im);
  if (!match?.[1]) return null;

  const expiry = new Date(match[1].trim());
  return Number.isFinite(expiry.getTime()) ? expiry : null;
}

function activeSessionExpiry(tcw: TinyCloudWeb): Date | null {
  const session = tcw.session?.();
  const expiry = sessionExpiryFromSiwe(session?.siwe);
  if (!expiry) return null;

  const safeExpiry = new Date(expiry.getTime() - SESSION_EXPIRY_SAFETY_MS);
  return safeExpiry.getTime() > Date.now() ? safeExpiry : expiry;
}

function updateSharingSessionExpiry(tcw: TinyCloudWeb, expiry: Date | null): void {
  const sharing = tcw.sharing as { updateConfig?: (config: { sessionExpiry: Date }) => void };
  if (!expiry || typeof sharing.updateConfig !== "function") return;
  sharing.updateConfig({ sessionExpiry: expiry });
}

function audioDataKey(detail: ShareableConversationDetail): string | null {
  const metadata = normalizeConversationMetadata(detail.conversation.metadata);
  const raw = metadata.audio_data_kv_key ?? metadata.audio_kv_key;
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

export function hasSqlTranscript(detail: ShareableConversationDetail | null): boolean {
  return detail?.conversation.transcript_json != null;
}

export function needsLegacyTranscriptKvGrant(detail: ShareableConversationDetail | null): boolean {
  return Boolean(detail?.transcript != null && !hasSqlTranscript(detail));
}

async function delegateKvRead(
  tcw: TinyCloudWeb,
  delegateDid: string,
  path: string,
  durationMs: number,
): Promise<PortableGrant> {
  const result = await tcw.delegateTo(
    delegateDid,
    [
      {
        service: "tinycloud.kv",
        path,
        actions: ["get"],
        skipPrefix: true,
      },
    ],
    { expiry: durationMs },
  );

  return {
    path,
    serialized: serializeDelegation(result.delegation),
    expiresAt: result.delegation.expiry.toISOString(),
  };
}

function minIsoDate(values: string[]): string {
  const min = Math.min(...values.map((value) => Date.parse(value)).filter(Number.isFinite));
  return new Date(min).toISOString();
}

export async function createListenShareLink(
  tcw: TinyCloudWeb,
  detail: ShareableConversationDetail,
  options: CreateListenShareOptions,
): Promise<{ link: string; payload: ListenSharePayload }> {
  const durationDays = normalizeDurationDays(options.durationDays);
  const durationMs = durationDays * 24 * 60 * 60 * 1000;
  const requestedExpiresAt = new Date(Date.now() + durationMs);
  updateSharingSessionExpiry(tcw, activeSessionExpiry(tcw));
  const sqlShare = await tcw.sharing.generate({
    path: DATABASE_NAME,
    actions: ["tinycloud.sql/read"],
    expiry: requestedExpiresAt,
    description: `Listen conversation: ${detail.conversation.title}`,
  });

  if (!sqlShare.ok) {
    throw new Error(sqlShare.error.message);
  }

  const sql = tcw.sharing.decodeLink(sqlShare.data.token) as EncodedShareData;
  const sqlExpiresAt = sqlShare.data.expiresAt?.toISOString() ?? requestedExpiresAt.toISOString();
  const grantDurationMs = Math.max(1, Date.parse(sqlExpiresAt) - Date.now());
  const delegateDid = sql.keyDid.split("#")[0] ?? sql.keyDid;
  const conversationId = detail.conversation.id;
  const transcript =
    options.includeTranscript && needsLegacyTranscriptKvGrant(detail)
      ? await delegateKvRead(
          tcw,
          delegateDid,
          resolveAppKvPath(`transcript/${conversationId}`),
          grantDurationMs,
        )
      : undefined;
  const audioKey = options.includeAudio ? audioDataKey(detail) : null;
  const audio = audioKey
    ? await delegateKvRead(tcw, delegateDid, resolveAppKvPath(audioKey), grantDurationMs)
    : undefined;

  const payload: ListenSharePayload = {
    format: SHARE_FORMAT,
    version: SHARE_VERSION,
    id: `${conversationId}:${Date.now().toString(36)}`,
    conversationId,
    title: detail.conversation.title,
    createdAt: new Date().toISOString(),
    expiresAt: minIsoDate([
      sqlExpiresAt,
      ...(transcript ? [transcript.expiresAt] : []),
      ...(audio ? [audio.expiresAt] : []),
    ]),
    sql,
    ...(transcript ? { transcript } : {}),
    ...(audio ? { audio } : {}),
  };
  const token = encodePayload(payload);

  return {
    link: shareLinkForToken(token),
    payload,
  };
}

let wasmPromise: Promise<BrowserWasmBindings> | null = null;

async function browserWasm(): Promise<BrowserWasmBindings> {
  if (!wasmPromise) {
    wasmPromise = (async () => {
      const wasm = new BrowserWasmBindings();
      await wasm.ensureInitialized();
      return wasm;
    })();
  }
  return wasmPromise;
}

function authHeader(value: unknown, fallbackCid: string): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const header = (value as { Authorization?: unknown }).Authorization;
    if (typeof header === "string") return header;
  }
  return `Bearer ${fallbackCid}`;
}

function sessionFromEncodedShare(data: EncodedShareData): ServiceSession {
  const delegation = data.delegation as { authHeader?: unknown; cid: string };
  return {
    delegationHeader: { Authorization: authHeader(delegation.authHeader, delegation.cid) },
    delegationCid: delegation.cid,
    spaceId: data.spaceId,
    verificationMethod: data.keyDid,
    jwk: data.key,
  } as ServiceSession;
}

function sessionFromPortableGrant(share: StoredListenShare, grant: PortableGrant): ServiceSession {
  const delegation = deserializeDelegation(grant.serialized);
  return {
    delegationHeader: delegation.delegationHeader,
    delegationCid: delegation.cid,
    spaceId: delegation.spaceId,
    verificationMethod: share.sql.keyDid,
    jwk: share.sql.key,
  } as ServiceSession;
}

async function createSql(session: ServiceSession, host: string): Promise<TinyCloudSql> {
  const wasm = await browserWasm();
  const context = new ServiceContext({
    invoke: wasm.invoke,
    fetch: globalThis.fetch.bind(globalThis),
    hosts: [host],
  });
  context.setSession(session);
  const sql = new SQLService({});
  sql.initialize(context);
  const scoped = sql as SQLService & { db?: (name: string) => TinyCloudSql };
  return typeof scoped.db === "function" ? scoped.db(DATABASE_NAME) : sql;
}

async function createKv(session: ServiceSession, host: string): Promise<TinyCloudKv> {
  const wasm = await browserWasm();
  const context = new ServiceContext({
    invoke: wasm.invoke,
    fetch: globalThis.fetch.bind(globalThis),
    hosts: [host],
  });
  context.setSession(session);
  const kv = new KVService({ prefix: "" });
  kv.initialize(context);
  return kv;
}

async function createSharedAccess(share: StoredListenShare) {
  const sql = await createSql(sessionFromEncodedShare(share.sql), share.sql.host);
  const transcriptKv = share.transcript
    ? await createKv(sessionFromPortableGrant(share, share.transcript), share.sql.host)
    : null;
  const audioKv = share.audio
    ? await createKv(sessionFromPortableGrant(share, share.audio), share.sql.host)
    : null;

  const kv: TinyCloudKv = {
    async get(key: string) {
      if (share.transcript && transcriptKv && key === share.transcript.path) {
        return transcriptKv.get(key);
      }
      if (share.audio && audioKv && key === share.audio.path) {
        return audioKv.get(key);
      }
      return { ok: true, data: { data: null } };
    },
    async createSignedReadUrl(key: string) {
      if (share.audio && audioKv?.createSignedReadUrl && key === share.audio.path) {
        return audioKv.createSignedReadUrl(key);
      }
      throw new Error("Audio was not included in this share");
    },
  };

  return { sql, kv };
}

export async function loadSharedConversationDetail(share: StoredListenShare) {
  const access = await createSharedAccess(share);
  const detail = await getConversationDetailFromAccess(access, share.conversationId);
  if (!share.audio) {
    const metadata = normalizeConversationMetadata(detail.conversation.metadata);
    delete metadata.audio_playback_url;
    delete metadata.audio_playback_url_source;
    detail.conversation.metadata = metadata;
  }
  return detail;
}

export function createSharedConversationApi(share: StoredListenShare): ApiClient {
  return {
    async get<T>(path: string): Promise<T> {
      const url = new URL(path, "https://listen.local");
      const match = url.pathname.match(/^\/api\/conversations\/([^/]+)$/);
      const id = match?.[1] ? decodeURIComponent(match[1]) : null;
      if (!id || id !== share.conversationId) {
        throw new Error("This share only grants access to one conversation");
      }

      return (await loadSharedConversationDetail(share)) as T;
    },
    async post<T>(): Promise<T> {
      throw new Error("Shared conversations are read-only");
    },
    async put<T>(): Promise<T> {
      throw new Error("Shared conversations are read-only");
    },
    async del<T>(): Promise<T> {
      throw new Error("Shared conversations are read-only");
    },
  };
}
