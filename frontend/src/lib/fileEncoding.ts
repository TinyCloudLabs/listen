// Media files travel to the backend as base64 inside a JSON body capped at
// 25 MB (backend/src/index.ts); base64 inflates ~4/3, so files above ~18 MB
// cannot fit. Reject them before encoding instead of after a long upload.
export const MAX_TRANSCRIPTION_FILE_BYTES = 18 * 1024 * 1024;

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.ceil(bytes / 1024)} KB`;
}

export async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  let binary = "";
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
  return btoa(binary);
}
