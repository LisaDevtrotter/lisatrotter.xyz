/* toys.js · the small things in "things i made":
   the daily glyph, the rabbit hole roulette, the bubble machine, the 88x31 button maker. */
(function () {
  "use strict";
  function $(s) { return document.querySelector(s); }
  function $$(s) { return [].slice.call(document.querySelectorAll(s)); }
  function toast(m) { if (window.DTToast) window.DTToast(m); }
  function mulberry(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // ---------- daily glyph ----------
  // glyph #0 is 11 december 2023, the day this account first showed up
  var FIRST = Date.UTC(2023, 11, 11), DAY = 86400000;
  var glyphEl = $("#glyph"), glyphLabel = $("#glyph-label");
  var offset = 0, current = "";
  if (glyphEl) glyphEl.setAttribute("role", "img");
  function todayUTC() { var d = new Date(); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()); }
  function makeGlyph(n) {
    var R = mulberry((n * 2654435761) >>> 0);
    var sets = [[" ", ".", "o", "O"], [" ", "/", "\\", "|", "-"], [" ", ".", "+", "*", "#"], [" ", ":", "=", "~"], [" ", "x", ".", "X", "+"], [" ", ".", "|", "-", "+"], [" ", "o", "."]];
    var set = sets[(R() * sets.length) | 0];
    var S = 21, half = 10;
    var m1 = 1 + ((R() * 9) | 0), m2 = 1 + ((R() * 9) | 0), m3 = (R() * 7) | 0;
    var mod = set.length + ((R() * 3) | 0), sh = (R() * 3) | 0, eight = R() < 0.5;
    var rows = [];
    for (var y = 0; y < S; y++) {
      var row = "";
      for (var x = 0; x < S; x++) {
        var qx = Math.abs(x - half), qy = Math.abs(y - half);
        if (eight && qx < qy) { var t = qx; qx = qy; qy = t; }
        var v = ((qx * qx * m1 + qy * qy * m2 + qx * qy * m3 + n) >> sh) % mod;
        row += v < set.length ? set[v] : " ";
      }
      rows.push(row);
    }
    return rows.join("\n");
  }
  function showGlyph() {
    if (!glyphEl) return;
    var day = todayUTC() + offset * DAY;
    var n = Math.round((day - FIRST) / DAY);
    current = makeGlyph(n);
    glyphEl.textContent = current;
    var iso = new Date(day).toISOString().slice(0, 10);
    glyphLabel.textContent = "glyph #" + n + " · " + iso + (offset > 0 ? " · early" : offset === 0 ? " · today" : "");
    glyphEl.dataset.n = n;
  }
  $$("[data-glyph]").forEach(function (b) {
    b.addEventListener("click", function () {
      offset += parseInt(b.getAttribute("data-glyph"), 10);
      glyphEl.animate([{ opacity: 0.2, transform: "scale(0.96)" }, { opacity: 1, transform: "none" }], { duration: 300, easing: "ease-out" });
      showGlyph();
    });
  });
  var gc = $("#glyph-copy");
  if (gc) gc.addEventListener("click", function () {
    var text = current + "\n\nglyph #" + glyphEl.dataset.n + " · devtrotter";
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { toast("glyph #" + glyphEl.dataset.n + " copied. paste it somewhere odd."); }, function () { toast("clipboard blocked. copy the glyph by hand."); });
  });
  showGlyph();

  // ---------- rabbit hole roulette ----------
  var finds = $$("#finds-list a").map(function (a) {
    return { href: a.href, dom: a.querySelector(".dom").textContent, why: a.querySelector(".why").textContent };
  });
  window.DTFinds = finds;
  window.DTRandomFind = function () { return finds[(Math.random() * finds.length) | 0]; };
  var slot = $("#slot"), slotText = slot && slot.querySelector(".slot-text"), go = $("#slot-go"), spin = $("#spin");
  var why = document.createElement("p");
  why.className = "toy-sub slot-why";
  if (slot) slot.parentNode.insertBefore(why, slot.nextSibling);
  var spinning = false;
  if (spin) spin.addEventListener("click", function () {
    if (spinning || !finds.length) return;
    spinning = true;
    slot.classList.add("rolling");
    go.hidden = true; why.textContent = "";
    var final = window.DTRandomFind(), steps = 0, total = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 18;
    slot.setAttribute("aria-busy", "true");
    (function step() {
      steps++;
      slotText.textContent = steps < total ? finds[(Math.random() * finds.length) | 0].dom : final.dom;
      slotText.animate([{ transform: "translateY(-60%)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: Math.min(260, 40 + steps * 12), easing: "ease-out" });
      if (steps < total) setTimeout(step, 30 + steps * steps * 1.6);
      else {
        slot.classList.remove("rolling");
        slot.setAttribute("aria-busy", "false");
        go.href = final.href; go.hidden = false;
        why.textContent = final.why;
        spinning = false;
        if (window.DTBubbles) { var r = slot.getBoundingClientRect(); window.DTBubbles.blow(r.left + r.width / 2, r.top + 10, 10); }
      }
    })();
  });

  // ---------- bubble machine ----------
  function bm(id, key) {
    var el = $(id);
    if (!el) return;
    function apply() { if (window.DTBubbles) { var o = {}; o[key] = parseFloat(el.value); window.DTBubbles.set(o); } }
    el.addEventListener("input", apply);
    apply();
  }
  bm("#bm-size", "size"); bm("#bm-wind", "wind"); bm("#bm-amount", "amount");
  $$(".pal").forEach(function (b) {
    b.addEventListener("click", function () {
      $$(".pal").forEach(function (x) { x.classList.remove("on"); x.setAttribute("aria-pressed", "false"); });
      b.classList.add("on"); b.setAttribute("aria-pressed", "true");
      if (window.DTBubbles) window.DTBubbles.set({ palette: b.getAttribute("data-pal") });
    });
  });
  var blow = $("#bm-blow");
  if (blow) blow.addEventListener("click", function () {
    if (!window.DTBubbles) return;
    var r = blow.getBoundingClientRect();
    window.DTBubbles.blow(r.left + r.width / 2, r.top, 40);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) toast("you asked your system for less motion, so i kept the bubbles home.");
  });

  // ---------- 88x31 button maker ----------
  var bc = $("#btn-canvas"), bi = $("#btn-text"), bs = $("#btn-style"), bsave = $("#btn-save");
  if (bc) bc.setAttribute("role", "img");
  var STYLES = [
    ["#ff8ccf", "#ffe8f5", "#3a0f2a"], ["#000080", "#3a3aff", "#ffffff"], ["#0c0a1a", "#3b2f7a", "#8ef3d1"],
    ["#ffd08a", "#fff4dc", "#402a00"], ["#8ef3d1", "#e8fff7", "#0b3d2e"], ["#a393ff", "#efeaff", "#1d1932"],
    ["#c0c0c0", "#ececec", "#111111"], ["#111111", "#333333", "#ffd08a"]
  ];
  var style = 3;
  function drawButton() {
    if (!bc) return;
    var g = bc.getContext("2d"), s = STYLES[style];
    g.imageSmoothingEnabled = false;
    var gr = g.createLinearGradient(0, 0, 0, 31);
    gr.addColorStop(0, s[1]); gr.addColorStop(1, s[0]);
    g.fillStyle = gr; g.fillRect(0, 0, 88, 31);
    g.fillStyle = "rgba(255,255,255,0.85)"; g.fillRect(0, 0, 88, 1); g.fillRect(0, 0, 1, 31);
    g.fillStyle = "rgba(0,0,0,0.55)"; g.fillRect(0, 30, 88, 1); g.fillRect(87, 0, 1, 31);
    g.fillStyle = "rgba(0,0,0,0.18)"; g.fillRect(1, 29, 86, 1); g.fillRect(86, 1, 1, 28);
    var words = (bi.value || " ").toUpperCase().split(/\s+/), lines = [""];
    g.font = "8px Silkscreen, monospace";
    words.forEach(function (w) {
      var tryL = lines[lines.length - 1] ? lines[lines.length - 1] + " " + w : w;
      if (g.measureText(tryL).width <= 80 || !lines[lines.length - 1]) lines[lines.length - 1] = tryL;
      else if (lines.length < 2) lines.push(w);
      else lines[1] += " " + w;
    });
    g.textAlign = "center"; g.textBaseline = "middle";
    var y0 = lines.length === 1 ? 16 : 11;
    lines.forEach(function (l, i) {
      g.fillStyle = "rgba(0,0,0,0.25)"; g.fillText(l, 45, y0 + i * 10 + 1);
      g.fillStyle = s[2]; g.fillText(l, 44, y0 + i * 10);
    });
  }
  if (bc) {
    bi.addEventListener("input", drawButton);
    bs.addEventListener("click", function () { style = (style + 1 + ((Math.random() * (STYLES.length - 1)) | 0)) % STYLES.length; drawButton(); });
    bsave.addEventListener("click", function () {
      bsave.href = bc.toDataURL("image/png");
      bsave.download = (bi.value || "button").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-88x31.png";
    });
    (document.fonts ? document.fonts.load("8px Silkscreen") : Promise.resolve()).then(drawButton, drawButton);
  }
})();
