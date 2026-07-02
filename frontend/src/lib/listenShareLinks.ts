import {
  BrowserWasmBindings,
  KVService,
  deserializeDelegation,
  serializeDelegation,
  type EncodedShareData,
  type TinyCloudWeb,
} from "@tinycloud/web-sdk";
import { ServiceContext, type ServiceSession } from "@tinycloud/sdk-core";
import type { ApiClient } from "@listen/client";

import {
  normalizeTranscript,
  normalizeConversationMetadata,
  type TinyCloudKv,
} from "./tinycloudConversations";
import { resolveAppKvPath } from "./appManifest";

const SHARE_FORMAT = "listen.share";
const SHARE_VERSION = 2;
const SHARE_TOKEN_PREFIX = "ls1:";
const STORAGE_KEY = "listen:shared-with-me:v1";
const DEFAULT_SHARE_DURATION_DAYS = 7;
const SESSION_EXPIRY_SAFETY_MS = 60 * 1000;
const BASE64_AUDIO_STORAGE_ENCODING = "base64-string-kv";

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

interface ListenShareSnapshot {
  conversation: ShareableConversationDetail["conversation"];
  participants: unknown[];
  transcript: unknown;
}

export interface ListenSharePayload {
  format: typeof SHARE_FORMAT;
  version: typeof SHARE_VERSION;
  id: string;
  conversationId: string;
  title: string;
  createdAt: string;
  expiresAt: string;
  snapshot: EncodedShareData;
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
    typeof (parsed as ListenSharePayload).id !== "string" ||
    !(parsed as ListenSharePayload).snapshot ||
    typeof (parsed as ListenSharePayload).snapshot !== "object"
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
          (item as StoredListenShare).version === SHARE_VERSION &&
          Boolean((item as StoredListenShare).snapshot) &&
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

function effectiveShareExpiry(requested: Date, sessionExpiry: Date | null): Date {
  if (!sessionExpiry || sessionExpiry.getTime() <= Date.now()) return requested;
  return sessionExpiry.getTime() < requested.getTime() ? sessionExpiry : requested;
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

export function hasShareableAudio(detail: ShareableConversationDetail | null): boolean {
  return detail ? audioDataKey(detail) != null : false;
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

function shareId(conversationId: string): string {
  const random =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${conversationId}:${random}`;
}

function safePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-");
}

function snapshotPath(conversationId: string, id: string): string {
  return resolveAppKvPath(`shares/${safePathSegment(conversationId)}/${safePathSegment(id)}.json`);
}

function snapshotForDetail(
  detail: ShareableConversationDetail,
  options: CreateListenShareOptions,
): ListenShareSnapshot {
  const transcript =
    needsLegacyTranscriptKvGrant(detail) && !options.includeTranscript ? null : detail.transcript;
  const metadata = normalizeConversationMetadata(detail.conversation.metadata);
  delete metadata.audio_playback_url;
  delete metadata.audio_playback_url_source;
  delete metadata.audio_signed_url_expires_at;

  return {
    conversation: {
      ...detail.conversation,
      metadata,
    },
    participants: detail.participants,
    transcript,
  };
}

function readResultData(result: unknown): unknown {
  if (result && typeof result === "object" && "ok" in result) {
    if ((result as { ok?: boolean }).ok === false) {
      const message = (result as { error?: { message?: unknown } }).error?.message;
      throw new Error(typeof message === "string" ? message : "TinyCloud request failed");
    }
    return (result as { data?: unknown }).data;
  }
  return result;
}

function kvData(result: unknown): unknown {
  const data = readResultData(result);
  if (data && typeof data === "object" && "data" in data) {
    return (data as { data?: unknown }).data ?? null;
  }
  return data ?? null;
}

async function putShareSnapshot(
  tcw: TinyCloudWeb,
  path: string,
  snapshot: ListenShareSnapshot,
): Promise<void> {
  const kv = (
    tcw as TinyCloudWeb & {
      kv?: TinyCloudKv & { put?: (key: string, value: string) => Promise<unknown> };
    }
  ).kv;
  if (typeof kv?.put !== "function") {
    throw new Error("TinyCloud KV is not available");
  }
  readResultData(await kv.put(path, JSON.stringify(snapshot)));
}

export async function createListenShareLink(
  tcw: TinyCloudWeb,
  detail: ShareableConversationDetail,
  options: CreateListenShareOptions,
): Promise<{ link: string; payload: ListenSharePayload }> {
  const durationDays = normalizeDurationDays(options.durationDays);
  const durationMs = durationDays * 24 * 60 * 60 * 1000;
  const requestedExpiresAt = new Date(Date.now() + durationMs);
  const sessionExpiry = activeSessionExpiry(tcw);
  const expiresAt = effectiveShareExpiry(requestedExpiresAt, sessionExpiry);
  updateSharingSessionExpiry(tcw, sessionExpiry);

  const conversationId = detail.conversation.id;
  const id = shareId(conversationId);
  const path = snapshotPath(conversationId, id);
  await putShareSnapshot(tcw, path, snapshotForDetail(detail, options));

  const snapshotShare = await tcw.sharing.generate({
    path,
    actions: ["tinycloud.kv/get"],
    expiry: expiresAt,
    description: `Listen conversation: ${detail.conversation.title}`,
  });

  if (!snapshotShare.ok) {
    throw new Error(snapshotShare.error.message);
  }

  const snapshot = tcw.sharing.decodeLink(snapshotShare.data.token) as EncodedShareData;
  const snapshotExpiresAt = snapshotShare.data.expiresAt?.toISOString() ?? expiresAt.toISOString();
  const grantDurationMs = Math.max(1, Date.parse(snapshotExpiresAt) - Date.now());
  const delegateDid = snapshot.keyDid.split("#")[0] ?? snapshot.keyDid;
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
    expiresAt: minIsoDate([snapshotExpiresAt, ...(audio ? [audio.expiresAt] : [])]),
    snapshot,
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
    verificationMethod: share.snapshot.keyDid,
    jwk: share.snapshot.key,
  } as ServiceSession;
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

function parseSnapshot(value: unknown): ListenShareSnapshot {
  const parsed = typeof value === "string" ? (JSON.parse(value) as unknown) : value;
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !(parsed as ListenShareSnapshot).conversation ||
    typeof (parsed as ListenShareSnapshot).conversation !== "object" ||
    !Array.isArray((parsed as ListenShareSnapshot).participants)
  ) {
    throw new Error("Shared conversation data is invalid");
  }
  return parsed as ListenShareSnapshot;
}

async function loadSnapshot(share: StoredListenShare): Promise<ListenShareSnapshot> {
  const kv = await createKv(sessionFromEncodedShare(share.snapshot), share.snapshot.host);
  const value = kvData(await kv.get(share.snapshot.path));
  return parseSnapshot(value);
}

function scrubAudioPlayback(metadata: Record<string, unknown>): Record<string, unknown> {
  const next = normalizeConversationMetadata(metadata);
  delete next.audio_playback_url;
  delete next.audio_playback_url_source;
  delete next.audio_signed_url_expires_at;
  return next;
}

function audioContentType(metadata: Record<string, unknown>): string {
  const raw = metadata.audio_content_type ?? metadata.audioContentType;
  return typeof raw === "string" && raw.trim().length > 0 ? raw : "audio/mpeg";
}

async function resolveSharedAudioMetadata(
  share: StoredListenShare,
  metadata: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const scrubbed = scrubAudioPlayback(metadata);
  if (!share.audio) return scrubbed;

  const audioKey =
    typeof scrubbed.audio_data_kv_key === "string"
      ? resolveAppKvPath(scrubbed.audio_data_kv_key)
      : null;
  if (audioKey !== share.audio.path) return scrubbed;

  try {
    const audioKv = await createKv(
      sessionFromPortableGrant(share, share.audio),
      share.snapshot.host,
    );

    if (scrubbed.audio_storage_encoding === BASE64_AUDIO_STORAGE_ENCODING) {
      const data = kvData(await audioKv.get(share.audio.path));
      if (typeof data === "string" && data.length > 0) {
        return {
          ...scrubbed,
          audio_playback_url: `data:${audioContentType(scrubbed)};base64,${data}`,
          audio_playback_url_source: "tinycloud-shared-kv",
        };
      }
      return scrubbed;
    }

    if (typeof audioKv.createSignedReadUrl === "function") {
      const signedResult = await audioKv.createSignedReadUrl(share.audio.path);
      const signedData = readResultData(signedResult) as { url?: unknown; expiresAt?: unknown };
      if (typeof signedData?.url === "string" && signedData.url.length > 0) {
        return {
          ...scrubbed,
          audio_playback_url: signedData.url,
          audio_signed_url_expires_at: signedData.expiresAt,
          audio_playback_url_source: "tinycloud-shared-signed-kv",
        };
      }
    }
  } catch {
    return scrubbed;
  }

  return scrubbed;
}

export async function loadSharedConversationDetail(share: StoredListenShare) {
  const snapshot = await loadSnapshot(share);
  const metadata = await resolveSharedAudioMetadata(share, snapshot.conversation.metadata);
  return {
    conversation: {
      ...snapshot.conversation,
      metadata,
    },
    participants: snapshot.participants,
    transcript: snapshot.transcript == null ? null : normalizeTranscript(snapshot.transcript),
  };
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
