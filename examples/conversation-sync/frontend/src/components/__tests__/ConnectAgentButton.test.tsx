import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { TinyCloudWeb } from "@tinycloud/web-sdk";

// Mock the named export from @tinyboilerplate/client BEFORE importing the component.
vi.mock("@tinyboilerplate/client", () => ({
  createDelegation: vi.fn(),
}));

import { createDelegation } from "@tinyboilerplate/client";
import { ConnectAgentButton } from "../ConnectAgentButton";

const mockedCreateDelegation = vi.mocked(createDelegation);

const FAKE_SERIALIZED =
  '{"cid":"bafyreitestfixture","delegateDID":"did:pkh:eip155:1:0xAGENT","actions":["tinycloud.kv/get"],"expiry":"2026-12-31T00:00:00.000Z"}';

const VALID_AGENT_DID = "did:pkh:eip155:1:0x1204f2e9f634B5A8c09CA1579d351B99B27faE50";

// Minimal tcw stub — createDelegation() is mocked so tcw's methods aren't called.
const fakeTcw = {} as unknown as TinyCloudWeb;

let fetchMock: ReturnType<typeof vi.fn>;
let onRefresh: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockedCreateDelegation.mockReset();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  onRefresh = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ConnectAgentButton — initial render", () => {
  test("shows the form with an input and both buttons in idle state", () => {
    render(
      <ConnectAgentButton
        tcw={fakeTcw}
        onRefresh={onRefresh}
        refreshLabel="Refresh conversations"
      />,
    );

    expect(screen.getByPlaceholderText(/did:pkh:eip155/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /connect agent/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /refresh conversations/i })).toBeInTheDocument();
  });

  test("Connect button is disabled when input is empty", () => {
    render(<ConnectAgentButton tcw={fakeTcw} onRefresh={onRefresh} />);

    expect(screen.getByRole("button", { name: /connect agent/i })).toBeDisabled();
  });

  test("refresh button is hidden when onRefresh is not provided", () => {
    render(<ConnectAgentButton tcw={fakeTcw} />);

    expect(screen.queryByRole("button", { name: /refresh/i })).not.toBeInTheDocument();
  });
});

describe("ConnectAgentButton — validation", () => {
  test("malformed DID surfaces an inline error and never calls createDelegation", async () => {
    const user = userEvent.setup();
    render(<ConnectAgentButton tcw={fakeTcw} onRefresh={onRefresh} />);

    await user.type(screen.getByPlaceholderText(/did:pkh:eip155/), "not-a-did");
    await user.click(screen.getByRole("button", { name: /connect agent/i }));

    expect(await screen.findByText(/starting with did:pkh: or did:key:/i)).toBeInTheDocument();
    expect(mockedCreateDelegation).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("ConnectAgentButton — happy path", () => {
  test("valid DID + 200 response flips to the connected state with OpenCode link", async () => {
    mockedCreateDelegation.mockResolvedValue(FAKE_SERIALIZED);
    fetchMock.mockResolvedValue(new Response('{"ok":true,"bytes":42}', { status: 200 }));

    const user = userEvent.setup();
    render(<ConnectAgentButton tcw={fakeTcw} onRefresh={onRefresh} />);

    await user.type(screen.getByPlaceholderText(/did:pkh:eip155/), VALID_AGENT_DID);
    await user.click(screen.getByRole("button", { name: /connect agent/i }));

    expect(await screen.findByText(/agent connected/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /http:\/\/localhost:4096/ })).toHaveAttribute(
      "href",
      "http://localhost:4096/L3dvcmtzcGFjZQ",
    );

    // Verify the SDK helper was called with the right scope.
    expect(mockedCreateDelegation).toHaveBeenCalledWith(
      fakeTcw,
      VALID_AGENT_DID,
      expect.objectContaining({
        path: "",
        expiryMs: 7 * 24 * 3600 * 1000,
        actions: expect.arrayContaining([
          "tinycloud.kv/get",
          "tinycloud.kv/put",
          "tinycloud.sql/read",
          "tinycloud.sql/write",
        ]),
      }),
    );

    // Verify the POST body.
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4097/delegation",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ serialized: FAKE_SERIALIZED }),
      }),
    );
  });

  test("agentEndpoint prop overrides the default POST target", async () => {
    mockedCreateDelegation.mockResolvedValue(FAKE_SERIALIZED);
    fetchMock.mockResolvedValue(new Response('{"ok":true}', { status: 200 }));

    const user = userEvent.setup();
    render(
      <ConnectAgentButton
        tcw={fakeTcw}
        agentEndpoint="http://example.test:9999"
        onRefresh={onRefresh}
      />,
    );

    await user.type(screen.getByPlaceholderText(/did:pkh:eip155/), VALID_AGENT_DID);
    await user.click(screen.getByRole("button", { name: /connect agent/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://example.test:9999/delegation",
        expect.any(Object),
      );
    });
  });

  test("Disconnect after connected resets back to the form", async () => {
    mockedCreateDelegation.mockResolvedValue(FAKE_SERIALIZED);
    fetchMock.mockResolvedValue(new Response('{"ok":true}', { status: 200 }));

    const user = userEvent.setup();
    render(<ConnectAgentButton tcw={fakeTcw} onRefresh={onRefresh} />);

    await user.type(screen.getByPlaceholderText(/did:pkh:eip155/), VALID_AGENT_DID);
    await user.click(screen.getByRole("button", { name: /connect agent/i }));
    await screen.findByText(/agent connected/i);

    await user.click(screen.getByRole("button", { name: /disconnect/i }));

    // Back to the form — input cleared, Connect button present and disabled.
    const input = screen.getByPlaceholderText(/did:pkh:eip155/) as HTMLInputElement;
    expect(input.value).toBe("");
    expect(screen.getByRole("button", { name: /connect agent/i })).toBeDisabled();
  });
});

