import {
  httpUrlToMultiaddr,
  multiaddrToHttpUrl,
  resolveCloudLocation,
  type ResolveCloudLocationOptions,
  type ResolvedCloudLocation,
} from "@tinycloud/sdk-core";

export interface TinyCloudHostResolution {
  hosts: string[];
  location: ResolvedCloudLocation;
}

export interface ResolveTinyCloudHostsOptions {
  explicitHosts?: string[];
  centralizedRegistryUrl?: string;
  fallbackHosts?: string[];
  blockchain?: ResolveCloudLocationOptions["blockchain"];
  fetch?: ResolveCloudLocationOptions["fetch"];
}

export async function resolveTinyCloudHosts(
  subject: string,
  options: ResolveTinyCloudHostsOptions = {},
): Promise<TinyCloudHostResolution> {
  const location = await resolveCloudLocation(subject, {
    explicitMultiaddrs: hostsToMultiaddrs(options.explicitHosts),
    centralizedRegistryUrl: options.centralizedRegistryUrl,
    fallbackMultiaddrs: hostsToMultiaddrs(options.fallbackHosts),
    blockchain: options.blockchain,
    fetch: options.fetch,
  });

  return {
    location,
    hosts: location.multiaddrs.map((addr) => multiaddrToHttpUrl(addr)),
  };
}

function hostsToMultiaddrs(hosts: string[] | undefined): string[] | undefined {
  if (!hosts || hosts.length === 0) return undefined;
  return hosts.map((host) => (host.startsWith("/") ? host : httpUrlToMultiaddr(host)));
}
