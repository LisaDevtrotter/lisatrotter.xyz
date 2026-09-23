// lisatrotter.xyz worker. the site itself is plain static assets; this worker only answers
//   /x /fc /mail /gh      short links -> 302 /?via=<tag>
//   POST /api/hit         the page reports a view (sent by js/visit.js once the page is actually shown)
//   POST /api/v           the page reports, when it is hidden: visible seconds, deepest point, sections seen
// and once a night (cron) deletes log entries older than KEEP_DAYS.
//
// what a log row holds: time, path, channel tag, referrer host, country/region/city, network (asn + org),
// browser family ("chrome · windows"), primary language, a bot flag, and the engagement numbers.
// no ip address, nothing derived from one, no cookies, no full user-agent string.

const TAGS = Object.freeze({ x: "x", fc: "fc", mail: "mail", gh: "gh" });
const KEEP_DAYS = 90;
const SECTIONS = new Set(["top", "holes", "finds", "archive", "onchain", "notes", "about", "foot"]);
const BOT_RE = /(?<!cu)bot\b|bot\/|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|embedly|iframely|cardyb|mastodon|pleroma|misskey|http\.rb|whatsapp|telegram|discord|slack|skype|vkshare|curl\/|wget|python|httpclient|okhttp|go-http|java\/|node-fetch|undici|axios|scrapy|monitor|uptime/i;
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const MAX_BODY = 2048;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const key = path.slice(1);
    if (Object.hasOwn(TAGS, key)) return Response.redirect(url.origin + "/?via=" + TAGS[key], 302);

    if (path === "/api/hit" || path === "/api/v") {
      if (request.method !== "POST") return new Response(null, { status: 405, headers: { Allow: "POST" } });
      const data = await readJson(request);
      if (!data || typeof data.id !== "string" || !ID_RE.test(data.id)) return new Response(null, { status: 400 });
      try {
        if (path === "/api/hit") await hit(env, request, url, data);
        else await engagement(env, data);
      } catch (e) {
        console.log("visit log failed", String(e));
      }
      return new Response(null, { status: 204 });
    }
    if (path.startsWith("/api/")) return new Response("not found", { status: 404 });
    return env.ASSETS.fetch(request);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(cleanup(env));
  },
};

async function readJson(request) {
  const len = Number(request.headers.get("content-length"));
  if (!(len > 0 && len <= MAX_BODY)) return null;
  try {
    const text = await request.text();
    return text.length <= MAX_BODY ? JSON.parse(text) : null;
  } catch (e) {
    return null;
  }
}

async function hit(env, request, url, data) {
  const cf = request.cf || {};
  const ua = request.headers.get("user-agent") || "";
  const lang = ((request.headers.get("accept-language") || "").split(",")[0] || "").split("-")[0].trim().toLowerCase().slice(0, 8) || null;
  const path = typeof data.path === "string" && data.path.startsWith("/") ? data.path.slice(0, 200) : "/";
  const via = typeof data.via === "string" && Object.hasOwn(TAGS, data.via) ? TAGS[data.via] : null;
  await env.DB.prepare(
    "INSERT OR IGNORE INTO visits (id, ts, path, via, ref, country, region, city, asn, org, device, lang, bot) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)"
  ).bind(
    data.id, stamp(new Date()), path, via, refHost(data.ref, url.hostname),
    cf.country || null, cf.region || null, cf.city || null, cf.asn || null, (cf.asOrganization || "").slice(0, 120) || null,
    device(ua), lang, !ua || BOT_RE.test(ua) || isHeadless(request) ? 1 : 0
  ).run();
}

async function engagement(env, data) {
  const secs = clampInt(data.secs, 0, 3600);
  const depth = clampInt(data.depth, 0, 1000);
  if (secs === null || depth === null) return;
  const seen = Array.isArray(data.seen) ? [...new Set(data.seen.filter((s) => typeof s === "string" && SECTIONS.has(s)))].join(",") : "";
  const since = stamp(new Date(Date.now() - 86400000));
  await env.DB.prepare(
    "UPDATE visits SET secs = MAX(COALESCE(secs, 0), ?1), depth = MAX(COALESCE(depth, 0), ?2), seen = COALESCE(NULLIF(?3, ''), seen) WHERE id = ?4 AND ts > ?5"
  ).bind(secs, depth, seen, data.id, since).run();
}

async function cleanup(env) {
  const cutoff = stamp(new Date(Date.now() - KEEP_DAYS * 86400000));
  await env.DB.prepare("DELETE FROM visits WHERE ts < ?1").bind(cutoff).run();
}

// browser family and os, no versions: enough to tell a phone from a laptop
function device(ua) {
  if (!ua) return null;
  const pick = (pairs, fallback) => { for (const [name, rx] of pairs) if (rx.test(ua)) return name; return fallback; };
  const browser = pick([["edge", /Edg\//], ["opera", /OPR\//], ["samsung", /SamsungBrowser/], ["firefox", /Firefox\//],
    ["chrome", /Chrome\/|CriOS/], ["safari", /Safari\//]], (ua.split("/")[0] || "other").toLowerCase().slice(0, 20));
  const os = pick([["ios", /iPhone|iPad|iPod/], ["android", /Android/], ["windows", /Windows/], ["mac", /Macintosh/], ["linux", /Linux|X11|CrOS/]], "");
  return os ? browser + " · " + os : browser;
}

// real browsers from the last few years always send sec-fetch-* on these requests
function isHeadless(request) {
  return !request.headers.get("sec-fetch-mode") && /Chrome\/(\d+)/.test(request.headers.get("user-agent") || "");
}

function refHost(ref, self) {
  if (typeof ref !== "string" || !ref) return null;
  try {
    const h = new URL(ref).hostname.toLowerCase();
    return h === self || h === "www." + self ? null : h.slice(0, 100);
  } catch (e) {
    return null;
  }
}
function stamp(d) { return d.toISOString().slice(0, 19).replace("T", " "); }
function clampInt(v, lo, hi) { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : null; }
