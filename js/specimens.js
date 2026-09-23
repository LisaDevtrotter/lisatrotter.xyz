/* specimens.js · the visual archive.
   nine small generative pieces. each one takes a seed, so a seed always gives the
   same picture. click a piece for a new seed, "save" keeps the png.
   also draws the self-portrait in the about section and the thumbnails in bookmarks.html. */
(function () {
  "use strict";
  var TAU = Math.PI * 2;
  var NIGHT = "#0c0a1a", PAPER = "#efe8d8", INK = "#1d1932";
  var IRI = ["#ff8ccf", "#ffd08a", "#8ef3d1", "#8fd3ff", "#a393ff"];

  // ---------- seeded randomness ----------
  function mulberry(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function makeNoise(rnd) {
    var p = [], perm = new Uint16Array(512), gx = [], gy = [], i;
    for (i = 0; i < 256; i++) p[i] = i;
    for (i = 255; i > 0; i--) { var j = (rnd() * (i + 1)) | 0, t = p[i]; p[i] = p[j]; p[j] = t; }
    for (i = 0; i < 512; i++) perm[i] = p[i & 255];
    for (i = 0; i < 256; i++) { var a = rnd() * TAU; gx[i] = Math.cos(a); gy[i] = Math.sin(a); }
    function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function grad(ix, iy, dx, dy) { var h = perm[ix + perm[iy]]; return gx[h] * dx + gy[h] * dy; }
    function n2(x, y) {
      var X = Math.floor(x), Y = Math.floor(y), xf = x - X, yf = y - Y;
      X &= 255; Y &= 255;
      var u = fade(xf), v = fade(yf);
      var a = grad(X, Y, xf, yf), b = grad(X + 1, Y, xf - 1, yf);
      var c = grad(X, Y + 1, xf, yf - 1), d = grad(X + 1, Y + 1, xf - 1, yf - 1);
      var top = a + u * (b - a), bot = c + u * (d - c);
      return top + v * (bot - top);
    }
    n2.fbm = function (x, y, o) {
      var s = 0, amp = 0.5, f = 1;
      for (var k = 0; k < (o || 4); k++) { s += amp * n2(x * f, y * f); f *= 2.02; amp *= 0.5; }
      return s;
    };
    return n2;
  }
  function pick(R, arr) { return arr[(R() * arr.length) | 0]; }
  function hex6(R) { return ((R() * 0xffffff) | 0).toString(16).padStart(6, "0"); }

  // thin-film colour for thickness d in nanometres (same maths as the hero shader)
  function film(d) {
    var r = 0.5 - 0.5 * Math.cos(12.566 * 1.33 * d / 640);
    var g = 0.5 - 0.5 * Math.cos(12.566 * 1.33 * d / 530);
    var b = 0.5 - 0.5 * Math.cos(12.566 * 1.33 * d / 450);
    var m = (r + g + b) / 3;
    return [clamp(m + (r - m) * 1.45), clamp(m + (g - m) * 1.45), clamp(m + (b - m) * 1.45)];
  }
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  // a soap bubble drawn with gradients (used by the soap study)
  function drawBubble(g, x, y, r, rot, alpha) {
    g.save();
    g.globalAlpha = alpha;
    var rg = g.createRadialGradient(x, y, r * 0.1, x, y, r);
    rg.addColorStop(0, "rgba(255,255,255,0)");
    rg.addColorStop(0.72, "rgba(163,147,255,0.05)");
    rg.addColorStop(1, "rgba(255,140,207,0.22)");
    g.fillStyle = rg;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.save();
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip();
    for (var k = 0; k < 3; k++) {
      var cg = g.createConicGradient ? g.createConicGradient(rot + k * 2.1, x + r * 0.2 * Math.cos(k * 2), y + r * 0.2 * Math.sin(k * 2)) : null;
      if (!cg) break;
      IRI.concat(IRI[0]).forEach(function (c, i) { cg.addColorStop(i / 5, c); });
      g.globalAlpha = alpha * 0.07;
      g.fillStyle = cg;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    g.restore();
    var wall = g.createConicGradient ? g.createConicGradient(rot, x, y) : g.createLinearGradient(x - r, y - r, x + r, y + r);
    IRI.concat(IRI[0]).forEach(function (c, i) { wall.addColorStop(i / 5, c); });
    g.globalAlpha = alpha * 0.85;
    g.strokeStyle = wall;
    g.lineWidth = Math.max(1, r * 0.05);
    g.beginPath(); g.arc(x, y, r - g.lineWidth / 2, 0, TAU); g.stroke();
    g.globalAlpha = alpha;
    var hx = x - r * 0.38, hy = y - r * 0.42;
    var hg = g.createRadialGradient(hx, hy, 0, hx, hy, r * 0.34);
    hg.addColorStop(0, "rgba(255,255,255,0.9)");
    hg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = hg;
    g.beginPath(); g.ellipse(hx, hy, r * 0.3, r * 0.18, -0.75, 0, TAU); g.fill();
    g.fillStyle = "rgba(255,255,255,0.55)";
    g.beginPath(); g.ellipse(x + r * 0.47, y + r * 0.5, r * 0.06, r * 0.04, -0.75, 0, TAU); g.fill();
    g.restore();
  }

  // ---------- the pieces ----------
  var ALGOS = {

    // after vera molnár: concentric squares, calm in one corner, restless in the other
    desordres: function (g, w, h, R) {
      g.fillStyle = PAPER; g.fillRect(0, 0, w, h);
      var n = 5 + ((R() * 4) | 0);
      var s = Math.min(w, h) / (n + 0.8);
      var cols = Math.floor(w / s), rows = Math.floor(h / s);
      var ox = (w - cols * s) / 2, oy = (h - rows * s) / 2;
      var fx = R() * cols, fy = R() * rows, maxd = Math.hypot(cols, rows);
      var red = [(R() * cols) | 0, (R() * rows) | 0];
      g.lineWidth = Math.max(0.7, s / 70); g.lineJoin = "round";
      for (var i = 0; i < cols; i++) for (var j = 0; j < rows; j++) {
        var cx = ox + (i + 0.5) * s, cy = oy + (j + 0.5) * s;
        var dis = Math.pow(Math.hypot(i + 0.5 - fx, j + 0.5 - fy) / maxd, 1.1) * 1.7;
        var k = 5 + ((R() * 4) | 0);
        g.strokeStyle = (i === red[0] && j === red[1]) ? "#d0342c" : INK;
        for (var m = 1; m <= k; m++) {
          var hs = s * 0.46 * m / k;
          g.beginPath();
          for (var c = 0; c < 4; c++) {
            var ax = cx + ((c === 0 || c === 3) ? -hs : hs) + (R() - 0.5) * dis * s * 0.2;
            var ay = cy + (c < 2 ? -hs : hs) + (R() - 0.5) * dis * s * 0.2;
            if (c === 0) g.moveTo(ax, ay); else g.lineTo(ax, ay);
          }
          g.closePath(); g.stroke();
        }
      }
    },

    // a paris skyline at dusk, ordered-dithered into seven colours, with the obvious tower.
    dusk: function (g, w, h, R) {
      var p = Math.max(2, Math.round(Math.min(w, h) / 120));
      var cw = Math.ceil(w / p), ch = Math.ceil(h / p);
      var off = document.createElement("canvas"); off.width = cw; off.height = ch;
      var o = off.getContext("2d"), img = o.createImageData(cw, ch), D = img.data;
      var PAL = [[16, 12, 42], [48, 32, 104], [104, 58, 164], [206, 88, 158], [255, 146, 122], [255, 206, 138], [255, 242, 214]];
      var BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
      var hz = 0.64 + (R() - 0.5) * 0.08, sx = 0.2 + R() * 0.6, sy = hz - 0.1 - R() * 0.1, sr = 0.08 + R() * 0.05;
      var hzp = Math.round(hz * ch);
      var roof = new Float32Array(cw), x = 0;
      while (x < cw) { var bw = 2 + ((R() * 6) | 0), bh = (0.012 + R() * 0.06) * ch; for (var q = 0; q < bw && x < cw; q++, x++) roof[x] = bh; }
      // the eiffel tower: a curved taper, two platforms, the arch at the base, a thin antenna
      var tx = Math.round((0.14 + R() * 0.72) * cw), tH = 0.46 * ch, hb = Math.max(3, cw * 0.05);
      function inTowerAt(xx, yy) {
        if (yy >= hzp || yy < hzp - tH) return false;
        var t = (hzp - yy) / tH, dx = Math.abs(xx - tx);
        if (t > 0.93) return dx < 0.6;
        var hw = hb * Math.pow(1 - t, 2.3) + 0.55;
        if (dx > hw) return (Math.abs(t - 0.2) < 0.014 || Math.abs(t - 0.44) < 0.011) && dx <= hw + 1.4;
        var ax = dx / (hb * 0.6), ay = (hzp - yy) / (tH * 0.16);
        return ax * ax + ay * ay >= 1;
      }
      var aspect = cw / ch;
      for (var yy = 0; yy < ch; yy++) for (var xx = 0; xx < cw; xx++) {
        var u = xx / cw, v = yy / ch, val;
        if (yy < hzp) {
          val = (v / hz) * 4.4;
          var d = Math.hypot((u - sx) * aspect, v - sy);
          val += Math.max(0, 1 - d / (sr * 3.2)) * 1.8;
          if (d < sr) val = 6;
        } else {
          var mv = hz - (v - hz) * 1.3;
          val = (mv / hz) * 4.4 - 0.9;
          var rip = Math.sin(yy * 1.7 + Math.sin(xx * 0.21) * 1.5);
          if (rip > 0.55) val += 0.9;
          if (Math.abs(u - sx) * aspect < sr * (0.7 + (v - hz) * 2.2) && rip > 0.1) val = 5;
        }
        // silhouettes
        var ground = hzp - roof[xx];
        var inTower = inTowerAt(xx, yy);
        if ((yy >= ground && yy < hzp) || inTower) {
          val = ((xx * 73856093 ^ yy * 19349663) >>> 0) % 23 === 0 && !inTower ? 5 : -2;
        }
        var idx = Math.floor(val + BAY[(yy & 3) * 4 + (xx & 3)] / 16 - 0.25);
        idx = idx < 0 ? 0 : idx > 6 ? 6 : idx;
        var c = PAL[idx], k = (yy * cw + xx) * 4;
        D[k] = c[0]; D[k + 1] = c[1]; D[k + 2] = c[2]; D[k + 3] = 255;
      }
      o.putImageData(img, 0, 0);
      g.imageSmoothingEnabled = false;
      g.drawImage(off, 0, 0, cw * p, ch * p);
    },

    // particles following a noise field
    flow: function (g, w, h, R, N) {
      g.fillStyle = NIGHT; g.fillRect(0, 0, w, h);
      var sc = 0.0028 + R() * 0.004, turn = 1.6 + R() * 1.4;
      var count = Math.round(w * h / 170), steps = 42, off = R() * 5;
      g.lineWidth = 0.9; g.globalAlpha = 0.55; g.lineCap = "round";
      for (var i = 0; i < count; i++) {
        var x = R() * w, y = R() * h;
        var ci = Math.floor(((x / w) + N(x * 0.003 + off, y * 0.003) * 0.8 + 1) * 2.5) % 5;
        g.strokeStyle = IRI[(ci + 5) % 5];
        g.beginPath(); g.moveTo(x, y);
        for (var s = 0; s < steps; s++) {
          var a = N.fbm(x * sc + off, y * sc, 3) * TAU * turn;
          x += Math.cos(a) * 1.7; y += Math.sin(a) * 1.7;
          g.lineTo(x, y);
        }
        g.stroke();
      }
      g.globalAlpha = 1;
    },

    // quarter circles on a grid; a few gold dots where the tiles meet
    truchet: function (g, w, h, R) {
      var pairs = [[NIGHT, "#ff8ccf"], [PAPER, INK], ["#8ef3d1", "#0c0a1a"], ["#1d1932", "#a393ff"], ["#ffd08a", "#2a1a4a"], ["#f2edff", "#5842d8"]];
      var pr = pick(R, pairs);
      g.fillStyle = pr[0]; g.fillRect(0, 0, w, h);
      var s = Math.max(10, pick(R, [16, 22, 28, 36]) * Math.min(w, h) / 380);
      g.lineWidth = s * 0.3; g.strokeStyle = pr[1]; g.lineCap = "butt";
      for (var x = 0; x < w + s; x += s) for (var y = 0; y < h + s; y += s) {
        g.beginPath();
        if (R() < 0.5) {
          g.arc(x, y, s / 2, 0, Math.PI / 2);
          g.moveTo(x + s - s / 2, y + s); g.arc(x + s, y + s, s / 2, Math.PI, Math.PI * 1.5);
        } else {
          g.arc(x + s, y, s / 2, Math.PI / 2, Math.PI);
          g.moveTo(x, y + s / 2); g.arc(x, y + s, s / 2, Math.PI * 1.5, TAU);
        }
        g.stroke();
        if (R() < 0.035) { g.fillStyle = "#ffd08a"; g.beginPath(); g.arc(x, y, s * 0.16, 0, TAU); g.fill(); }
      }
    },

    // a cluster of bubbles
    soap: function (g, w, h, R) {
      var bg = g.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
      bg.addColorStop(0, "#221b4d"); bg.addColorStop(1, NIGHT);
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 50; i++) {
        g.globalAlpha = 0.04 + R() * 0.12;
        g.fillStyle = pick(R, IRI);
        g.beginPath(); g.arc(R() * w, R() * h, 1 + R() * 6, 0, TAU); g.fill();
      }
      g.globalAlpha = 1;
      var n = 6 + ((R() * 6) | 0), m = Math.min(w, h), list = [];
      for (var k = 0; k < n; k++) list.push({ x: R() * w, y: R() * h, r: m * (0.05 + Math.pow(R(), 1.6) * 0.3) });
      list.sort(function (a, b) { return b.r - a.r; });
      list.forEach(function (b) { drawBubble(g, b.x, b.y, b.r, R() * TAU, 0.95); });
    },

    // contour lines of a place that doesn't exist, with made-up names
    contour: function (g, w, h, R, N) {
      g.fillStyle = PAPER; g.fillRect(0, 0, w, h);
      var res = Math.max(3, Math.round(Math.min(w, h) / 95));
      var cols = Math.ceil(w / res) + 1, rows = Math.ceil(h / res) + 1;
      var f = new Float32Array(cols * rows), sc = 1 / (Math.min(w, h) * 0.42), ox = R() * 50, oy = R() * 50;
      var lo = 1e9, hi = -1e9, i, j;
      for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) {
        var v = N.fbm(i * res * sc + ox, j * res * sc + oy, 4);
        f[j * cols + i] = v; if (v < lo) lo = v; if (v > hi) hi = v;
      }
      var lowP = [0, 0], highP = [0, 0];
      for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) {
        var nv = (f[j * cols + i] - lo) / (hi - lo); f[j * cols + i] = nv;
        if (nv === 0) lowP = [i * res, j * res];
        if (nv === 1) highP = [i * res, j * res];
      }
      g.fillStyle = "#d6e3ea";
      for (j = 0; j < rows - 1; j++) for (i = 0; i < cols - 1; i++) if (f[j * cols + i] < 0.16) g.fillRect(i * res, j * res, res + 0.5, res + 0.5);
      var L = 14;
      for (var l = 1; l < L; l++) {
        var lv = l / L;
        g.beginPath();
        for (j = 0; j < rows - 1; j++) for (i = 0; i < cols - 1; i++) {
          var a = f[j * cols + i], b = f[j * cols + i + 1], c = f[(j + 1) * cols + i + 1], d = f[(j + 1) * cols + i];
          var cs = (a > lv ? 8 : 0) | (b > lv ? 4 : 0) | (c > lv ? 2 : 0) | (d > lv ? 1 : 0);
          if (cs === 0 || cs === 15) continue;
          var x0 = i * res, y0 = j * res;
          var T = [x0 + res * (lv - a) / (b - a), y0], Rr = [x0 + res, y0 + res * (lv - b) / (c - b)];
          var B = [x0 + res * (lv - d) / (c - d), y0 + res], Lf = [x0, y0 + res * (lv - a) / (d - a)];
          var segs = {
            1: [Lf, B], 2: [B, Rr], 3: [Lf, Rr], 4: [T, Rr], 5: [Lf, T, B, Rr], 6: [T, B], 7: [Lf, T],
            8: [Lf, T], 9: [T, B], 10: [T, Rr, Lf, B], 11: [T, Rr], 12: [Lf, Rr], 13: [B, Rr], 14: [Lf, B]
          }[cs];
          for (var s = 0; s < segs.length; s += 2) { g.moveTo(segs[s][0], segs[s][1]); g.lineTo(segs[s + 1][0], segs[s + 1][1]); }
        }
        g.strokeStyle = l === 7 ? "#d02d84" : "rgba(29,25,50,0.62)";
        g.lineWidth = l === 7 ? 1.5 : (l % 4 === 0 ? 1.1 : 0.6);
        g.stroke();
      }
      var fs = Math.max(11, Math.min(w, h) / 26);
      g.fillStyle = INK;
      g.font = "italic " + fs + "px 'Instrument Serif', Georgia, serif";
      g.textAlign = "center";
      var wet = pick(R, ["lake of dead links", "archive bay", "cache creek", "the quiet forum"]);
      var high = pick(R, ["mount 404", "geocities heights", "lurker's ridge", "tab valley rim"]);
      g.fillText(wet, clampX(lowP[0], w, fs * 5), clampY(lowP[1], h, fs));
      g.fillText(high, clampX(highP[0], w, fs * 5), clampY(highP[1] - fs * 0.6, h, fs));
      // you are here
      var yx = w * (0.25 + R() * 0.5), yy = h * (0.25 + R() * 0.5);
      g.fillStyle = "#d02d84"; g.beginPath(); g.arc(yx, yy, 3.5, 0, TAU); g.fill();
      g.font = Math.max(9, fs * 0.62) + "px 'Space Mono', monospace"; g.textAlign = "left";
      g.fillText("you are here", yx + 8, yy + 3);
      // scale bar
      g.fillStyle = INK; g.strokeStyle = INK; g.lineWidth = 1;
      var bx = 14, by = h - 16, bl = Math.min(90, w * 0.25);
      g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + bl, by); g.moveTo(bx, by - 4); g.lineTo(bx, by + 2); g.moveTo(bx + bl, by - 4); g.lineTo(bx + bl, by + 2); g.stroke();
      g.fillText("1 tab", bx + bl + 6, by + 3);
      g.textAlign = "center"; g.fillText("N", w - 18, 22);
      g.beginPath(); g.moveTo(w - 18, 28); g.lineTo(w - 22, 40); g.lineTo(w - 14, 40); g.closePath(); g.fill();
      function clampX(v, W, m) { return Math.max(m / 2 + 6, Math.min(W - m / 2 - 6, v)); }
      function clampY(v, H, m) { return Math.max(m + 4, Math.min(H - m - 20, v)); }
    },

    // a stack of made-up blocks: number, gas used, hash
    blocks: function (g, w, h, R) {
      g.fillStyle = NIGHT; g.fillRect(0, 0, w, h);
      var pad = Math.max(10, w * 0.08), gap = Math.max(8, h * 0.028);
      var n = Math.max(4, Math.min(9, Math.round(h / (w * 0.32))));
      var bh = (h - pad * 2 - gap * (n - 1)) / n;
      var num = 24000000 + ((R() * 900000) | 0);
      var fs = Math.max(8, Math.min(12, w / 22));
      var mark = (R() * n) | 0;
      for (var i = 0; i < n; i++) {
        var y = pad + i * (bh + gap), used = 0.25 + R() * 0.75, col = IRI[(i + ((R() * 5) | 0)) % 5];
        g.strokeStyle = i === mark ? "#ff8ccf" : "rgba(242,237,255,0.28)"; g.lineWidth = i === mark ? 1.6 : 1;
        g.strokeRect(pad + 0.5, y + 0.5, w - pad * 2, bh);
        var gr = g.createLinearGradient(pad, 0, pad + (w - pad * 2) * used, 0);
        gr.addColorStop(0, col); gr.addColorStop(1, "rgba(255,255,255,0.1)");
        g.fillStyle = gr; g.globalAlpha = 0.85;
        g.fillRect(pad + 4, y + bh - Math.max(4, bh * 0.2) - 4, (w - pad * 2 - 8) * used, Math.max(4, bh * 0.2));
        g.globalAlpha = 1;
        g.fillStyle = "#f2edff"; g.font = fs + "px 'Space Mono', monospace"; g.textAlign = "left";
        g.fillText("#" + (num + i).toLocaleString("en-US"), pad + 6, y + fs + 4);
        g.fillStyle = "rgba(242,237,255,0.55)"; g.textAlign = "right";
        g.fillText("0x" + hex6(R) + "…", w - pad - 6, y + fs + 4);
        if (bh > fs * 3.2) { g.textAlign = "left"; g.fillText(((R() * 300) | 0) + " tx · " + Math.round(used * 100) + "% gas", pad + 6, y + fs * 2 + 8); }
        if (i < n - 1) {
          g.strokeStyle = "rgba(242,237,255,0.35)"; g.lineWidth = 1;
          g.beginPath(); g.moveTo(w / 2, y + bh); g.lineTo(w / 2, y + bh + gap); g.stroke();
          g.fillStyle = NIGHT; g.beginPath(); g.arc(w / 2, y + bh + gap / 2, 2.5, 0, TAU); g.fill(); g.stroke();
        }
      }
    },

    // two sets of rings, slightly apart
    moire: function (g, w, h, R) {
      g.fillStyle = "#f4efe6"; g.fillRect(0, 0, w, h);
      var sp = 4.2 + R() * 3, ax = w * (0.35 + R() * 0.3), ay = h * (0.35 + R() * 0.3);
      var bx = ax + (R() - 0.5) * w * 0.22, by = ay + (R() - 0.5) * h * 0.22;
      var maxR = Math.hypot(w, h);
      g.lineWidth = sp * 0.42;
      g.strokeStyle = "#17132a";
      for (var r = sp; r < maxR; r += sp) { g.beginPath(); g.arc(ax, ay, r, 0, TAU); g.stroke(); }
      g.strokeStyle = R() < 0.5 ? "#17132a" : "#d02d84";
      for (r = sp; r < maxR; r += sp) { g.beginPath(); g.arc(bx, by, r, 0, TAU); g.stroke(); }
    },

    // characters as weather: density from noise
    glyphs: function (g, w, h, R, N) {
      g.fillStyle = NIGHT; g.fillRect(0, 0, w, h);
      var cell = Math.max(9, Math.round(Math.min(w, h) / 30));
      var cols = Math.ceil(w / cell), rows = Math.ceil(h / cell), ox = R() * 40, oy = R() * 40;
      var ramp = [" ", ".", "·", ":", "-", "+", "*", "o", "O", "#"];
      g.font = Math.round(cell * 0.95) + "px 'Space Mono', monospace";
      g.textAlign = "center"; g.textBaseline = "middle";
      for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
        var v = clamp((N.fbm(i * 0.075 + ox, j * 0.075 + oy, 3) + 0.55) / 1.1);
        var ch = ramp[Math.min(ramp.length - 1, Math.floor(v * ramp.length))];
        if (ch === " ") continue;
        g.globalAlpha = 0.25 + v * 0.75;
        g.fillStyle = IRI[Math.floor((i / cols) * 3 + v * 4) % 5];
        g.fillText(ch, i * cell + cell / 2, j * cell + cell / 2);
      }
      g.globalAlpha = 1;
    }
  };

  // ---------- rendering ----------
  function draw(algo, canvas, seed, cssW, cssH) {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = cssW || canvas.clientWidth, h = cssH || canvas.clientHeight;
    if (!w || !h) return;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    var g = canvas.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var R = mulberry(seed), N = makeNoise(mulberry(seed ^ 0x9e3779b9));
    (ALGOS[algo] || ALGOS.flow)(g, w, h, R, N);
  }

  function newSeed() { return (Math.random() * 0xffffffff) >>> 0; }

  function setupArchive() {
    var figs = [].slice.call(document.querySelectorAll(".spec"));
    figs.forEach(function (fig, idx) {
      var cv = fig.querySelector("canvas"), frame = fig.querySelector(".spec-frame");
      var seedEl = fig.querySelector(".seed"), save = fig.querySelector(".save");
      fig._seed = newSeed();
      fig._drawn = false;
      fig._render = function () {
        draw(fig.dataset.algo, cv, fig._seed);
        seedEl.textContent = "seed " + fig._seed.toString(16).padStart(8, "0");
        fig._drawn = true; fig._w = cv.clientWidth;
      };
      frame.addEventListener("click", function () {
        fig._seed = newSeed();
        frame.animate([{ filter: "brightness(1.8) blur(3px)" }, { filter: "none" }], { duration: 420, easing: "ease-out" });
        fig._render();
      });
      frame.addEventListener("pointermove", function (e) {
        var r = frame.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        fig.style.setProperty("--ry", (x * 10).toFixed(2) + "deg");
        fig.style.setProperty("--rx", (-y * 10).toFixed(2) + "deg");
      });
      frame.addEventListener("pointerleave", function () { fig.style.setProperty("--rx", "0deg"); fig.style.setProperty("--ry", "0deg"); });
      save.addEventListener("click", function () {
        cv.toBlob(function (b) {
          if (!b) return;
          var a = document.createElement("a");
          a.href = URL.createObjectURL(b);
          a.download = "devtrotter-specimen-" + String(idx + 1).padStart(3, "0") + "-" + fig._seed.toString(16) + ".png";
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
        });
      });
    });
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (en) {
        en.forEach(function (e) { if (e.isIntersecting && !e.target._drawn) { e.target._render(); io.unobserve(e.target); } });
      }, { rootMargin: "500px 0px" });
      figs.forEach(function (f) { io.observe(f); });
    } else figs.forEach(function (f) { f._render(); });
    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        figs.forEach(function (f) { if (f._drawn && Math.abs(f.querySelector("canvas").clientWidth - f._w) > 2) f._render(); });
      }, 250);
    });
  }

  // ---------- the self-portrait: a soap bubble with a window in it ----------
  function portrait() {
    var cv = document.getElementById("portrait");
    if (!cv) return;
    cv.setAttribute("role", "img");
    var size = Math.min(560, Math.round(cv.clientWidth || 420));
    if (!size) return;
    cv.width = size; cv.height = size;
    var g = cv.getContext("2d"), img = g.createImageData(size, size), D = img.data;
    var N = makeNoise(mulberry(20231211));
    var light = document.documentElement.getAttribute("data-theme") === "light" ||
      (!document.documentElement.getAttribute("data-theme") && window.matchMedia("(prefers-color-scheme: light)").matches);
    var c = size / 2, Rr = size * 0.42;
    var wc = [-0.52, -0.52], ws = [0.2, 0.36];
    for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
      var qx = (x - c) / Rr, qy = (y - c) / Rr, r = Math.sqrt(qx * qx + qy * qy), k = (y * size + x) * 4;
      if (r > 1.06) continue;
      var inside = r < 1 ? 1 : 0;
      var edgeAA = r > 0.99 ? Math.max(0, (1.0 - r) / 0.01) : 1;
      if (!inside) {
        var halo = Math.exp(-(r - 1) * 40) * 0.1;
        var hc = film(260 + 420 * (0.5 + 0.5 * qy));
        D[k] = hc[0] * 255; D[k + 1] = hc[1] * 255; D[k + 2] = hc[2] * 255; D[k + 3] = halo * 255;
        continue;
      }
      var z = Math.sqrt(1 - r * r), fres = Math.pow(1 - z, 2.6);
      var n = N.fbm(qx * 1.5 + 3.1, qy * 1.5 - 1.7, 4), n2 = N.fbm(qx * 3.2 + n * 1.4, qy * 3.2 + 2.2, 3);
      var d = 240 + 430 * (0.5 + 0.5 * qy) + 330 * n + 150 * n2;
      var col = film(d);
      var a = (0.05 + 0.8 * fres) + (r > 0.94 ? (r - 0.94) / 0.06 * 0.35 : 0);
      if (light) { col = [col[0] * 0.72, col[1] * 0.72, col[2] * 0.72]; a *= 1.25; }
      // the window: squeezed towards the rim the way reflections are
      var sq = 0.35 + 0.65 * z, px = qx / sq, py = qy / sq, hl = 0;
      if (Math.abs(px - wc[0]) < ws[0] && Math.abs(py - wc[1]) < ws[1]) {
        // a tall french window: one upright, three rows of panes
        var mull = Math.abs(px - wc[0]) < 0.02 || Math.abs(py - wc[1] - 0.11) < 0.018 || Math.abs(py - wc[1] + 0.11) < 0.018;
        var framed = Math.abs(px - wc[0]) > ws[0] - 0.025 || Math.abs(py - wc[1]) > ws[1] - 0.025;
        if (!mull && !framed) hl = (light ? 0.35 : 0.5) * (1 - fres * 0.6);
      }
      var ex = qx - 0.46, ey = qy - 0.52; hl += Math.exp(-(ex * ex + ey * ey) * 80) * 0.5;
      a = Math.min(1, a) * edgeAA; hl *= edgeAA;
      var al = Math.min(1, a + hl);
      if (al <= 0) continue;
      D[k] = Math.min(255, (col[0] * a + hl) / al * 255);
      D[k + 1] = Math.min(255, (col[1] * a + hl) / al * 255);
      D[k + 2] = Math.min(255, (col[2] * a + hl) / al * 255);
      D[k + 3] = al * 255;
    }
    g.putImageData(img, 0, 0);
  }

  function init() {
    setupArchive();
    portrait();
    // the per-pixel portrait is heavy: redraw after the theme switch settles, and only when it is close
    var pcv = document.getElementById("portrait"), dirty = false, near = false;
    if (pcv && "IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        near = en[en.length - 1].isIntersecting;
        if (near && dirty) { dirty = false; setTimeout(portrait, 0); }
      }, { rootMargin: "400px 0px" }).observe(pcv);
    }
    document.addEventListener("dt-theme", function () {
      if (near) setTimeout(portrait, 120); else dirty = true;
    });
  }
  window.DTSpecimens = { draw: draw, algos: Object.keys(ALGOS) };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(init, init);
})();
