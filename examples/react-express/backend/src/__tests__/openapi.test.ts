import { describe, test, expect } from "bun:test";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { load as loadYaml } from "js-yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const spec = loadYaml(
  readFileSync(resolve(__dirname, "../../openapi.yaml"), "utf-8"),
) as Record<string, unknown>;

describe("OpenAPI spec", () => {
  test("is valid OpenAPI 3.1.0", () => {
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.info).toBeDefined();
    expect(spec.paths).toBeDefined();
  });

  test("contains all expected paths", () => {
    const paths = Object.keys(spec.paths as object);
    expect(paths).toContain("/api/server-info");
    expect(paths).toContain("/api/delegations");
    expect(paths).toContain("/api/delegations/status");
    expect(paths).toContain("/api/items");
    expect(paths).toContain("/api/items/{id}");
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

  test("items/{id} has GET, PUT, DELETE operations", () => {
    const itemsById = (spec.paths as Record<string, Record<string, unknown>>)["/api/items/{id}"];
    expect(itemsById.get).toBeDefined();
    expect(itemsById.put).toBeDefined();
    expect(itemsById.delete).toBeDefined();
  });

  test("defines all expected schemas", () => {
    const components = spec.components as Record<string, Record<string, unknown>>;
    const schemas = Object.keys(components.schemas as object);
    expect(schemas).toContain("Item");
    expect(schemas).toContain("CreateItemInput");
    expect(schemas).toContain("UpdateItemInput");
    expect(schemas).toContain("ItemResponse");
    expect(schemas).toContain("ItemListResponse");
    expect(schemas).toContain("DelegationResponse");
    expect(schemas).toContain("ServerInfo");
    expect(schemas).toContain("ApiError");
  });

  test("defines Bearer JWT security scheme", () => {
    const components = spec.components as Record<string, Record<string, unknown>>;
    const schemes = components.securitySchemes as Record<string, Record<string, unknown>>;
    expect(schemes.bearerAuth).toBeDefined();
    expect(schemes.bearerAuth.type).toBe("http");
    expect(schemes.bearerAuth.scheme).toBe("bearer");
  });
});
