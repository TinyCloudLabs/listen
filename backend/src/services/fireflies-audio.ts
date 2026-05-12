import type { DelegatedAccess } from "@listen/server";
import { Buffer } from "node:buffer";

const MAX_AUDIO_BYTES = 50 * 1024 * 1024;

export interface DownloadedAudio {
  bytes: ArrayBuffer;
  contentType: string;
  sizeBytes: number;
}

export interface StoredAudioMetadata {
  audio_data_kv_key: string;
  audio_metadata_kv_key: string;
  audio_content_type: string;
  audio_size_bytes: number;
  audio_stored_at: string;
  audio_storage_encoding: "base64-string-kv";
}

export interface StoreAudioOptions {
  sourceUrl?: string;
}

export async function downloadAudio(
  url: string,
  apiKey: string,
  maxBytes = MAX_AUDIO_BYTES,
): Promise<DownloadedAudio> {
  let response = await fetch(url);
  if (response.status === 401 || response.status === 403) {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
  }

  if (!response.ok) {
    throw new Error(`Fireflies audio fetch failed: ${response.status} ${response.statusText}`);
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    const size = Number(contentLength);
    if (Number.isFinite(size) && size > maxBytes) {
      throw new Error(`Fireflies audio is too large to import (${size} bytes)`);
    }
  }

  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > maxBytes) {
    throw new Error(`Fireflies audio is too large to import (${bytes.byteLength} bytes)`);
  }

  return {
    bytes,
    contentType: response.headers.get("content-type") ?? "audio/mpeg",
    sizeBytes: bytes.byteLength,
  };
}

export async function storeAudio(
  access: DelegatedAccess,
  conversationId: string,
  audio: DownloadedAudio,
  options: StoreAudioOptions = {},
): Promise<StoredAudioMetadata> {
  const dataKey = `audio/${conversationId}/recording.base64`;
  const metadataKey = `audio/${conversationId}/recording.json`;
  const storedAt = new Date().toISOString();

  // TC-1366 fallback: current TinyCloud KV serializes non-string values as JSON,
  // so raw object storage must wait for TC-1368 signed URL/raw object support.
  await access.kv.put(dataKey, Buffer.from(audio.bytes).toString("base64"));
  await access.kv.put(
    metadataKey,
    JSON.stringify({
      dataKey,
      contentType: audio.contentType,
      sizeBytes: audio.sizeBytes,
      storedAt,
      storage: {
        type: "string-kv",
        encoding: "base64",
        interimUntil: "TC-1368",
      },
      source: {
        provider: "fireflies",
        audioUrl: options.sourceUrl ?? null,
      },
    }),
  );

  return {
    audio_data_kv_key: dataKey,
    audio_metadata_kv_key: metadataKey,
    audio_content_type: audio.contentType,
    audio_size_bytes: audio.sizeBytes,
    audio_stored_at: storedAt,
    audio_storage_encoding: "base64-string-kv",
  };
}
