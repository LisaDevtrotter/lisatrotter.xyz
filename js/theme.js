/* runs in <head> before paint: picks the saved theme so the page never flashes */
(function () {
  try {
    var t = localStorage.getItem("dt-theme");
    if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
  } catch (e) {}
  document.documentElement.classList.add("js");
})();