describe("ConnectAgentButton — createDelegation error", () => {
  test("shows the thrown message when createDelegation rejects", async () => {
    mockedCreateDelegation.mockRejectedValue(new Error("delegation chain too short"));

    const user = userEvent.setup();
    render(<ConnectAgentButton tcw={fakeTcw} onRefresh={onRefresh} />);

    await user.type(screen.getByPlaceholderText(/did:pkh:eip155/), VALID_AGENT_DID);
    await user.click(screen.getByRole("button", { name: /connect agent/i }));

    expect(await screen.findByText("delegation chain too short")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("ConnectAgentButton — endpoint unreachable fallback", () => {
  test("fetch reject exposes the serialized delegation in a copyable textarea", async () => {
    mockedCreateDelegation.mockResolvedValue(FAKE_SERIALIZED);
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const user = userEvent.setup();
    render(<ConnectAgentButton tcw={fakeTcw} onRefresh={onRefresh} />);

    await user.type(screen.getByPlaceholderText(/did:pkh:eip155/), VALID_AGENT_DID);
    await user.click(screen.getByRole("button", { name: /connect agent/i }));

    const textarea = (await screen.findByDisplayValue(FAKE_SERIALIZED)) as HTMLTextAreaElement;
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute("readonly");

    // userEvent.setup() installs a synthetic clipboard; assert via readText.
    await user.click(screen.getByRole("button", { name: /copy to clipboard/i }));
    expect(await navigator.clipboard.readText()).toBe(FAKE_SERIALIZED);
    expect(await screen.findByRole("button", { name: /^copied$/i })).toBeInTheDocument();
  });

  test("non-2xx response also triggers the fallback state", async () => {
    mockedCreateDelegation.mockResolvedValue(FAKE_SERIALIZED);
    fetchMock.mockResolvedValue(new Response("Internal Error", { status: 500 }));

    const user = userEvent.setup();
    render(<ConnectAgentButton tcw={fakeTcw} onRefresh={onRefresh} />);

    await user.type(screen.getByPlaceholderText(/did:pkh:eip155/), VALID_AGENT_DID);
    await user.click(screen.getByRole("button", { name: /connect agent/i }));

    await waitFor(() => {
      expect(screen.getByDisplayValue(FAKE_SERIALIZED)).toBeInTheDocument();
    });
  });
});

describe("ConnectAgentButton — refresh button", () => {
  test("clicking Refresh fires the onRefresh callback", async () => {
    const user = userEvent.setup();
    render(
      <ConnectAgentButton
        tcw={fakeTcw}
        onRefresh={onRefresh}
        refreshLabel="Refresh conversations"
      />,
    );

    await user.click(screen.getByRole("button", { name: /refresh conversations/i }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
