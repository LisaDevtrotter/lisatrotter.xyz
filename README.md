# lisatrotter.xyz

the source of my site, https://lisatrotter.xyz.

html, css and a little javascript, written by hand. no framework, no build step, no dependencies. open index.html in a browser and the page works; the visit log and the short links need the worker.

## what's in here

- `index.html`, `css/`, `js/`: the page. the big bubble in the hero is a webgl shader (`js/soap.js`), the small ones follow your cursor (`js/bubbles.js`), and the archive pieces are seeded canvas sketches (`js/specimens.js`).
- `worker/`: a small cloudflare worker for the short links (`/x`, `/fc`, `/mail`, `/gh`) and the visit log. it keeps no ip addresses and sets no cookies. the colophon on the page lists every field it stores.
- `tools/deploy.py` copies the public files into a temp folder and deploys them with wrangler. `tools/visits.py` reads the log.
- `brand/`: the x header and the link preview, drawn as html pages and captured with headless chrome.

## run it locally

```
python -m http.server 8000
```

then open http://localhost:8000. the log and the short links stay on cloudflare, so locally they do nothing.

## licence

code: mit, see `LICENSE`. the words, the notes and the pictures in `img/` and `brand/` are mine, so ask before you reuse them. the fonts in `fonts/` keep their own licence (sil open font licence 1.1).
