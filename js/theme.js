/* runs in <head> before paint: applies the saved theme so the page never flashes.
   defaults to the system preference when nothing is saved. */
(function () {
  var root = document.documentElement;
  root.classList.remove("no-js");
  root.classList.add("js");
  try {
    var t = localStorage.getItem("lt-theme");
    if (t === "light" || t === "dark") root.setAttribute("data-theme", t);
  } catch (e) {}
})();
