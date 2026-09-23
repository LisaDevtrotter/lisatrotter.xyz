// www.lisatrotter.xyz: one public origin, so www sends everything to the apex.
export default {
  fetch(request) {
    const url = new URL(request.url);
    return Response.redirect("https://lisatrotter.xyz" + url.pathname + url.search, 301);
  },
};
