/* extras.js · later design layers:
   drag-around stickers, a marquee that feels your scroll speed, hand-drawn underlines,
   sparkles, sonar pings on section numbers, "post on x" for selected text,
   and a button that shows the site as it would have looked in 1998. */
(function () {
  "use strict";
  var root = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return [].slice.call((c || document).querySelectorAll(s)); }
  function toast(m) { if (window.DTToast) window.DTToast(m); }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }

  // ---------- shared svg gradient for the scribbles ----------
  var defs = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  defs.setAttribute("width", "0"); defs.setAttribute("height", "0"); defs.setAttribute("aria-hidden", "true");
  defs.style.position = "absolute";
  defs.innerHTML = '<defs><linearGradient id="scribble-grad" x1="0" x2="1" y1="0" y2="0">' +
    '<stop offset="0" stop-color="#ff8ccf"/><stop offset=".3" stop-color="#ffd08a"/><stop offset=".55" stop-color="#8ef3d1"/>' +
    '<stop offset=".8" stop-color="#8fd3ff"/><stop offset="1" stop-color="#a393ff"/></linearGradient></defs>';
  document.body.appendChild(defs);

  // ---------- hand-drawn underlines ----------
  var SCRIBBLES = [
    "M2 9 C 30 3, 60 12, 95 7 S 160 3, 198 8",
    "M3 7 C 40 11, 70 2, 110 8 S 170 11, 197 5",
    "M2 8 C 50 4, 90 10, 130 6 C 160 3, 185 9, 198 7 M20 11 C 70 8, 130 12, 180 10"
  ];
  $$(".iri").forEach(function (t, i) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "scribble");
    svg.setAttribute("viewBox", "0 0 200 14");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-hidden", "true");
    var p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", SCRIBBLES[i % SCRIBBLES.length]);
    svg.appendChild(p);
    t.appendChild(svg);
    // the dash only has to be longer than the path on screen; measuring the word before the fonts load came out short
    svg.style.setProperty("--len", 2400);
  });
  function drawVisible() {
    $$(".scribble:not(.drawn)").forEach(function (s) {
      var r = s.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) s.classList.add("drawn");
    });
  }
  if ("IntersectionObserver" in window) {
    var sio = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("drawn"); sio.unobserve(e.target); } });
    }, { threshold: 0.5 });
    $$(".scribble").forEach(function (s) { sio.observe(s); });
    setTimeout(drawVisible, 1500);
    window.addEventListener("scroll", function () { setTimeout(drawVisible, 300); }, { passive: true });
  } else $$(".scribble").forEach(function (s) { s.classList.add("drawn"); });

  // ---------- sparkles ----------
  var SPARK_COLORS = ["#ff8ccf", "#ffd08a", "#8ef3d1", "#8fd3ff", "#a393ff"];
  function sparkle(x, y, n) {
    if (reduced) return;
    for (var i = 0; i < n; i++) {
      var s = el("span", "spark", Math.random() < 0.7 ? "✦" : "·");
      var a = Math.random() * Math.PI * 2, d = 18 + Math.random() * 36;
      s.style.left = x + "px"; s.style.top = y + "px";
      s.style.setProperty("--dx", (Math.cos(a) * d).toFixed(1) + "px");
      s.style.setProperty("--dy", (Math.sin(a) * d).toFixed(1) + "px");
      s.style.setProperty("--s", (8 + Math.random() * 10).toFixed(0) + "px");
      s.style.setProperty("--c", SPARK_COLORS[(Math.random() * 5) | 0]);
      document.body.appendChild(s);
      s.addEventListener("animationend", function () { this.remove(); });
    }
  }
  window.DTSparkle = sparkle;
  var lastSpark = 0;
  $$(".iri, .wm-star, .brand-star, .foot-title").forEach(function (t) {
    t.addEventListener("pointermove", function (e) {
      var now = performance.now();
      if (now - lastSpark < 90) return;
      lastSpark = now;
      sparkle(e.clientX, e.clientY, 2);
    });
  });

  // ---------- sonar ping on the section numbers ----------
  if ("IntersectionObserver" in window) {
    var pio = new IntersectionObserver(function (en) {
      en.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.remove("pinged");
        void e.target.offsetWidth;
        e.target.classList.add("pinged");
      });
    }, { threshold: 1 });
    $$(".sec-num").forEach(function (s) { pio.observe(s); });
  }

  // ---------- second marquee, before the footer ----------
  var foot = $(".foot");
  if (foot) {
    var m2 = el("div", "marquee-2");
    m2.setAttribute("aria-hidden", "true");
    var track = el("div", "m2-track");
    for (var k = 0; k < 2; k++) {
      var sp = el("span");
      sp.innerHTML = "strange corners <em>of the</em> internet ✦ strange corners <em>of the</em> internet ✦ ";
      track.appendChild(sp);
    }
    m2.appendChild(track);
    foot.parentNode.insertBefore(m2, foot);
  }

  // ---------- marquees feel your scroll speed ----------
  var tracks = [];
  var mt = $(".marquee-track");
  if (mt) tracks.push({ el: mt, box: mt.parentNode, x: 0, dir: -1, base: 0.5, skew: true });
  var t2 = $(".m2-track");
  if (t2) tracks.push({ el: t2, box: t2.parentNode, x: 0, dir: 1, base: 0.35, skew: false });
  if (!reduced && tracks.length) {
    tracks.forEach(function (t) { t.el.style.animation = "none"; });
    var lastY = window.scrollY, vel = 0, sdir = 1;
    (function loop() {
      var y = window.scrollY, dy = y - lastY;
      lastY = y;
      if (dy) sdir = dy > 0 ? 1 : -1;
      vel += (dy - vel) * 0.12;
      tracks.forEach(function (t) {
        var r = t.box.getBoundingClientRect();
        if (r.bottom < -50 || r.top > window.innerHeight + 50) return;
        var half = t.el.scrollWidth / 2 || 1;
        t.x += t.dir * sdir * (t.base + Math.min(14, Math.abs(vel) * 0.25));
        if (t.x <= -half) t.x += half;
        if (t.x > 0) t.x -= half;
        var sk = t.skew ? Math.max(-10, Math.min(10, vel * 0.35)) : 0;
        t.el.style.transform = "translate3d(" + t.x.toFixed(1) + "px,0,0) skewX(" + (-sk).toFixed(2) + "deg)";
      });
      requestAnimationFrame(loop);
    })();
  }

  // ---------- stickers you can drag around ----------
  var STICKERS = [
    { id: "gm", cls: "st-gm", text: "gm", anchor: ".hero", fx: 0.52, fy: 0.9, r: -8 },
    { id: "star", cls: "st-star", text: "✦", anchor: "#holes .sec-head", fx: 0.8, fy: 0.1, r: 12 },
    { id: "sign", cls: "st-sign", text: "rabbit hole ahead", anchor: "#holes .holes-grid", fx: 0.62, fy: 0.02, r: -4 },
    { id: "404", cls: "st-404", text: "404", anchor: "#archive .sec-head", fx: 0.08, fy: 0.2, r: -10 },
    { id: "cat", cls: "st-cat", text: "(=^･ω･^=)", anchor: "#notes .sec-head", fx: 0.02, fy: 0.15, r: 6 },
    { id: "trust", cls: "st-trust", text: "i trust specific", anchor: "#onchain .sec-head", fx: 0.72, fy: 0.3, r: 5 }
  ];
  var saved = {};
  try { saved = JSON.parse(ls("dt-stickers") || "{}") || {}; } catch (e) { saved = {}; }
  var stickerEls = [];
  function placeDefault(s, node) {
    var a = $(s.anchor);
    if (!a) return;
    var r = a.getBoundingClientRect();
    var x = r.left + window.scrollX + r.width * s.fx, y = r.top + window.scrollY + r.height * s.fy;
    x = Math.max(8, Math.min(document.documentElement.clientWidth - node.offsetWidth - 8, x));
    node.style.setProperty("--x", x.toFixed(0) + "px");
    node.style.setProperty("--y", y.toFixed(0) + "px");
  }
  function placeAll() {
    stickerEls.forEach(function (o) {
      var sv = saved[o.s.id];
      if (sv) {
        var x = Math.max(4, Math.min(document.documentElement.clientWidth - o.node.offsetWidth - 4, sv.x));
        o.node.style.setProperty("--x", x + "px");
        o.node.style.setProperty("--y", sv.y + "px");
      } else placeDefault(o.s, o.node);
    });
  }
  STICKERS.forEach(function (s) {
    var node = el("div", "sticker " + s.cls, s.text);
    node.setAttribute("aria-hidden", "true");
    node.style.setProperty("--r", s.r + "deg");
    var hint = el("span", "st-hint", "drag me");
    node.appendChild(hint);
    document.body.appendChild(node);
    stickerEls.push({ s: s, node: node });
    var start = null;
    node.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      node.setPointerCapture(e.pointerId);
      var cx = parseFloat(node.style.getPropertyValue("--x")) || 0, cy = parseFloat(node.style.getPropertyValue("--y")) || 0;
      start = { px: e.pageX, py: e.pageY, x: cx, y: cy, moved: false };
      node.classList.add("dragging");
    });
    node.addEventListener("pointermove", function (e) {
      if (!start) return;
      var dx = e.pageX - start.px, dy = e.pageY - start.py;
      if (Math.abs(dx) + Math.abs(dy) > 3) start.moved = true;
      node.style.setProperty("--x", (start.x + dx).toFixed(0) + "px");
      node.style.setProperty("--y", (start.y + dy).toFixed(0) + "px");
      node.style.setProperty("--r", (s.r + Math.max(-14, Math.min(14, dx * 0.05))).toFixed(1) + "deg");
    });
    function end(e) {
      if (!start) return;
      node.classList.remove("dragging");
      node.style.setProperty("--r", s.r + "deg");
      if (start.moved) {
        saved[s.id] = { x: parseFloat(node.style.getPropertyValue("--x")), y: parseFloat(node.style.getPropertyValue("--y")) };
        ls("dt-stickers", JSON.stringify(saved));
        var r = node.getBoundingClientRect();
        sparkle(r.left + r.width / 2, r.top + r.height / 2, 5);
      } else {
        node.classList.remove("spin"); void node.offsetWidth; node.classList.add("spin");
      }
      start = null;
      if (e && e.pointerId !== undefined && node.hasPointerCapture(e.pointerId)) node.releasePointerCapture(e.pointerId);
    }
    node.addEventListener("pointerup", end);
    node.addEventListener("pointercancel", end);
  });
  // wait for fonts and images so anchors sit where they will stay
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () { setTimeout(placeAll, 60); });
  var rsz;
  window.addEventListener("resize", function () { clearTimeout(rsz); rsz = setTimeout(placeAll, 200); });
  window.DTStickersReset = function () { saved = {}; ls("dt-stickers", null); placeAll(); };

  // ---------- select some text, post it ----------
  var qp = el("div", "quote-pop");
  qp.setAttribute("role", "toolbar");
  qp.setAttribute("aria-label", "share the selected text");
  var qx = el("a", "", "post on x ↗");
  qx.target = "_blank"; qx.rel = "noopener noreferrer";
  var qc = el("button", "", "copy");
  qc.type = "button";
  qp.appendChild(qx); qp.appendChild(qc);
  document.body.appendChild(qp);
  var selText = "";
  function hideQp() { qp.classList.remove("on"); }
  function checkSelection() {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) { hideQp(); return; }
    var node = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentNode);
    if (!node || !node.closest || !node.closest("main, .foot") || node.closest("input, textarea, .glyph, .sticker")) { hideQp(); return; }
    var t = sel.toString().replace(/\s+/g, " ").trim();
    if (t.length < 6 || t.length > 260) { hideQp(); return; }
    selText = t;
    var r = sel.getRangeAt(0).getBoundingClientRect();
    if (!r.width && !r.height) { hideQp(); return; }
    qx.href = "https://x.com/intent/post?text=" + encodeURIComponent("“" + t + "”\n\nvia @devtrotter_fr");
    var w = qp.offsetWidth || 170;
    var x = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2));
    var y = Math.max(8, r.top - 48);
    qp.style.setProperty("--qx", x.toFixed(0) + "px");
    qp.style.setProperty("--qy", y.toFixed(0) + "px");
    qp.classList.add("on");
  }
  document.addEventListener("mouseup", function (e) { if (!qp.contains(e.target)) setTimeout(checkSelection, 10); });
  document.addEventListener("keyup", function (e) { if (e.shiftKey) checkSelection(); });
  document.addEventListener("touchend", function () { setTimeout(checkSelection, 250); }, { passive: true });
  window.addEventListener("scroll", hideQp, { passive: true });
  document.addEventListener("mousedown", function (e) { if (!qp.contains(e.target)) hideQp(); });
  qc.addEventListener("click", function () {
    if (navigator.clipboard) navigator.clipboard.writeText(selText + " (devtrotter)").then(function () { toast("copied, with credit."); hideQp(); });
  });
  qx.addEventListener("click", function () { setTimeout(hideQp, 100); });

  // ---------- 1998 ----------
  var bar = el("div", "y98-bar");
  bar.setAttribute("aria-hidden", "true");
  var visits = (parseInt(ls("dt-visits") || "0", 10) || 0) + 1;
  ls("dt-visits", String(visits));
  bar.appendChild(el("span", "", "welcome to my homepage!! this site is under construction · best viewed in netscape navigator 4 at 800×600 · sign my guestbook · you have visited this page " + visits + (visits === 1 ? " time" : " times")));
  document.body.appendChild(bar);
  var fine98 = $(".fine");
  var uc = el("p", "y98-uc");
  uc.innerHTML = "<b>under construction</b>";
  var foothi = $(".foot-hi");
  if (foothi) foothi.insertBefore(uc, foothi.firstChild);
  var counter = el("span", "y98-counter", String(visits).padStart(6, "0"));
  if (fine98) fine98.appendChild(counter);
  var btn = el("button", "tbtn y98-btn", "view this site in 1998");
  btn.type = "button";
  var ringWeb = $(".ring-web");
  if (ringWeb) ringWeb.appendChild(btn);
  function set1998(on) {
    var apply = function () {
      root.classList.toggle("y1998", on);
      btn.textContent = on ? "back to " + new Date().getFullYear() : "view this site in 1998";
      document.dispatchEvent(new Event("dt-theme"));
    };
    if (document.startViewTransition && !reduced) document.startViewTransition(apply); else apply();
    toast(on ? "welcome to 1998. mind the dial-up." : "back to now.");
    try { sessionStorage.setItem("dt-1998", on ? "1" : ""); } catch (e) {}
  }
  btn.addEventListener("click", function () { set1998(!root.classList.contains("y1998")); });
  try { if (sessionStorage.getItem("dt-1998") === "1") { root.classList.add("y1998"); btn.textContent = "back to " + new Date().getFullYear(); } } catch (e) {}

  // ---------- extra keys: 9 for 1998, s to tidy the stickers ----------
  document.addEventListener("keydown", function (e) {
    if (e.target.closest && e.target.closest("input, textarea, select")) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "9") set1998(!root.classList.contains("y1998"));
    else if (e.key === "s" || e.key === "S") { window.DTStickersReset(); toast("stickers back where they started."); }
  });
  var keysList = $("#keys ul");
  if (keysList) {
    var li1 = el("li"); li1.innerHTML = "<kbd>9</kbd> this site, in 1998";
    var li2 = el("li"); li2.innerHTML = "<kbd>s</kbd> put the stickers back";
    var li3 = el("li", "", "select any sentence to post it on x");
    keysList.appendChild(li1); keysList.appendChild(li2); keysList.appendChild(li3);
  }

  // ---------- the tab title follows you down ----------
  var baseTitle = document.title;
  if ("IntersectionObserver" in window) {
    var tio = new IntersectionObserver(function (en) {
      en.forEach(function (e) {
        if (!e.isIntersecting || document.hidden) return;
        var z = e.target.getAttribute("data-zone");
        document.title = e.target.classList.contains("hero") ? baseTitle : "devtrotter ✦ " + z;
      });
    }, { threshold: 0.35 });
    $$("[data-zone]").forEach(function (z) { tio.observe(z); });
  }
})();
