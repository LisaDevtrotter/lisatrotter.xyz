/* visit.js · how the site's visit log learns about a page view. it sends two small reports:
   /api/hit once the page is really shown (not while a browser prerenders it in the background),
   /api/v when you leave or switch tabs: visible seconds, how deep you scrolled, which sections you saw.
   the page makes up a random id for this one page view to tie the two together; it stores nothing
   in your browser and sets no cookies. the server adds country, network and browser family itself. */
(function () {
  "use strict";
  var params = new URLSearchParams(location.search);
  var via = params.get("via");
  // tidy the short-link tag (lisatrotter.xyz/x -> /?via=x) out of the address bar
  if (via && window.history && history.replaceState) {
    params.delete("via");
    var q = params.toString();
    history.replaceState(null, "", location.pathname + (q ? "?" + q : "") + location.hash);
  }
  if (!navigator.sendBeacon || !window.JSON) return;

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = new Uint8Array(16);
    crypto.getRandomValues(b);
    b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var h = [].map.call(b, function (x) { return (x + 256).toString(16).slice(1); }).join("");
    return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20);
  }
  var id = uuid(), started = false, wired = false;
  var visibleMs = 0, since = 0, depth = 0, seen = {};

  function send(url, data) {
    try { navigator.sendBeacon(url, JSON.stringify(data)); } catch (e) {}
  }
  function onScroll() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var p = max > 0 ? window.scrollY / max : 1;
    depth = Math.max(depth, Math.round(Math.min(1, Math.max(0, p)) * 1000));
  }
  function key(el) { return el.id || (el.classList.contains("hero") ? "top" : el.classList.contains("foot") ? "foot" : ""); }

  function start() {
    if (started) return;
    started = true;
    since = document.hidden ? 0 : performance.now();
    send("/api/hit", { id: id, path: location.pathname, via: via, ref: document.referrer || null });
    onScroll();
    if (wired) return;
    wired = true;
    window.addEventListener("scroll", onScroll, { passive: true });
    // a section counts as seen once it crosses the middle of the screen, however tall it is
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (en) {
        en.forEach(function (e) { if (e.isIntersecting) { var k = key(e.target); if (k) seen[k] = 1; } });
      }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
      [].forEach.call(document.querySelectorAll("[data-zone]"), function (z) { io.observe(z); });
    }
  }
  function report() {
    if (!started) return;
    var ms = visibleMs + (since ? performance.now() - since : 0);
    send("/api/v", { id: id, secs: Math.round(ms / 1000), depth: depth, seen: Object.keys(seen) });
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (since) { visibleMs += performance.now() - since; since = 0; }
      report();
    } else if (started) since = performance.now();
  });
  window.addEventListener("pagehide", function () { if (!document.hidden) report(); });
  // back/forward cache: a restored page is a new view with a new id
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) { id = uuid(); via = null; started = false; visibleMs = 0; depth = 0; seen = {}; start(); }
  });

  if (document.prerendering) document.addEventListener("prerenderingchange", start, { once: true });
  else start();
})();
