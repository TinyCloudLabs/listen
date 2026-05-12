import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SourcesSetup } from "../components/SourcesSetup";
import type { ApiClient } from "@listen/client";
import type { TinyCloudWeb } from "@tinycloud/web-sdk";

function mockApi(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    get: vi.fn().mockResolvedValue({ connected: true }),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
    ...overrides,
  };
}

function mockTinyCloud(): TinyCloudWeb {
  return {
    secrets: {
      unlock: vi.fn().mockResolvedValue({ ok: true }),
      put: vi.fn().mockResolvedValue({ ok: true }),
    },
  } as unknown as TinyCloudWeb;
}

describe("SourcesSetup Granola controls", () => {
  afterEach(() => {
    cleanup();
  });

  it("saves a Granola API key and verifies backend status", async () => {
    const api = mockApi();
    const tcw = mockTinyCloud();
    const ensureGranolaBackendAccess = vi.fn().mockResolvedValue(undefined);
    const onGranolaComplete = vi.fn();

    render(
      <SourcesSetup
        api={api}
        tcw={tcw}
        hasBackendDelegation={true}
        onEnsureBackendAccess={vi.fn()}
        onEnsureFirefliesBackendAccess={vi.fn()}
        onEnsureGranolaBackendAccess={ensureGranolaBackendAccess}
        onFirefliesComplete={vi.fn()}
        onGranolaComplete={onGranolaComplete}
      />,
    );

    await userEvent.click(screen.getAllByRole("button", { name: /connect ->/i })[1]!);
    await userEvent.type(screen.getByPlaceholderText(/paste your granola api key/i), "grn_test");
    await userEvent.click(screen.getByRole("button", { name: /save key and connect/i }));

    expect(tcw.secrets.put).toHaveBeenCalledWith("GRANOLA_API_KEY", "grn_test");
    expect(ensureGranolaBackendAccess).toHaveBeenCalled();
    expect(api.get).toHaveBeenCalledWith("/api/granola/status");
    expect(await screen.findByText(/granola connected/i)).toBeInTheDocument();
  });
});
