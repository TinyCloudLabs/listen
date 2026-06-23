#!/usr/bin/env python3
"""Print your logged-in otter.ai cookie as JSON for `otter-importer cookie`.

Otter has no public API; this reuses the Chrome session you're already logged into.
Requires: pip install browser_cookie3 — and you staying logged in to otter.ai in Chrome.

  python3 scripts/dump_cookie.py            # {"sessionid": "...", "csrftoken": "..."}
  python3 scripts/dump_cookie.py | otter-importer cookie --sessionid - --csrftoken -  # (or copy the values)
"""
import json
import browser_cookie3 as bc

jar = {c.name: c.value for c in bc.chrome(domain_name="otter.ai")}
print(json.dumps({"sessionid": jar["sessionid"], "csrftoken": jar["csrftoken"]}))
