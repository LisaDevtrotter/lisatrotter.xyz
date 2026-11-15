"""read the lisatrotter.xyz visit log (cloudflare d1 "lisatrotter-visits").

usage:
  python tools/visits.py                 last 30 human page views (paris time)
  python tools/visits.py --last 100      more rows
  python tools/visits.py --bots          include crawlers and link previewers
  python tools/visits.py --summary       per-day views and unique visitors, channels, referrers, countries, languages
  python tools/visits.py --summary --days 7
  python tools/visits.py --sql "SELECT ..."   any read query

needs the wrangler login for lisa's account in ~/.devtrotter-cf (same as tools/deploy.py)."""
import argparse
import datetime as dt
import glob
import json
import os
import re
import shutil
import subprocess
import sys
import time

DB = "lisatrotter-visits"
ACCOUNT_ID = "934a1c5ee8d441c54a6adc0cc0e2cca8"
ENV = dict(os.environ, XDG_CONFIG_HOME=os.path.join(os.path.expanduser("~"), ".devtrotter-cf"),
           CLOUDFLARE_ACCOUNT_ID=ACCOUNT_ID, WRANGLER_SEND_METRICS="false")
def paris(t: dt.datetime) -> dt.datetime:
    """utc -> france local time, eu summer time rule (last sunday of march/october, 01:00 utc), no tzdata needed."""
    def last_sunday(month):
        d = dt.datetime(t.year, month, 31, 1, tzinfo=dt.timezone.utc)
        return d - dt.timedelta(days=(d.weekday() + 1) % 7)
    off = 2 if last_sunday(3) <= t < last_sunday(10) else 1
    return t.astimezone(dt.timezone(dt.timedelta(hours=off)))
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


def query(sql: str) -> list:
    # the cloudflare api drops a request now and then ("fetch failed"); five tries, a short pause between them
    for attempt in range(5):
        if attempt:
            time.sleep(2 * attempt)
        # no shell: cmd.exe would expand %name% inside the sql
        r = subprocess.run(wrangler() + ["d1", "execute", DB, "--remote", "--json", "--command", sql],
                           capture_output=True, text=True, encoding="utf-8", env=ENV, cwd=os.path.expanduser("~"))
        out = r.stdout.strip()
        start = out.find("[")
        if not r.returncode and start >= 0:
            return json.loads(out[start:])[0]["results"]
    sys.stderr.write(r.stdout + r.stderr)
    raise SystemExit("d1 query failed")


def device(ua: str) -> str:
    ua = ua or ""
    if not ua:
        return "?"
    b = next((n for n, rx in [("edge", r"Edg/"), ("opera", r"OPR/"), ("samsung", r"SamsungBrowser"), ("firefox", r"Firefox/"),
                                ("chrome", r"Chrome/"), ("safari", r"Safari/")] if re.search(rx, ua)), ua.split("/")[0][:18])
    o = next((n for n, rx in [("ios", r"iPhone|iPad"), ("android", r"Android"), ("windows", r"Windows"), ("mac", r"Macintosh"),
                                ("linux", r"Linux|X11")] if re.search(rx, ua)), "")
    return (b + (" · " + o if o else "")).lower()


def local(ts: str) -> str:
    t = paris(dt.datetime.strptime(ts, "%Y-%m-%d %H:%M:%S").replace(tzinfo=dt.timezone.utc))
    return t.strftime("%d·%m %H:%M")


def rows(n: int, bots: bool) -> None:
    where = "" if bots else "WHERE bot = 0"
    res = query(f"SELECT ts, path, via, ref, country, device, lang, bot, secs, depth, seen FROM visits {where} ORDER BY ts DESC LIMIT {int(n)}")
    if not res:
        print("no visits yet" + ("" if bots else " from people (--bots also shows crawlers and link previewers)"))
        return
    for r in res:
        place = r["country"] or "-"
        came = "via " + r["via"] if r["via"] else (r["ref"] or "direct")
        eng = f'{r["secs"]}s, {r["depth"]}m' if r["secs"] is not None else ""
        flag = " [bot]" if r["bot"] else ""
        print(f'{local(r["ts"])}  {r["path"]:<10} {came:<18} {place:<4} {(r["device"] or "?"):<18} {r["lang"] or "-":<3} {eng}{flag}')


def summary(days: int) -> None:
    since = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=days)).strftime("%Y-%m-%d %H:%M:%S")
    base = f"FROM visits WHERE bot = 0 AND ts >= '{since}'"
    print(f"last {days} days, people only (bots and link previews left out)\n")
    print("day         views  ~visitors  avg secs  avg depth")
    # no visitor ids exist; "visitors" = distinct country + browser family + language per day, a rough estimate.
    # (coarser than before by design — city and network are no longer stored.)
    for r in query(f"SELECT substr(ts,1,10) AS d, COUNT(*) AS v, COUNT(DISTINCT COALESCE(country,'') || '|' || COALESCE(device,'') || '|' || COALESCE(lang,'')) AS u, ROUND(AVG(secs)) AS s, ROUND(AVG(depth)) AS dp {base} GROUP BY d ORDER BY d DESC"):
        print(f'{r["d"]}  {r["v"]:>5}  {r["u"]:>9}  {r["s"] if r["s"] is not None else "-":>8}  {r["dp"] if r["dp"] is not None else "-":>9}')
    for title, col in [("channels (short links)", "via"), ("referrers", "ref"), ("countries", "country"), ("languages", "lang")]:
        res = query(f"SELECT COALESCE({col}, '-') AS k, COUNT(*) AS n {base} GROUP BY k ORDER BY n DESC LIMIT 12")
        print(f"\n{title}: " + ", ".join(f'{r["k"]} {r["n"]}' for r in res))
    seen = query(f"SELECT seen {base} AND seen IS NOT NULL")
    counts = {}
    for r in seen:
        for s in (r["seen"] or "").split(","):
            if s:
                counts[s] = counts.get(s, 0) + 1
    if counts:
        print("\nsections reached: " + ", ".join(f"{k} {v}" for k, v in sorted(counts.items(), key=lambda kv: -kv[1])))
    b = query(f"SELECT COUNT(*) AS n FROM visits WHERE bot = 1 AND ts >= '{since}'")
    print(f"\nbots and link previews: {b[0]['n']}")


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser()
    ap.add_argument("--last", type=int, default=30)
    ap.add_argument("--bots", action="store_true")
    ap.add_argument("--summary", action="store_true")
    ap.add_argument("--days", type=int, default=30)
    ap.add_argument("--sql")
    a = ap.parse_args()
    if a.sql:
        for r in query(a.sql):
            print(r)
    elif a.summary:
        summary(a.days)
    else:
        rows(a.last, a.bots)
    return 0


if __name__ == "__main__":
    sys.exit(main())
