import type { DelegatedAccess } from "@listen/server";
import { Buffer } from "node:buffer";

const MAX_AUDIO_BYTES = 50 * 1024 * 1024;

export interface DownloadedAudio {
  bytes: ArrayBuffer;
  contentType: string;
  sizeBytes: number;
}

export interface StoredAudioMetadata {
  audio_kv_key: string;
  audio_content_type: string;
  audio_size_bytes: number;
  audio_stored_at: string;
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
): Promise<StoredAudioMetadata> {
  const kvKey = `audio/${conversationId}`;
  const payload = JSON.stringify({
    contentType: audio.contentType,
    sizeBytes: audio.sizeBytes,
    base64: Buffer.from(audio.bytes).toString("base64"),
  });

  await access.kv.put(kvKey, payload);

  return {
    audio_kv_key: kvKey,
    audio_content_type: audio.contentType,
    audio_size_bytes: audio.sizeBytes,
    audio_stored_at: new Date().toISOString(),
  };
}
