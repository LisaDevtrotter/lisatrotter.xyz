"""deploy lisatrotter.xyz to cloudflare (lisa's own account).

usage: python tools/deploy.py            main worker "lisatrotter" on lisatrotter.xyz + the www redirect worker
       python tools/deploy.py --stage    a throwaway copy "lisatrotter-stage" on workers.dev (same d1), for testing
       python tools/deploy.py --dirty    allow uncommitted public files

main worker = the static site (assets) + a small script that only runs for the short links and /api/*
(the page itself never goes through it, so a flood of page loads can't use up the worker's daily quota),
plus a nightly cron that deletes visit-log rows older than 90 days. no workers logs, no workers.dev address,
no version preview urls. www.lisatrotter.xyz is its own tiny worker that 301s to the apex.

the site is copied into a temp folder (public files only) and deployed from there, so nothing else can be
uploaded. never run a bare `wrangler deploy` in the repo root: .assetsignore is only a second line of defence.
the zone went active on 23 sep 2026; the imported parking A record on the apex had to be deleted by hand first
(this login has no dns write scope).
needs a wrangler login for lisa's cloudflare account in ~/.devtrotter-cf:
  set XDG_CONFIG_HOME=%USERPROFILE%\\.devtrotter-cf && npx wrangler login --device"""
import glob
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STAGE = "--stage" in sys.argv
NAME = "lisatrotter-stage" if STAGE else "lisatrotter"
APEX = "lisatrotter.xyz"
ACCOUNT_ID = "934a1c5ee8d441c54a6adc0cc0e2cca8"
CF_HOME = os.path.join(os.path.expanduser("~"), ".devtrotter-cf")
ENV = dict(os.environ, XDG_CONFIG_HOME=CF_HOME, CLOUDFLARE_ACCOUNT_ID=ACCOUNT_ID, WRANGLER_SEND_METRICS="false")
D1 = {"binding": "DB", "database_name": "lisatrotter-visits", "database_id": "b1168232-b576-4c0a-8316-19607cde14e1"}
# the only paths that run the script; everything else is served by the asset server directly
WORKER_PATHS = ["/x", "/x/", "/fc", "/fc/", "/mail", "/mail/", "/gh", "/gh/", "/api/*"]
PUBLIC = ["index.html", "404.html", "robots.txt", "sitemap.xml", "favicon.svg", "favicon.ico", "apple-touch-icon.png",
          "css", "js", "fonts", "img"]
HEADERS = """/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=()
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
/fonts/*
  Cache-Control: public, max-age=31536000, immutable
"""
COMMON = {"compatibility_date": "2026-09-01", "preview_urls": False, "observability": {"enabled": False}}


def wrangler() -> list:
    best = None
    for pj in glob.glob(os.path.join(os.environ.get("LOCALAPPDATA", ""), "npm-cache", "_npx", "*", "node_modules", "wrangler", "package.json")):
        try:
            v = json.load(open(pj, encoding="utf-8"))["version"]
        except (OSError, ValueError, KeyError):
            continue
        key = tuple(int(x) for x in v.split(".")[:3] if x.isdigit())
        entry = os.path.join(os.path.dirname(pj), "bin", "wrangler.js")
        if key[:1] == (4,) and os.path.isfile(entry) and (best is None or key > best[0]):
            best = (key, entry)
    return ["node", best[1]] if best else [shutil.which("npx") or "npx.cmd", "--yes", "wrangler@4"]


def ensure_login(tries=4):
    """refresh the oauth token first: the refresh call sometimes drops on this machine's network,
    and a deploy that hits an expired token in a non-interactive shell just fails."""
    for i in range(tries):
        out = subprocess.run(wrangler() + ["whoami"], capture_output=True, text=True, encoding="utf-8", errors="replace", env=ENV)
        if "logged in with" in (out.stdout + out.stderr):
            return True
        time.sleep(3 * (i + 1))
    print("wrangler login could not be refreshed; run: set XDG_CONFIG_HOME=%USERPROFILE%\\.devtrotter-cf && npx wrangler login --device")
    return False


def run(tmp, cfg_name, cfg, message):
    with open(os.path.join(tmp, cfg_name), "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)
    return subprocess.run(wrangler() + ["deploy", "--config", cfg_name, "--message", message], cwd=tmp, env=ENV).returncode


def main() -> int:
    head = subprocess.run(["git", "-C", SITE, "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip()
    dirty = subprocess.run(["git", "-C", SITE, "status", "--short", "--"] + PUBLIC + ["worker"], capture_output=True, text=True).stdout.strip()
    if dirty and "--dirty" not in sys.argv:
        print("public files have uncommitted changes; commit first (or pass --dirty):\n" + dirty)
        return 2
    if not ensure_login():
        return 4
    tmp = tempfile.mkdtemp(prefix="lisatrotter-deploy-")
    try:
        dst = os.path.join(tmp, "site")
        os.makedirs(dst)
        for item in PUBLIC:
            src = os.path.join(SITE, item)
            if os.path.isdir(src):
                shutil.copytree(src, os.path.join(dst, item))
            elif os.path.isfile(src):
                shutil.copy2(src, os.path.join(dst, item))
        with open(os.path.join(dst, "_headers"), "w", encoding="utf-8", newline="\n") as f:
            f.write(HEADERS)
        shutil.copytree(os.path.join(SITE, "worker"), os.path.join(tmp, "worker"))
        files = sum(len(fs) for _, _, fs in os.walk(dst))
        print(f"{files} public files from {head} -> worker {NAME}")
        main_cfg = dict(COMMON, name=NAME, main="worker/index.js", workers_dev=STAGE,
                        assets={"directory": "./site", "binding": "ASSETS", "run_worker_first": WORKER_PATHS,
                                "not_found_handling": "404-page", "html_handling": "auto-trailing-slash"},
                        d1_databases=[D1])
        if not STAGE:
            main_cfg["routes"] = [{"pattern": APEX, "custom_domain": True}]
            main_cfg["triggers"] = {"crons": ["17 3 * * *"]}
        rc = run(tmp, "wrangler.json", main_cfg, f"site {head}")
        if rc or STAGE:
            if not rc:
                print(f"check: https://{NAME}.devtrotter-site.workers.dev/")
            return rc
        www_cfg = dict(COMMON, name="lisatrotter-www", main="worker/www.js", workers_dev=False,
                       routes=[{"pattern": "www." + APEX, "custom_domain": True}])
        rc = run(tmp, "wrangler-www.json", www_cfg, f"www redirect {head}")
        if rc == 0:
            print(f"check: https://{APEX}/  (https://www.{APEX}/ -> 301)")
        return rc
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
