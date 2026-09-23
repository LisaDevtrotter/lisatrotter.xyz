/* main.js · everything that isn't bubbles or pictures:
   theme, menu, the wordmark that leans towards you, the depth gauge, the status bar,
   filters, notes, the guestbook only you can read, keyboard secrets. */
(function () {
  "use strict";
  var root = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return [].slice.call((c || document).querySelectorAll(s)); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  var pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

  // ---------- toast ----------
  var toastEl = $("#toast"), toastT;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("on");
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove("on"); }, 2800);
  }
  window.DTToast = toast;

  // ---------- theme ----------
  function theme() {
    var t = root.getAttribute("data-theme");
    if (t) return t;
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  function applyTheme(t) {
    root.setAttribute("data-theme", t);
    store("dt-theme", t);
    document.dispatchEvent(new Event("dt-theme"));
  }
  function switchTheme(fromX, fromY) {
    var next = theme() === "light" ? "dark" : "light";
    if (document.startViewTransition && !reduced) {
      root.style.setProperty("--vt-x", (fromX || window.innerWidth - 40) + "px");
      root.style.setProperty("--vt-y", (fromY || 30) + "px");
      document.startViewTransition(function () { applyTheme(next); });
    } else applyTheme(next);
  }
  $("#theme-toggle").addEventListener("click", function (e) {
    var r = e.currentTarget.getBoundingClientRect();
    switchTheme(r.left + r.width / 2, r.top + r.height / 2);
  });

  // ---------- bubbles toggle ----------
  var bt = $("#bubble-toggle");
  function syncBubbles() { if (window.DTBubbles) bt.setAttribute("aria-pressed", String(window.DTBubbles.on)); }
  bt.addEventListener("click", function () {
    if (!window.DTBubbles) return;
    var on = window.DTBubbles.toggle();
    syncBubbles();
    toast(on ? "bubbles on. move your cursor." : "bubbles off. you can read in peace.");
  });
  syncBubbles();

  // ---------- menu ----------
  var menu = $("#menu"), mb = $("#menu-btn");
  function setMenu(open) {
    menu.hidden = !open;
    mb.setAttribute("aria-expanded", String(open));
    mb.textContent = open ? "close" : "menu";
    root.style.overflow = open ? "hidden" : "";
  }
  mb.addEventListener("click", function () { setMenu(menu.hidden); });
  $$("#menu a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });

  // ---------- header, depth gauge, zones ----------
  var top = $("#top-bar"), gauge = $("#gauge"), gFill = $("#gauge-fill"), gM = $("#gauge-m"), gZone = $("#gauge-zone");
  var zones = $$("[data-zone]");
  var navLinks = $$(".nav a");
  var statusEl = $("#status"), statusText = $("#status-text"), statusDefault = "document: done";
  var zoneNow = "", statusT, hoveringLink = false;
  function setStatus(t, busy) {
    statusText.textContent = t;
    statusEl.classList.toggle("busy", !!busy);
  }
  function onScroll() {
    var y = window.scrollY, max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    var p = Math.min(1, Math.max(0, y / max));
    top.classList.toggle("scrolled", y > 30);
    root.style.setProperty("--depth", p.toFixed(3));
    gFill.style.height = (p * 100).toFixed(1) + "%";
    gM.textContent = Math.round(p * 1000);
    gauge.classList.toggle("live", y > 40);
    statusEl.classList.toggle("live", y > window.innerHeight * 0.6);
    var z = zones[0];
    for (var i = 0; i < zones.length; i++) if (zones[i].getBoundingClientRect().top < window.innerHeight * 0.45) z = zones[i];
    var name = z.getAttribute("data-zone");
    if (name !== zoneNow) {
      zoneNow = name;
      gZone.textContent = name;
      navLinks.forEach(function (a) { a.classList.toggle("here", z.id && a.getAttribute("href") === "#" + z.id); });
      if (!hoveringLink && y > 40) {
        setStatus("now entering: " + name, true);
        clearTimeout(statusT);
        statusT = setTimeout(function () { if (!hoveringLink) setStatus(statusDefault); }, 1800);
      }
    }
  }
  var ticking = false;
  window.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { onScroll(); ticking = false; });
  }, { passive: true });
  onScroll();

  // ---------- status bar shows where links go, like old browsers did ----------
  document.addEventListener("mouseover", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    hoveringLink = true;
    var h = a.getAttribute("href");
    if (h.charAt(0) === "#") setStatus(h.length > 1 ? "jump to " + h.slice(1) : "going nowhere");
    else setStatus(a.href.replace(/^https?:\/\//, "").replace(/\/$/, ""));
  });
  document.addEventListener("mouseout", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    hoveringLink = false;
    setStatus(statusDefault);
  });

  // ---------- the wordmark leans towards the cursor ----------
  var letters = $$(".wordmark .l");
  var wmFrame = 0;
  var wdMax = window.innerWidth < 600 ? 88 : 100;
  function lean(px, py) {
    var rects = letters.map(function (l) { return l.getBoundingClientRect(); });
    letters.forEach(function (l, i) {
      var r = rects[i];
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var dx = px - cx, dy = py - cy, d = Math.sqrt(dx * dx + dy * dy);
      var k = Math.max(0, 1 - d / 300);
      k = k * k * (3 - 2 * k);
      l.style.setProperty("--w", Math.round(620 + k * 180));
      l.style.setProperty("--wd", Math.round(80 + k * (wdMax - 80)));
      l.style.setProperty("--ty", (-k * 14).toFixed(1) + "px");
      l.style.setProperty("--rot", ((dx > 0 ? -1 : 1) * k * 5).toFixed(2) + "deg");
    });
  }
  if (!reduced && letters.length) {
    if (fine) {
      window.addEventListener("pointermove", function (e) {
        if (wmFrame) return;
        wmFrame = requestAnimationFrame(function () { wmFrame = 0; if (window.scrollY < window.innerHeight) lean(e.clientX, e.clientY); });
      }, { passive: true });
    } else {
      // no cursor on phones: a slow wave walks through the letters instead
      var heroOn = true;
      if ("IntersectionObserver" in window) new IntersectionObserver(function (en) {
        var was = heroOn;
        heroOn = en[en.length - 1].isIntersecting;
        if (heroOn && !was) requestAnimationFrame(wave);
      }).observe(document.querySelector(".hero"));
      var wave = function (now) {
        if (!heroOn || document.hidden) return;
        if (window.scrollY < window.innerHeight) {
          var first = letters[0].getBoundingClientRect(), last = letters[letters.length - 1].getBoundingClientRect();
          var x = first.left + ((now / 2600) % 1.6 - 0.3) * (last.right - first.left);
          lean(x, first.top + first.height / 2);
        }
        requestAnimationFrame(wave);
      };
      requestAnimationFrame(wave);
    }
    letters.forEach(function (l) {
      l.addEventListener("click", function () {
        l.animate([{ transform: "translateY(0)" }, { transform: "translateY(-28%) rotate(-8deg)" }, { transform: "translateY(0)" }], { duration: 500, easing: "cubic-bezier(.2,.9,.2,1.4)" });
        var r = l.getBoundingClientRect();
        if (window.DTBubbles) window.DTBubbles.blow(r.left + r.width / 2, r.top + r.height * 0.3, 8);
      });
    });
  }

  // ---------- chips: currently exploring ----------
  var note = $("#chip-note"), typeT;
  function typeOut(el, text) {
    clearInterval(typeT);
    if (reduced) { el.textContent = text; return; }
    var i = 0;
    el.textContent = "";
    el.setAttribute("aria-busy", "true");
    typeT = setInterval(function () {
      i += 2;
      el.textContent = text.slice(0, i);
      if (i >= text.length) { clearInterval(typeT); el.setAttribute("aria-busy", "false"); }
    }, 18);
  }
  $$(".chip").forEach(function (c) {
    c.setAttribute("aria-pressed", "false");
    c.addEventListener("click", function () {
      var on = c.getAttribute("aria-pressed") !== "true";
      $$(".chip").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
      c.setAttribute("aria-pressed", String(on));
      typeOut(note, on ? c.getAttribute("data-note") : "tap a topic");
      if (on && window.DTBubbles) { var r = c.getBoundingClientRect(); window.DTBubbles.blow(r.left + r.width / 2, r.top, 6); }
    });
  });

  // ---------- local clock (france) ----------
  var clock = $("#clock"), daypart = $("#daypart");
  var fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hour12: false });
  function tickClock() {
    var t = fmt.format(new Date());
    clock.textContent = t;
    var h = parseInt(t.slice(0, 2), 10);
    daypart.textContent = h < 6 ? "late night, reading" : h < 12 ? "morning" : h < 18 ? "afternoon" : h < 22 ? "evening" : "night shift";
  }
  tickClock();
  setInterval(tickClock, 20000);

  // ---------- rabbit holes ----------
  $$(".meter").forEach(function (m) { m.style.setProperty("--v", m.getAttribute("data-v")); });
  $$(".steps li").forEach(function (li, i, all) {
    var idx = [].indexOf.call(li.parentNode.children, li);
    li.style.setProperty("--i", idx);
  });

  // ---------- finds: favicon colours, filters, peek window ----------
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  var findItems = $$("#finds-list li");
  findItems.forEach(function (li) {
    var dom = li.querySelector(".dom").textContent;
    li.querySelector(".fav").style.setProperty("--fav", "hsl(" + (hash(dom) % 360) + " 85% 68%)");
  });
  var count = $("#finds-count");
  function filterFinds(f) {
    var n = 0;
    findItems.forEach(function (li) {
      var show = f === "all" || li.getAttribute("data-cat") === f;
      li.classList.toggle("hide", !show);
      if (show) n++;
    });
    count.textContent = n + (n === 1 ? " link" : " links");
  }
  $$(".found .filter").forEach(function (b) {
    b.addEventListener("click", function () {
      $$(".found .filter").forEach(function (x) { x.classList.remove("on"); x.setAttribute("aria-pressed", "false"); });
      b.classList.add("on"); b.setAttribute("aria-pressed", "true");
      filterFinds(b.getAttribute("data-f"));
    });
  });
  filterFinds("all");

  var peek = $("#peek"), peekCv = $("#peek-canvas"), peekDom = $("#peek-dom");
  if (fine && peek) {
    $$("#finds-list a").forEach(function (a) {
      a.addEventListener("mouseenter", function () {
        var dom = a.querySelector(".dom").textContent, h = hash(dom);
        peekDom.textContent = dom;
        if (window.DTSpecimens) {
          var algos = ["flow", "truchet", "soap", "contour", "moire", "glyphs", "dusk", "desordres"];
          window.DTSpecimens.draw(algos[h % algos.length], peekCv, h, 240, 120);
        }
        peek.classList.add("on");
      });
      a.addEventListener("mouseleave", function () { peek.classList.remove("on"); });
      a.addEventListener("mousemove", function (e) {
        var x = e.clientX + 22, y = e.clientY + 18;
        if (x + 250 > window.innerWidth) x = e.clientX - 262;
        if (y + 160 > window.innerHeight) y = e.clientY - 170;
        peek.style.translate = x + "px " + y + "px";
      });
    });
  }

  // ---------- notes filter ----------
  var notesList = $(".notes-list"), notes = $$(".note");
  $$(".note-filters .filter").forEach(function (b) {
    b.addEventListener("click", function () {
      $$(".note-filters .filter").forEach(function (x) { x.classList.remove("on"); x.setAttribute("aria-pressed", "false"); });
      b.classList.add("on"); b.setAttribute("aria-pressed", "true");
      var f = b.getAttribute("data-n");
      notes.forEach(function (n) { n.classList.toggle("hide", f !== "all" && n.getAttribute("data-n") !== f); });
      notesList.classList.toggle("filtered", f !== "all");
    });
  });

  // ---------- reveal on scroll ----------
  var revealables = $$(".hole, .card, .note, .spec, .toy, .win, .portrait, .about-text, .links, .foot-grid > div");
  if ("IntersectionObserver" in window && !reduced) {
    revealables.forEach(function (el) { el.classList.add("reveal"); });
    var rio = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); rio.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealables.forEach(function (el) { rio.observe(el); });
    // safety net: if the observer stays silent (some embedded or headless browsers), reveal what is on screen
    var sweepT = 0;
    var sweep = function () {
      clearTimeout(sweepT);
      sweepT = setTimeout(function () {
        revealables.forEach(function (el) {
          if (el.classList.contains("in")) return;
          var r = el.getBoundingClientRect();
          if (r.top < window.innerHeight * 0.95 && r.bottom > 0) el.classList.add("in");
        });
      }, 250);
    };
    window.addEventListener("scroll", sweep, { passive: true });
    setTimeout(sweep, 1200);
  }

  // ---------- headings decode themselves the first time you see them ----------
  var GLYPHS = "!<>-_\\/[]{}=+*^?#01✦○";
  function scramble(el) {
    var nodes = [], walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) nodes.push({ n: walker.currentNode, t: walker.currentNode.nodeValue });
    el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
    var total = nodes.reduce(function (s, x) { return s + x.t.length; }, 0), start = performance.now(), dur = 900;
    (function frame(now) {
      var p = Math.min(1, (now - start) / dur), shown = Math.floor(p * total), c = 0;
      nodes.forEach(function (x) {
        var out = "";
        for (var i = 0; i < x.t.length; i++, c++) {
          var ch = x.t[i];
          out += (c < shown || ch === " ") ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
        x.n.nodeValue = out;
      });
      if (p < 1) requestAnimationFrame(frame);
    })(start);
  }
  if ("IntersectionObserver" in window && !reduced) {
    var sio = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { scramble(e.target); sio.unobserve(e.target); } });
    }, { threshold: 0.6 });
    $$("h2.scramble").forEach(function (h) { sio.observe(h); });
  }

  // ---------- cursor ring ----------
  var ring = $(".ring"), ringLabel = $(".ring-label");
  if (fine && ring && !reduced) {
    var rx = pointer.x, ry = pointer.y;
    ring.classList.add("on");
    (function follow() {
      rx += (pointer.x - rx) * 0.22; ry += (pointer.y - ry) * 0.22;
      ring.style.transform = "translate(" + rx.toFixed(1) + "px," + ry.toFixed(1) + "px)";
      requestAnimationFrame(follow);
    })();
    document.addEventListener("mouseover", function (e) {
      var t = e.target.closest && e.target.closest("a, button, summary, .spec-frame, input, .l, label");
      ring.classList.toggle("hot", !!t);
      if (!t) return;
      var label = "";
      if (t.matches(".spec-frame")) label = "reseed";
      else if (t.matches(".l")) label = "boing";
      else if (t.matches("a")) label = t.getAttribute("href").charAt(0) === "#" ? "jump" : "open ↗";
      else if (t.matches("summary")) label = "open";
      ringLabel.textContent = label;
    });
    document.addEventListener("mouseleave", function () { ring.classList.remove("on"); });
    document.addEventListener("mouseenter", function () { ring.classList.add("on"); });
  }
  window.addEventListener("pointermove", function (e) { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });

  // ---------- magnetic buttons ----------
  if (fine && !reduced) {
    $$(".magnetic").forEach(function (b) {
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        b.style.transform = "translate(" + ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) + "px," + ((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1) + "px)";
      });
      b.addEventListener("pointerleave", function () { b.style.transform = ""; });
    });
  }

  // ---------- the big bubble can be popped ----------
  var hero = $(".hero");
  hero.addEventListener("click", function (e) {
    if (e.target.closest("a, button, input, summary, label, .specimen-label, .l")) return;
    if (!window.DTSoap || !window.DTSoap.hit(e.clientX, e.clientY)) return;
    var info = window.DTSoap.pop();
    if (!info) return;
    if (window.DTBubbles) window.DTBubbles.burst(info.x, info.y, info.r);
    toast("you popped the big one. give it a second, it grows back.");
  });
  hero.addEventListener("pointermove", function (e) {
    if (!fine || !window.DTSoap) return;
    var over = !e.target.closest("a, button, .specimen-label, .l") && window.DTSoap.hit(e.clientX, e.clientY);
    hero.style.cursor = over ? "pointer" : "";
    if (!ring) return;
    if (over) { ring.classList.add("hot"); ringLabel.textContent = "pop"; }
    else if (ringLabel.textContent === "pop") { ring.classList.remove("hot"); ringLabel.textContent = ""; }
  });

  // ---------- odometer ----------
  var odo = $("#odometer"), lastOdo = "";
  odo.removeAttribute("aria-live");
  function renderOdo(n) {
    var s = String(n).padStart(6, "0");
    if (s === lastOdo) return;
    var html = document.createDocumentFragment();
    for (var i = 0; i < s.length; i++) {
      var sp = document.createElement("span");
      sp.textContent = s[i];
      if (lastOdo && lastOdo[i] !== s[i]) sp.className = "tick";
      html.appendChild(sp);
    }
    odo.textContent = "";
    odo.appendChild(html);
    lastOdo = s;
  }
  renderOdo(window.DTBubbles ? window.DTBubbles.popped : 0);
  var MILESTONES = { 10: "ten popped. check the counter at the bottom.", 100: "a hundred bubbles. i should have made this harder.", 1000: "a thousand pops. go outside, then come back." };
  document.addEventListener("dt-pop", function (e) {
    renderOdo(e.detail);
    if (MILESTONES[e.detail]) toast(MILESTONES[e.detail]);
  });

  // ---------- guestbook (stays in this browser) ----------
  var gbForm = $("#gb-form"), gbText = $("#gb-text"), gbList = $("#gb-list");
  function gbLoad() { try { var x = JSON.parse(store("dt-guestbook") || "[]"); return Array.isArray(x) ? x : []; } catch (e) { return []; } }
  function gbRender() {
    var items = gbLoad();
    gbList.textContent = "";
    items.slice().reverse().forEach(function (it) {
      var li = document.createElement("li"), d = new Date(it.t), sp = document.createElement("span");
      sp.textContent = String(d.getDate()).padStart(2, "0") + "·" + String(d.getMonth() + 1).padStart(2, "0") + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
      li.appendChild(sp);
      li.appendChild(document.createTextNode(it.text));
      gbList.appendChild(li);
    });
  }
  gbForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = gbText.value.trim().slice(0, 140);
    if (!text) return;
    var items = gbLoad();
    items.push({ t: Date.now(), text: text });
    store("dt-guestbook", JSON.stringify(items.slice(-50)));
    gbText.value = "";
    gbRender();
    toast("signed. you're the only one who can read it.");
  });
  gbRender();

  // ---------- the rabbit ring ----------
  function ringIndex(step) {
    var list = window.DTFinds || [];
    if (!list.length) return null;
    var v = null;
    try { v = sessionStorage.getItem("dt-ring"); } catch (e) {}
    var i = parseInt(v || String((Math.random() * list.length) | 0), 10);
    i = (i + step + list.length) % list.length;
    try { sessionStorage.setItem("dt-ring", String(i)); } catch (e) {}
    return list[i];
  }
  [["#ring-prev", -1], ["#ring-next", 1], ["#ring-rand", 0]].forEach(function (p) {
    var a = $(p[0]);
    a.addEventListener("click", function () {
      var f = p[1] === 0 ? window.DTRandomFind() : ringIndex(p[1]);
      if (f) a.href = f.href;
    });
  });

  // ---------- keyboard ----------
  var keys = $("#keys");
  var KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"], kpos = 0;
  document.addEventListener("keydown", function (e) {
    if (e.target.closest && e.target.closest("input, textarea, select")) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    kpos = k === KONAMI[kpos] ? kpos + 1 : (k === "ArrowUp" ? (kpos === 2 ? 2 : 1) : 0);
    if (kpos === KONAMI.length) {
      kpos = 0;
      if (window.DTBubbles) window.DTBubbles.storm();
      toast("weather warning: bubbles.");
      return;
    }
    if (kpos > 1) return;
    if (k === "b" && window.DTBubbles) window.DTBubbles.blow(pointer.x, pointer.y, 30);
    else if (k === "r" && window.DTRandomFind) {
      var f = window.DTRandomFind();
      window.open(f.href, "_blank", "noopener");
      toast("off you go: " + f.dom);
    } else if (k === "t") switchTheme(pointer.x, pointer.y);
    else if (k === "g") {
      root.classList.toggle("show-grid");
      toast(root.classList.contains("show-grid") ? "the grid, and the places i ignored it." : "grid hidden.");
    } else if (k === "?" && keys && keys.showModal) keys.showModal();
    else if (k === "Escape" && !menu.hidden) setMenu(false);
  });

  // ---------- small things ----------
  var title = document.title;
  document.addEventListener("visibilitychange", function () { document.title = document.hidden ? "✦ in another tab…" : title; });
  if (window.console && console.log) {
    console.log("%c devtrotter ✦ ", "background:#ff8ccf;color:#0b0918;font:700 14px monospace;padding:4px 8px;border-radius:4px",
      "\nhello, source reader. i wrote this by hand and left comments where they help. take what you need,\nand try pressing ? on the page.");
  }
})();
