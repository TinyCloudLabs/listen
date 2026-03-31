import type { FullTranscript } from "../services/fireflies-client.js";
import type { NormalizeFn } from "./types.js";

// ── Fireflies → NormalizedConversation adapter ─────────────────────

export const normalizeFireflies: NormalizeFn<FullTranscript> = (raw) => {
  const startedAt = new Date(raw.date).toISOString();
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
  // Fireflies API duration unit is undocumented. Empirically returns minutes
  // (e.g. 30 for a 30-minute meeting), so we convert to seconds.
  const durationSecs = Math.round(raw.duration * 60);
  console.log(`[adapter] duration raw=${raw.duration} → ${durationSecs}s for "${raw.title}"`);
  const endedAt = new Date(raw.date + durationSecs * 1000).toISOString();
<<<<<<< HEAD

  // Build a lookup from attendee displayName → email for best-effort matching
  const emailByName = new Map<string, string>();
  for (const attendee of raw.meeting_attendees ?? []) {
=======
  const endedAt = new Date(raw.date + raw.duration * 1000).toISOString();

  // Build a lookup from attendee displayName → email for best-effort matching
  const emailByName = new Map<string, string>();
  for (const attendee of raw.meeting_attendees) {
>>>>>>> bac670e (TC-1300: Add NormalizedConversation types and Fireflies adapter)
=======

  // Build a lookup from attendee displayName → email for best-effort matching
  const emailByName = new Map<string, string>();
<<<<<<< HEAD
  for (const attendee of (raw.meeting_attendees ?? [])) {
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
=======
  for (const attendee of raw.meeting_attendees ?? []) {
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
    emailByName.set(attendee.displayName, attendee.email);
  }

  // Deduplicate speakers by name, keeping the first occurrence
  const seenNames = new Set<string>();
<<<<<<< HEAD
<<<<<<< HEAD
  const uniqueSpeakers = (raw.speakers ?? []).filter((speaker) => {
=======
  const uniqueSpeakers = raw.speakers.filter((speaker) => {
>>>>>>> bac670e (TC-1300: Add NormalizedConversation types and Fireflies adapter)
=======
  const uniqueSpeakers = (raw.speakers ?? []).filter((speaker) => {
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
    if (seenNames.has(speaker.name)) return false;
    seenNames.add(speaker.name);
    return true;
  });

<<<<<<< HEAD
<<<<<<< HEAD
  const summary = raw.summary ?? {};

=======
>>>>>>> bac670e (TC-1300: Add NormalizedConversation types and Fireflies adapter)
=======
  const summary = raw.summary ?? {};

>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
  return {
    conversation: {
      id: crypto.randomUUID(),
      title: raw.title,
      source: "fireflies",
      source_id: raw.id,
      source_url: raw.transcript_url,
      started_at: startedAt,
      ended_at: endedAt,
<<<<<<< HEAD
<<<<<<< HEAD
      duration_secs: durationSecs,
      summary: summary.overview ?? null,
      metadata: {
        audio_url: raw.audio_url,
        organizer_email: raw.organizer_email,
        keywords: summary.keywords ?? [],
        meeting_type: summary.meeting_type ?? null,
=======
      duration_secs: raw.duration,
      summary: raw.summary.overview,
      metadata: {
        audio_url: raw.audio_url,
        organizer_email: raw.organizer_email,
        keywords: raw.summary.keywords,
        meeting_type: raw.summary.meeting_type,
>>>>>>> bac670e (TC-1300: Add NormalizedConversation types and Fireflies adapter)
=======
      duration_secs: durationSecs,
      summary: summary.overview ?? null,
      metadata: {
        audio_url: raw.audio_url,
        organizer_email: raw.organizer_email,
        keywords: summary.keywords ?? [],
        meeting_type: summary.meeting_type ?? null,
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
      },
    },
    participants: uniqueSpeakers.map((speaker) => ({
      id: crypto.randomUUID(),
      name: speaker.name,
      email: emailByName.get(speaker.name) ?? null,
      speaker_label: speaker.id,
    })),
<<<<<<< HEAD
<<<<<<< HEAD
    transcript: raw.sentences ?? [],
=======
    transcript: raw.sentences,
>>>>>>> bac670e (TC-1300: Add NormalizedConversation types and Fireflies adapter)
=======
    transcript: raw.sentences ?? [],
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
  };
};
