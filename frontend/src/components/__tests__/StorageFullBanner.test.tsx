import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { STORAGE_READ_ONLY_MESSAGE, STORAGE_READ_ONLY_TITLE } from "@listen/core";
import { StorageFullBanner } from "../StorageFullBanner";
import { clearStorageFull, markStorageFull } from "../../lib/storageStatus";

describe("StorageFullBanner", () => {
  afterEach(() => {
    cleanup();
    clearStorageFull();
  });

  it("shows the read-only notice while storage is full and hides it once cleared", () => {
    render(<StorageFullBanner />);
    expect(screen.queryByTestId("storage-full-banner")).not.toBeInTheDocument();

    act(() => markStorageFull());

    const banner = screen.getByTestId("storage-full-banner");
    expect(banner).toHaveTextContent(`${STORAGE_READ_ONLY_TITLE} ${STORAGE_READ_ONLY_MESSAGE}`);
    expect(screen.getByRole("link", { name: "Manage storage" })).toHaveAttribute(
      "href",
      "https://account.tinycloud.xyz/billing",
    );

    act(() => clearStorageFull());

    expect(screen.queryByTestId("storage-full-banner")).not.toBeInTheDocument();
  });
});
