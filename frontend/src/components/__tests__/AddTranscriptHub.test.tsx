import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { STORAGE_FULL_SAVE_MESSAGE } from "@listen/core";
import { ApiRequestError, type ApiClient } from "@listen/client";
import { AddTranscriptHub } from "../AddTranscriptHub";
import { clearStorageFull, isStorageFull } from "../../lib/storageStatus";

describe("AddTranscriptHub", () => {
  afterEach(() => {
    cleanup();
    clearStorageFull();
  });

  it("words a storage-refused import with the storage copy and leaves read-only after a save", async () => {
    const post = vi
      .fn()
      .mockRejectedValueOnce(
        new ApiRequestError(
          402,
          "storage_quota_exceeded",
          `API error (402): ${STORAGE_FULL_SAVE_MESSAGE}`,
        ),
      )
      .mockResolvedValueOnce({ conversationId: "01ABC", title: "Standup" });
    const api: ApiClient = { get: vi.fn(), post, put: vi.fn(), del: vi.fn() };
    const onImported = vi.fn();

    render(
      <AddTranscriptHub
        api={api}
        transcriptionReady={{ assemblyai: false, deepgram: false }}
        sourcesConnected={{ fireflies: false, granola: false, soundcore: false, googleMeet: false }}
        onClose={vi.fn()}
        onImported={onImported}
        onOpenSources={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Transcript text"), {
      target: { value: "Dana: The beta build is behind." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import" }));

    expect(await screen.findByText(STORAGE_FULL_SAVE_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(/API error/)).not.toBeInTheDocument();
    expect(isStorageFull()).toBe(true);
    expect(onImported).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Import" }));

    await waitFor(() => expect(onImported).toHaveBeenCalledWith("01ABC"));
    expect(isStorageFull()).toBe(false);
  });
});
