import type { TinyCloudNode } from "@tinycloud/node-sdk";

type PortableDelegation = Parameters<TinyCloudNode["useDelegation"]>[0];
type DelegatedAccess = Awaited<ReturnType<TinyCloudNode["useDelegation"]>>;

interface PortableResource {
  service: string;
  space?: string;
  path: string;
  actions: string[];
}

export async function activatePortableDelegation(
  node: TinyCloudNode,
  delegation: PortableDelegation,
): Promise<DelegatedAccess> {
  const resources = extractPortableResources(delegation);
  const activatableResources = resources.filter(
    (resource) => normalizeResourceService(resource.service) !== "capabilities",
  );

  if (resources.length <= 1) {
    return node.useDelegation(delegation);
  }

  if (activatableResources.length === 0) {
    return node.useDelegation(delegation);
  }

  if (activatableResources.length === 1) {
    return activateResource(node, delegation, activatableResources[0]);
  }

  const accessByService = new Map<string, DelegatedAccess>();
  const activated = await Promise.all(
    activatableResources.map(async (resource) => {
      const service = normalizeResourceService(resource.service);
      const access = await activateResource(node, delegation, resource);
      accessByService.set(service, access);
      return access;
    }),
  );

  const combined = activated[0] as DelegatedAccess & Record<string, unknown>;

  for (const [service, access] of accessByService.entries()) {
    if (service === "kv") {
      Object.defineProperty(combined, "kv", { value: access.kv, configurable: true });
    } else if (service === "sql") {
      Object.defineProperty(combined, "sql", { value: access.sql, configurable: true });
    } else if (service === "duckdb") {
      Object.defineProperty(combined, "duckdb", { value: access.duckdb, configurable: true });
    } else if (service === "hooks") {
      Object.defineProperty(combined, "hooks", { value: access.hooks, configurable: true });
    }
  }

  return combined;
}

function activateResource(
  node: TinyCloudNode,
  delegation: PortableDelegation,
  resource: PortableResource,
): Promise<DelegatedAccess> {
  const service = normalizeResourceService(resource.service);
  return node.useDelegation({
    ...delegation,
    spaceId: resource.space?.startsWith("tinycloud:") ? resource.space : delegation.spaceId,
    path: resource.path,
    actions: resource.actions.map((action) => normalizeResourceAction(action, service)),
    resources: [{ ...resource, space: resource.space ?? delegation.spaceId }],
  });
}

function extractPortableResources(delegation: PortableDelegation): PortableResource[] {
  const resources = (delegation as { resources?: unknown }).resources;
  if (!Array.isArray(resources)) return [];

  return resources.flatMap((resource) => {
    if (typeof resource !== "object" || resource === null) return [];
    const entry = resource as {
      service?: unknown;
      space?: unknown;
      path?: unknown;
      actions?: unknown;
    };
    if (
      typeof entry.service !== "string" ||
      typeof entry.path !== "string" ||
      !Array.isArray(entry.actions) ||
      !entry.actions.every((action) => typeof action === "string")
    ) {
      return [];
    }

    return [
      {
        service: entry.service,
        ...(typeof entry.space === "string" ? { space: entry.space } : {}),
        path: entry.path,
        actions: [...entry.actions],
      },
    ];
  });
}

function normalizeResourceService(service: string): string {
  return service.startsWith("tinycloud.") ? service.slice("tinycloud.".length) : service;
}

function normalizeResourceAction(action: string, service: string): string {
  return action.includes("/") ? action : `tinycloud.${service}/${action}`;
}
