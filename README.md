# lisatrotter.xyz

the source of my site, https://lisatrotter.xyz.

a personal, professional site — Lisa Trotter, talent & partnerships across crypto, Web3 and venture.
html, css and a little javascript, written by hand. no framework, no build step, no dependencies. open index.html in a browser and the page works; the visit log and the short links need the worker.

## what's in here

- `index.html`, `css/style.css`, `js/`: the page. one stylesheet, three small scripts — `theme.js` (set the saved theme before paint), `main.js` (nav, scroll-reveal, theme toggle) and `visit.js` (reports a page view to the worker). no third-party scripts, no inline styles or scripts (the deploy sets a strict CSP).
- `worker/`: a small cloudflare worker for the short links (`/x`, `/fc`, `/mail`, `/gh`) and the visit log. it keeps no ip addresses and sets no cookies, and stores only coarse country — no region, city or network. the colophon on the page lists every field it stores.
- `tools/deploy.py` copies the public files into a temp folder and deploys them with wrangler. `tools/visits.py` reads the log.
- `brand/`: the app icon and the link preview, drawn as static html pages and captured with headless chrome (`brand/icon.html`, `brand/og.html`).

## run it locally

```
python -m http.server 8000
```

then open http://localhost:8000. the log and the short links stay on cloudflare, so locally they do nothing.

## licence

code: mit, see `LICENSE`. the words, the notes and the pictures in `img/` and `brand/` are mine, so ask before you reuse them. the fonts in `fonts/` keep their own licence (sil open font licence 1.1).
