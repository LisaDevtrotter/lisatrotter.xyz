/* bubbles.js · the bubbles that follow your cursor.
   move to blow them, sweep back through old ones to pop them, click to pop what's under you.
   each bubble is a pre-rendered sprite (iridescent rim + two highlights) drawn rotated,
   so the colours slide around the rim as it drifts. */
(function () {
  "use strict";
  var cv = document.getElementById("bubbles");
  if (!cv) return;
  var ctx = cv.getContext("2d");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var W = 0, H = 0, dpr = 1;
  var bubbles = [], drops = [];
  var running = false, last = 0;
  var S = { size: 1, wind: 0, amount: 1, palette: "film", on: true };
  var popped = 0;
  var SPR = 128, VARIANTS = 6;
  var sprites = {};
  var TAU = Math.PI * 2;

  try {
    var saved = localStorage.getItem("dt-bubbles");
    S.on = saved ? saved === "on" : !reduced;
    popped = parseInt(localStorage.getItem("dt-popped") || "0", 10) || 0;
  } catch (e) { S.on = !reduced; }

  var PAL = {
    film: { dark: ["#ff8ccf", "#ffd08a", "#8ef3d1", "#8fd3ff", "#a393ff", "#ff8ccf"], light: ["#d02d84", "#c26f00", "#0b8663", "#1c70b0", "#5842d8", "#d02d84"] },
    dusk: { dark: ["#ff6fb5", "#ff9f6b", "#ffd08a", "#c58bff", "#6b5bff", "#ff6fb5"], light: ["#c2185b", "#e0602c", "#b07800", "#8a3fd1", "#3f2fc4", "#c2185b"] },
    mono: { dark: ["#ffffff", "#8e8aa8", "#ffffff", "#5b5775", "#ffffff", "#ffffff"], light: ["#17132a", "#6c6488", "#17132a", "#a8a2c0", "#17132a", "#17132a"] }
  };

  function isLight() {
    var t = document.documentElement.getAttribute("data-theme");
    if (t) return t === "light";
    return window.matchMedia("(prefers-color-scheme: light)").matches;
  }
  function hexA(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a + ")";
  }

  function makeSprite(stops, light, rot) {
    var c = document.createElement("canvas");
    c.width = c.height = SPR;
    var g = c.getContext("2d");
    var cx = SPR / 2, r = SPR / 2 - 3;
    // a faint film tint inside, stronger towards the wall
    var rg = g.createRadialGradient(cx, cx, r * 0.15, cx, cx, r);
    rg.addColorStop(0, "rgba(255,255,255,0)");
    rg.addColorStop(0.7, hexA(stops[(rot + 2) % 5], light ? 0.05 : 0.04));
    rg.addColorStop(1, hexA(stops[(rot + 3) % 5], light ? 0.22 : 0.2));
    g.fillStyle = rg;
    g.beginPath(); g.arc(cx, cx, r, 0, TAU); g.fill();
    // the iridescent wall
    var grad;
    if (g.createConicGradient) {
      grad = g.createConicGradient(rot * 1.1, cx, cx);
      for (var i = 0; i < stops.length; i++) grad.addColorStop(i / (stops.length - 1), stops[i]);
    } else {
      grad = g.createLinearGradient(0, 0, SPR, SPR);
      for (var j = 0; j < stops.length; j++) grad.addColorStop(j / (stops.length - 1), stops[j]);
    }
    g.lineWidth = r * 0.075;
    g.strokeStyle = grad;
    g.globalAlpha = light ? 0.9 : 0.8;
    g.beginPath(); g.arc(cx, cx, r - g.lineWidth / 2, 0, TAU); g.stroke();
    g.globalAlpha = light ? 0.35 : 0.55;
    g.lineWidth = 1;
    g.strokeStyle = light ? "rgba(23,19,42,0.5)" : "rgba(255,255,255,0.7)";
    g.beginPath(); g.arc(cx, cx, r - 0.5, 0, TAU); g.stroke();
    // highlights
    g.globalAlpha = 1;
    var hx = cx - r * 0.38, hy = cx - r * 0.42;
    var hg = g.createRadialGradient(hx, hy, 0, hx, hy, r * 0.34);
    hg.addColorStop(0, "rgba(255,255,255,0.95)");
    hg.addColorStop(0.4, "rgba(255,255,255,0.35)");
    hg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = hg;
    g.beginPath(); g.ellipse(hx, hy, r * 0.32, r * 0.2, -0.75, 0, TAU); g.fill();
    g.fillStyle = "rgba(255,255,255,0.5)";
    g.beginPath(); g.ellipse(cx + r * 0.46, cx + r * 0.5, r * 0.07, r * 0.045, -0.75, 0, TAU); g.fill();
    return c;
  }
  function spriteSet() {
    var key = S.palette + (isLight() ? "-l" : "-d");
    if (!sprites[key]) {
      var stops = PAL[S.palette][isLight() ? "light" : "dark"];
      sprites[key] = [];
      for (var i = 0; i < VARIANTS; i++) sprites[key].push(makeSprite(stops, isLight(), i));
    }
    return sprites[key];
  }
  function dropColor() {
    var stops = PAL[S.palette][isLight() ? "light" : "dark"];
    return stops[(Math.random() * 5) | 0];
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth || window.innerWidth; H = cv.clientHeight || window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function rand(a, b) { return a + Math.random() * (b - a); }

  function spawn(x, y, vx, vy, big) {
    var max = Math.round(110 * S.amount);
    if (bubbles.length >= max) bubbles.shift();
    var set = spriteSet();
    var r = (big ? rand(14, 40) : 3 + Math.pow(Math.random(), 2.1) * 22) * S.size;
    bubbles.push({
      x: x, y: y, vx: vx, vy: vy, r: r,
      age: 0, life: rand(2.6, 6.4) * (big ? 1.3 : 1),
      rot: rand(0, TAU), vr: rand(-0.012, 0.012),
      spr: set[(Math.random() * set.length) | 0],
      wob: rand(0.02, 0.06), ph: rand(0, TAU)
    });
    kick();
  }

  function burstAt(b, byUser) {
    var n = 7 + ((b.r / 5) | 0);
    for (var i = 0; i < n; i++) {
      var a = (i / n) * TAU + rand(-0.2, 0.2), sp = rand(1.2, 2.8) * Math.min(2, 0.6 + b.r / 18);
      drops.push({ x: b.x + Math.cos(a) * b.r, y: b.y + Math.sin(a) * b.r, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, age: 0, life: rand(0.25, 0.5), s: rand(0.8, 1.8), c: dropColor(), ring: false });
    }
    drops.push({ x: b.x, y: b.y, r: b.r, age: 0, life: 0.3, ring: true, c: dropColor() });
    if (byUser) {
      popped++;
      try { localStorage.setItem("dt-popped", String(popped)); } catch (e) {}
      document.dispatchEvent(new CustomEvent("dt-pop", { detail: popped }));
    }
    kick();
  }

  function popIndex(i, byUser) {
    var b = bubbles[i];
    bubbles.splice(i, 1);
    burstAt(b, byUser);
  }

  // ---------- input ----------
  var px = -1, py = -1, pvx = 0, pvy = 0, acc = 0, lastMove = 0;
  function onMove(x, y) {
    var now = performance.now();
    if (px < 0) { px = x; py = y; lastMove = now; return; }
    var dx = x - px, dy = y - py, dt = Math.max(8, now - lastMove);
    pvx = dx / dt * 16; pvy = dy / dt * 16;
    var d = Math.sqrt(dx * dx + dy * dy);
    px = x; py = y; lastMove = now;
    // sweep: older bubbles pop when the cursor passes through them
    for (var i = bubbles.length - 1; i >= 0; i--) {
      var b = bubbles[i];
      if (b.age < 0.75) continue;
      var ex = b.x - x, ey = b.y - y;
      if (ex * ex + ey * ey < b.r * b.r * 0.8) popIndex(i, true);
    }
    if (!S.on || reduced) return;
    acc += d;
    var every = 26 / S.amount;
    var guard = 0;
    while (acc > every && guard++ < 6) {
      acc -= every;
      spawn(x + rand(-5, 5), y + rand(-5, 5), pvx * 0.12 + rand(-0.35, 0.35), pvy * 0.12 - rand(0.25, 0.8), false);
    }
    if (acc > every) acc = every;
  }
  window.addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch") return;
    onMove(e.clientX, e.clientY);
  }, { passive: true });
  window.addEventListener("touchmove", function (e) {
    var t = e.touches[0];
    if (t) onMove(t.clientX, t.clientY);
  }, { passive: true });
  window.addEventListener("touchend", function () { px = -1; }, { passive: true });

  // clicks pop whatever sits under the pointer (links and buttons still work as usual)
  window.addEventListener("pointerdown", function (e) {
    var hit = false;
    for (var i = bubbles.length - 1; i >= 0; i--) {
      var b = bubbles[i], ex = b.x - e.clientX, ey = b.y - e.clientY;
      if (ex * ex + ey * ey < (b.r + 8) * (b.r + 8)) { popIndex(i, true); hit = true; }
    }
    return hit;
  }, { passive: true });

  // ---------- loop ----------
  function kick() {
    if (running) return;
    running = true; last = performance.now();
    requestAnimationFrame(tick);
  }
  function tick(now) {
    var dt = Math.min(3, (now - last) / 16.67);
    last = now;
    ctx.clearRect(0, 0, W, H);
    var wind = S.wind * 0.02;
    for (var i = bubbles.length - 1; i >= 0; i--) {
      var b = bubbles[i];
      b.age += dt / 60;
      if (b.age > b.life || b.y < -60 || b.x < -80 || b.x > W + 80) {
        if (b.age > b.life && b.y > -20) popIndex(i, false); else bubbles.splice(i, 1);
        continue;
      }
      b.vy -= 0.011 * dt;
      b.vx += (wind + Math.sin(b.age * 2.1 + b.ph) * 0.012) * dt;
      b.vx *= Math.pow(0.985, dt); b.vy *= Math.pow(0.985, dt);
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.rot += b.vr * dt;
      var grow = b.age < 0.22 ? 0.35 + (b.age / 0.22) * 0.65 : 1;
      var fade = b.life - b.age < 0.3 ? Math.max(0.2, (b.life - b.age) / 0.3) : 1;
      var w = Math.sin(b.age * 5.5 + b.ph) * b.wob;
      var rr = b.r * grow;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.scale(1 + w, 1 - w);
      ctx.drawImage(b.spr, -rr, -rr, rr * 2, rr * 2);
      ctx.restore();
    }
    for (var j = drops.length - 1; j >= 0; j--) {
      var d = drops[j];
      d.age += dt / 60;
      if (d.age > d.life) { drops.splice(j, 1); continue; }
      var k = 1 - d.age / d.life;
      if (d.ring) {
        ctx.globalAlpha = k * 0.5;
        ctx.strokeStyle = d.c; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r * (1 + (1 - k) * 0.5), 0, TAU); ctx.stroke();
      } else {
        d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 0.08 * dt;
        ctx.globalAlpha = k;
        ctx.fillStyle = d.c;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.s * k + 0.3, 0, TAU); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    if (bubbles.length || drops.length) requestAnimationFrame(tick);
    else { running = false; ctx.clearRect(0, 0, W, H); }
  }

  window.addEventListener("resize", resize);
  document.addEventListener("dt-theme", function () { /* sprites are keyed by theme; new ones pick it up */ });
  resize();

  // ---------- public ----------
  window.DTBubbles = {
    get on() { return S.on; },
    get popped() { return popped; },
    toggle: function (on) {
      S.on = typeof on === "boolean" ? on : !S.on;
      try { localStorage.setItem("dt-bubbles", S.on ? "on" : "off"); } catch (e) {}
      if (!S.on) { bubbles.length = 0; }
      return S.on;
    },
    set: function (o) {
      for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) S[k] = o[k];
    },
    blow: function (x, y, n) {
      if (reduced) return;
      n = n || 24;
      for (var i = 0; i < n; i++) {
        var a = rand(-Math.PI, 0), sp = rand(0.8, 3.2);
        spawn(x + rand(-8, 8), y + rand(-8, 8), Math.cos(a) * sp, Math.sin(a) * sp - 0.6, Math.random() < 0.25);
      }
    },
    burst: function (x, y, R) {
      var n = reduced ? 0 : 46;
      for (var i = 0; i < n; i++) {
        var a = (i / n) * TAU, sp = rand(2, 5.5);
        drops.push({ x: x + Math.cos(a) * R, y: y + Math.sin(a) * R, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, age: 0, life: rand(0.4, 0.9), s: rand(1.2, 2.8), c: dropColor(), ring: false });
      }
      drops.push({ x: x, y: y, r: R, age: 0, life: 0.45, ring: true, c: dropColor() });
      if (!reduced) for (var j = 0; j < 14; j++) spawn(x + rand(-R, R) * 0.6, y + rand(-R, R) * 0.6, rand(-2, 2), rand(-3, -0.5), false);
      popped++;
      try { localStorage.setItem("dt-popped", String(popped)); } catch (e) {}
      document.dispatchEvent(new CustomEvent("dt-pop", { detail: popped }));
      kick();
    },
    storm: function () {
      if (reduced) return;
      for (var i = 0; i < 220; i++) {
        (function (i) {
          setTimeout(function () {
            spawn(rand(0, W), H + rand(10, 40), rand(-1, 1), rand(-4.5, -1.5), Math.random() < 0.3);
          }, i * 12);
        })(i);
      }
    }
  };
})();
