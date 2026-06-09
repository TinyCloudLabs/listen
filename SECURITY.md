# Security Policy

Listen stores transcript metadata in TinyCloud SQL, transcript blobs in TinyCloud KV, and backend secret access through delegated TinyCloud permissions. Please report vulnerabilities privately.

## Reporting a Vulnerability

Email security reports to security@tinycloud.xyz. Include:

- affected repository, commit, or release
- reproduction steps
- expected impact
- any proof-of-concept code or logs that help verify the issue

Do not open a public GitHub issue for suspected vulnerabilities. TinyCloud Labs will acknowledge valid reports and coordinate remediation before public disclosure.

## Scope

In scope:

- transcript disclosure or authorization bypasses
- secret access, decrypt-permission, or delegation bugs
- OAuth, webhook, session, or CORS issues that expose user data
- supply-chain or build configuration issues that affect released artifacts

Out of scope:

- social engineering
- denial-of-service without a data exposure or authorization impact
- reports that require access to a user's private keys, browser profile, or device without another vulnerability
