/* soap.js · the big bubble in the hero.
   one fragment shader. the colours are thin-film interference: a soap wall a few
   hundred nanometres thick reflects each wavelength a little differently, and the
   wall is thinner at the top because gravity pulls the water down. */
(function () {
  "use strict";
  var canvas = document.getElementById("soap");
  if (!canvas) return;
  var gl = null;
  try {
    gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: "low-power" });
  } catch (e) {}
  if (!gl) { document.documentElement.classList.add("no-webgl"); return; }

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  var FS = [
    "precision highp float;",
    "uniform vec2 uRes;uniform float uTime;uniform vec2 uMouse;",
    "uniform vec3 uB0;uniform vec3 uB1;uniform vec3 uB2;uniform vec3 uB3;",
    "uniform float uPop;uniform float uLight;",
    "vec2 h2(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return -1.+2.*fract(sin(p)*43758.5453);}",
    "float gn(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);",
    " return mix(mix(dot(h2(i),f),dot(h2(i+vec2(1.,0.)),f-vec2(1.,0.)),u.x),mix(dot(h2(i+vec2(0.,1.)),f-vec2(0.,1.)),dot(h2(i+vec2(1.,1.)),f-vec2(1.,1.)),u.x),u.y);}",
    "float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*gn(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}",
    // reflectance of a soap film of thickness d (nm) for red, green, blue
    "vec3 film(float d){vec3 lam=vec3(640.,530.,450.);return .5-.5*cos(12.566*1.33*d/lam);}",
    "vec4 bubble(vec2 fc,vec3 b,float seed,float t,float fade){",
    " if(b.z<1.)return vec4(0.);",
    " vec2 q=(fc-b.xy)/b.z;float ang=atan(q.y,q.x);",
    " float wob=1.+.022*sin(ang*3.+t*.9+seed)+.014*sin(ang*5.-t*1.3+seed*2.);",
    " float r=length(q)/wob;",
    " if(r>1.12)return vec4(0.);",
    " float aa=1.6/b.z;",
    " float inside=1.-smoothstep(1.-aa,1.,r);",
    " float z=sqrt(max(0.,1.-r*r));",
    " float fres=pow(1.-z,2.6);",
    " float tt=t*.12+seed;float ca=cos(.7*sin(tt)),sa=sin(.7*sin(tt));",
    " vec2 sw=mat2(ca,-sa,sa,ca)*q;",
    " float n=fbm(sw*1.5+vec2(tt*.8,-tt*.5));",
    " float n2=fbm(sw*3.2-vec2(tt*.4,tt*.6)+n*1.4);",
    " vec2 m=(uMouse-b.xy)/b.z;float md=length(q-m);",
    " float d=240.+430.*(.5-.5*q.y)+330.*n+150.*n2+140.*exp(-md*md*5.)*sin(t*2.2-md*9.);",
    " vec3 col=film(d);",
    " col=clamp(mix(vec3(dot(col,vec3(.333))),col,1.45),0.,1.);",
    // the wall shows its colours mostly where it leans away from you
    " float vivid=smoothstep(.45,.95,max(col.r,max(col.g,col.b))-min(col.r,min(col.g,col.b))+.35);",
    " float a=(.02+.62*pow(1.-z,2.2))*(.35+.9*vivid)*inside;",
    " float rim=smoothstep(.955,1.,r)*inside;a+=rim*.4;",
    // reflections: a window up left (squeezed towards the rim, as reflections are) and a spot down right
    // a tall french window: one upright, three rows of panes, a little skewed
    " float sq=.35+.65*z;vec2 pr=q/sq-vec2(-.52,.5);pr.x+=pr.y*.18;",
    " float win=smoothstep(.22,.15,abs(pr.x))*smoothstep(.4,.32,abs(pr.y));",
    " win*=smoothstep(.01,.035,abs(pr.x))*smoothstep(.01,.035,abs(pr.y-.12))*smoothstep(.01,.035,abs(pr.y+.12));",
    " win*=.75+.25*sin(pr.y*9.+pr.x*4.);",
    " float hl=win*.24*(1.-fres*.7);",
    " vec2 e2=q-vec2(.46,-.5);hl+=exp(-dot(e2*vec2(9.,9.),e2*vec2(9.,9.)))*.5;",
    " hl*=inside;",
    // faint halo just outside the wall
    " float halo=exp(-max(r-1.,0.)*38.)*(1.-inside)*.12;",
    " vec3 hc=film(240.+430.*(.5-.5*q.y)+330.*n);",
    " vec3 rgb;float al;",
    // at night the film glows (premultiplied rgb above alpha adds light); by day it tints
    " if(uLight>.5){col*=.72;a*=1.3;hl*=.5;halo*=1.4;rgb=col*a+hc*halo+vec3(hl);al=a+halo+hl;}",
    " else{rgb=col*a*1.45+hc*halo*1.3+vec3(hl);al=a*.8+halo+hl;}",
    " return vec4(rgb,clamp(al,0.,1.))*fade;}",
    "vec4 over(vec4 top,vec4 bot){return top+bot*(1.-top.a);}",
    "void main(){vec2 fc=gl_FragCoord.xy;float t=uTime;",
    " vec4 c=bubble(fc,uB3,7.1,t,1.);",
    " c=over(bubble(fc,uB2,4.3,t,1.),c);",
    " c=over(bubble(fc,uB1,2.2,t,1.),c);",
    " vec3 b0=vec3(uB0.xy,uB0.z*(1.+uPop*.35));",
    " c=over(bubble(fc,b0,0.,t,1.-uPop),c);",
    " gl_FragColor=c;}"
  ].join("\n");

  function sh(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) { document.documentElement.classList.add("no-webgl"); return; }
  var prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { document.documentElement.classList.add("no-webgl"); return; }
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  var U = {};
  ["uRes", "uTime", "uMouse", "uB0", "uB1", "uB2", "uB3", "uPop", "uLight"].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

  var W = 0, H = 0, scale = 1;
  var mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
  var follow = { x: 0, y: 0 };
  var pop = 0, popping = false, grow = 1, growing = false, hold = 0;
  var t0 = performance.now(), running = false, visible = true;
  var main = { x: 0, y: 0, r: 0 };

  function isLight() {
    var t = document.documentElement.getAttribute("data-theme");
    if (t) return t === "light";
    return window.matchMedia("(prefers-color-scheme: light)").matches;
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    scale = window.DTSoapScale || Math.max(0.75, Math.min(1.3, dpr * 0.66));
    W = Math.max(1, Math.round(rect.width * scale));
    H = Math.max(1, Math.round(rect.height * scale));
    canvas.width = W; canvas.height = H;
    if (typeof measure === "function") measure();
    gl.viewport(0, 0, W, H);
    if (reduced) frame(performance.now());
  }

  // bubble layout in canvas pixels (gl y axis points up)
  function layout(t) {
    // brand pages (the x banner) place the bubbles themselves
    if (window.DTSoapLayout) return window.DTSoapLayout(W, H, t, scale);
    var narrow = W / scale < 760;
    var bx, by, br;
    if (narrow) { bx = W * 0.7; by = H * 0.64; br = Math.min(W * 0.42, H * 0.3); }
    else { bx = W * 0.71; by = H * 0.5; br = Math.min(W * 0.25, H * 0.38); }
    bx += Math.sin(t * 0.21) * br * 0.05;
    by += Math.sin(t * 0.33 + 1.3) * br * 0.06;
    return {
      b0: [bx, by, br],
      b1: [W * (narrow ? 0.16 : 0.9) + Math.sin(t * 0.4) * 12 * scale, H * (narrow ? 0.9 : 0.8) + Math.sin(t * 0.5) * 16 * scale, br * 0.2],
      b2: [W * (narrow ? 0.9 : 0.47) + Math.sin(t * 0.3 + 2.0) * 10 * scale, H * (narrow ? 0.36 : 0.16) + Math.sin(t * 0.45 + 1.0) * 14 * scale, br * 0.13],
      b3: [W * (narrow ? 0.44 : 0.58) + Math.sin(t * 0.25 + 4.0) * 20 * scale, H * (narrow ? 0.98 : 0.93) + Math.sin(t * 0.35) * 10 * scale, br * 0.08]
    };
  }

  function frame(now) {
    var t = reduced ? 8.0 : (now - t0) / 1000;
    var L = layout(t);
    // the bubble leans a little towards the cursor
    if (mouse.tx > -9000) {
      mouse.x += (mouse.tx - mouse.x) * 0.08;
      mouse.y += (mouse.ty - mouse.y) * 0.08;
      var fx = (mouse.x - L.b0[0]) * 0.05, fy = (mouse.y - L.b0[1]) * 0.05;
      follow.x += (fx - follow.x) * 0.05;
      follow.y += (fy - follow.y) * 0.05;
    }
    if (popping) { pop = Math.min(1, pop + 0.07); if (pop >= 1) { popping = false; growing = true; grow = 0; pop = 0; hold = 70; } }
    if (growing) { if (hold > 0) hold--; else { grow = Math.min(1, grow + 0.012); if (grow >= 1) growing = false; } }
    var g = growing ? Math.max(0, easeOutBack(grow)) : grow;
    L.b0[0] += follow.x;
    L.b0[1] += follow.y;
    L.b0[2] *= g;
    main.x = L.b0[0]; main.y = L.b0[1]; main.r = L.b0[2];

    gl.uniform2f(U.uRes, W, H);
    gl.uniform1f(U.uTime, t);
    gl.uniform2f(U.uMouse, mouse.x, mouse.y);
    gl.uniform3fv(U.uB0, L.b0);
    gl.uniform3fv(U.uB1, L.b1);
    gl.uniform3fv(U.uB2, L.b2);
    gl.uniform3fv(U.uB3, L.b3);
    gl.uniform1f(U.uPop, pop);
    gl.uniform1f(U.uLight, isLight() ? 1 : 0);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function easeOutBack(x) { var c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }

  function loop(now) {
    if (!running) return;
    frame(now);
    requestAnimationFrame(loop);
  }
  function start() { if (running || reduced) return; running = true; requestAnimationFrame(loop); }
  function stop() { running = false; }

  // the canvas rect only changes on scroll or resize, so measure it then
  var box = canvas.getBoundingClientRect();
  function measure() { box = canvas.getBoundingClientRect(); }
  window.addEventListener("scroll", measure, { passive: true });
  window.addEventListener("pointermove", function (e) {
    if (!visible) return;
    mouse.tx = (e.clientX - box.left) * scale;
    mouse.ty = (box.bottom - e.clientY) * scale;
    if (mouse.x < -9000) { mouse.x = mouse.tx; mouse.y = mouse.ty; }
  }, { passive: true });
  window.addEventListener("resize", resize);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) {
      visible = en[en.length - 1].isIntersecting;
      if (visible && !document.hidden) start(); else stop();
    }).observe(canvas);
  }
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop(); else if (visible) start();
  });
  document.addEventListener("dt-theme", function () { if (reduced) frame(performance.now()); });

  // public: main.js asks whether a click landed on the big bubble, and pops it
  window.DTSoap = {
    hit: function (cx, cy) {
      if (!main.r || popping || growing) return false;
      var rect = canvas.getBoundingClientRect();
      var x = (cx - rect.left) * scale, y = (rect.bottom - cy) * scale;
      var dx = x - main.x, dy = y - main.y;
      return dx * dx + dy * dy < main.r * main.r * 0.92;
    },
    pop: function () {
      if (popping || growing || !main.r) return null;
      var rect = canvas.getBoundingClientRect();
      var info = { x: rect.left + main.x / scale, y: rect.bottom - main.y / scale, r: main.r / scale };
      popping = true;
      if (reduced) { popping = false; grow = 1; frame(performance.now()); }
      return info;
    }
  };

  resize();
  start();
})();
