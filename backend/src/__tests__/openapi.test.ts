import { describe, test, expect } from "bun:test";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { load as loadYaml } from "js-yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const spec = loadYaml(readFileSync(resolve(__dirname, "../../openapi.yaml"), "utf-8")) as Record<
  string,
  unknown
>;

describe("OpenAPI spec", () => {
  test("is valid OpenAPI 3.1.0", () => {
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.info).toBeDefined();
    expect(spec.paths).toBeDefined();
  });

  test("contains all expected paths", () => {
    const paths = Object.keys(spec.paths as object);
    expect(paths).toContain("/api/manifest");
    expect(paths).toContain("/api/server-info");
    expect(paths).toContain("/api/delegations");
    expect(paths).toContain("/api/delegations/status");
    expect(paths).toContain("/api/workspace-state");
    expect(paths).toContain("/api/webhooks/fireflies");
    expect(paths).toContain("/api/webhooks/fireflies/pending");
    expect(paths).toContain("/api/config/webhook-secret");
    expect(paths).toContain("/api/config/webhook-status");
  });

  test("server-info has GET operation with no security", () => {
    const serverInfo = (spec.paths as Record<string, Record<string, unknown>>)["/api/server-info"];
    const get = serverInfo.get as Record<string, unknown>;
    expect(get).toBeDefined();
    expect(get.security).toEqual([]);
  });

  test("delegations has POST and DELETE operations", () => {
    const delegations = (spec.paths as Record<string, Record<string, unknown>>)["/api/delegations"];
    expect(delegations.post).toBeDefined();
    expect(delegations.delete).toBeDefined();
  });

  test("documents stored-copy removal and the authoritative workspace state", () => {
    const paths = spec.paths as Record<string, Record<string, any>>;
    expect(paths["/api/delegations"].delete.responses["200"].description).toBe(
      "Stored delegation copy removed",
    );
    expect(paths["/api/delegations"].delete.responses["500"].description).toBe(
      "Stored-copy removal failed",
    );
    expect(
      paths["/api/workspace-state"].get.responses["200"].content["application/json"].schema.$ref,
    ).toBe("#/components/schemas/WorkspaceStateResponse");
    expect(paths["/api/workspace-state"].get.responses["503"].description).toBe(
      "Operational workspace state dependencies are temporarily unavailable",
    );
    expect(
      paths["/api/workspace-state"].get.responses["503"].content["application/json"].schema.$ref,
    ).toBe("#/components/schemas/ApiError");
  });

  test("documents delegation status read failures", () => {
    const paths = spec.paths as Record<string, Record<string, any>>;
    expect(paths["/api/delegations/status"].get.responses["500"].description).toBe(
      "Delegation status read failed",
    );
    expect(
      paths["/api/delegations/status"].get.responses["500"].content["application/json"].schema.$ref,
    ).toBe("#/components/schemas/ApiError");
  });

  test("defines all expected schemas", () => {
    const components = spec.components as Record<string, Record<string, unknown>>;
    const schemas = Object.keys(components.schemas as object);
    expect(schemas).toContain("DelegationResponse");
    expect(schemas).toContain("WorkspaceStateResponse");
    expect(schemas).toContain("WorkspaceDelegationState");
    expect(schemas).toContain("WorkspaceSecretReadability");
    expect(schemas).toContain("Manifest");
    expect(schemas).toContain("PermissionEntry");
    expect(schemas).toContain("ServerInfo");
    expect(schemas).toContain("ApiError");
    expect(schemas).toContain("WebhookProcessed");
    expect(schemas).toContain("WebhookPending");
    expect(schemas).toContain("WebhookIgnored");
    expect(schemas).toContain("SyncResult");
    expect(schemas).toContain("PendingProcessResult");
    expect(schemas).toContain("WebhookStatus");
  });

  test("uses OpenAPI 3.1 JSON Schema unions for nullable response fields", () => {
    const schemas = (spec.components as Record<string, any>).schemas;
    expect(schemas.DelegationResponse.properties.expiresAt.type).toEqual(["string", "null"]);
    expect(schemas.WorkspaceDelegationState.properties.expiresAt.type).toEqual(["string", "null"]);
    expect(schemas.WorkspaceSecretReadability.properties.readable.type).toEqual([
      "boolean",
      "null",
    ]);
    expect(JSON.stringify(schemas)).not.toContain('"nullable"');
  });

  test("documents optional Google Meet workspace-state errors", () => {
    const schemas = (spec.components as Record<string, any>).schemas;
    expect(schemas.WorkspaceStateResponse.properties.googleMeet.properties.error).toEqual({
      type: "string",
    });
  });

  test("webhook POST endpoint has no security (public, HMAC-verified)", () => {
    const webhook = (spec.paths as Record<string, Record<string, unknown>>)[
      "/api/webhooks/fireflies"
    ];
    const post = webhook.post as Record<string, unknown>;
    expect(post).toBeDefined();
    expect(post.security).toEqual([]);
  });

  test("webhook pending has GET and DELETE operations", () => {
    const pending = (spec.paths as Record<string, Record<string, unknown>>)[
      "/api/webhooks/fireflies/pending"
    ];
    expect(pending.get).toBeDefined();
    expect(pending.delete).toBeDefined();
  });

  test("webhook-secret has PUT operation", () => {
    const secret = (spec.paths as Record<string, Record<string, unknown>>)[
      "/api/config/webhook-secret"
    ];
    expect(secret.put).toBeDefined();
  });

  test("webhook-status has GET operation", () => {
    const status = (spec.paths as Record<string, Record<string, unknown>>)[
      "/api/config/webhook-status"
    ];
    expect(status.get).toBeDefined();
  });

  test("defines Bearer JWT security scheme", () => {
    const components = spec.components as Record<string, Record<string, unknown>>;
    const schemes = components.securitySchemes as Record<string, Record<string, unknown>>;
    expect(schemes.bearerAuth).toBeDefined();
    expect(schemes.bearerAuth.type).toBe("http");
    expect(schemes.bearerAuth.scheme).toBe("bearer");
  });
});
