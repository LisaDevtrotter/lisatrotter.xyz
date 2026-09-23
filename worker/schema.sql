-- visit log for lisatrotter.xyz (cloudflare d1 "lisatrotter-visits"). one row per page view that a browser
-- actually showed (js/visit.js reports it). no ip address or anything derived from one, no cookies,
-- no full user-agent. rows older than 90 days are deleted by the worker's nightly cron.
CREATE TABLE IF NOT EXISTS visits (
  id       TEXT PRIMARY KEY,          -- random per page view, made up by the page, ties hit and engagement together
  ts       TEXT NOT NULL,             -- utc, 'YYYY-MM-DD HH:MM:SS'
  path     TEXT NOT NULL,
  via      TEXT,                      -- channel tag from a short link: x, fc, mail, gh
  ref      TEXT,                      -- referrer host only
  country  TEXT,
  region   TEXT,
  city     TEXT,
  asn      INTEGER,
  org      TEXT,                      -- as organisation (provider or company network)
  device   TEXT,                      -- browser family and os, e.g. 'chrome · windows'; no versions
  lang     TEXT,                      -- primary accept-language tag
  bot      INTEGER NOT NULL DEFAULT 0,
  secs     INTEGER,                   -- visible seconds on the page, capped at 3600
  depth    INTEGER,                   -- deepest point reached, 0..1000 "metres" like the site's gauge
  seen     TEXT                       -- sections that crossed the middle of the screen, comma separated
);
CREATE INDEX IF NOT EXISTS visits_ts ON visits (ts);
