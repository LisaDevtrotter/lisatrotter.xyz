/* main.js · the small amount of behaviour the page needs.
   - sticky-header hairline once you scroll
   - accessible mobile menu
   - scroll-reveal for .reveal elements (respects prefers-reduced-motion)
   - active-section highlight in the nav
   - theme toggle (persisted) and the year stamp
   no dependencies, no network calls. */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- year stamp ---- */
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---- sticky header hairline ---- */
  var top = document.getElementById("top-bar");
  function onScroll() { if (top) top.classList.toggle("is-stuck", window.scrollY > 8); }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---- theme toggle ---- */
  var toggle = document.getElementById("theme-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var root = document.documentElement;
      var now = root.getAttribute("data-theme");
      var sysDark = !window.matchMedia || matchMedia("(prefers-color-scheme: dark)").matches;
      var current = now || (sysDark ? "dark" : "light");
      var next = current === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("lt-theme", next); } catch (e) {}
    });
  }

  /* ---- mobile menu ---- */
  var menuBtn = document.getElementById("menu-btn");
  var body = document.body;
  function closeMenu() {
    body.classList.remove("is-open");
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
  }
  if (menuBtn) {
    menuBtn.addEventListener("click", function () {
      var open = body.classList.toggle("is-open");
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.querySelectorAll("#menu a").forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });
  }

  /* ---- scroll reveal ---- */
  var reveals = [].slice.call(document.querySelectorAll(".reveal"));
  if (reduce || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); ro.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach(function (el) { ro.observe(el); });
  }

  /* ---- active section in nav ---- */
  var links = [].slice.call(document.querySelectorAll('.nav a[href^="#"]'));
  var map = {};
  links.forEach(function (a) {
    var id = a.getAttribute("href").slice(1);
    var sec = document.getElementById(id);
    if (sec) map[id] = a;
  });
  var ids = Object.keys(map);
  if (ids.length && "IntersectionObserver" in window) {
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          ids.forEach(function (id) { map[id].classList.toggle("is-active", id === e.target.id); });
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    ids.forEach(function (id) { so.observe(document.getElementById(id)); });
  }
})();
