type Frontends = { lastUpdatedUTC: string; data: Record<string, string[]> };

const FRONTENDS_URL = "https://cobalt.directory/api/working?type=frontends";
const FALLBACK_FRONTEND = "https://cobalt.tools";
const CACHE_TTL_SECONDS = 300;

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/" && url.search === "") {
      return new Response(LANDING_HTML, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    const sub =
      url.hostname.startsWith("music.") ? "music" :
      url.hostname.startsWith("m.") ? "m" :
      "www";
    const target = `https://${sub}.youtube.com${url.pathname}${url.search}`;
    const frontend = await pickFrontend(pickPoolKey(url));
    const redirect = `${frontend}/?u=${encodeURIComponent(target)}`;
    return Response.redirect(redirect, 302);
  },
} satisfies ExportedHandler;

function pickPoolKey(url: URL): string {
  if (url.pathname.startsWith("/shorts/")) return "youtube-shorts";
  if (url.hostname.startsWith("music.")) return "youtube-music";
  return "youtube";
}

async function pickFrontend(preferred: string): Promise<string> {
  const pool = await loadPool(preferred);
  if (pool.length === 0) return FALLBACK_FRONTEND;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

async function loadPool(preferred: string): Promise<string[]> {
  try {
    const res = await fetch(FRONTENDS_URL, {
      headers: { "user-agent": "kkyoutube-redirect (+https://kkyoutube.com)", accept: "application/json" },
      cf: { cacheTtl: CACHE_TTL_SECONDS, cacheEverything: true },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as Frontends;
    for (const key of [preferred, "youtube-shorts", "youtube-music", "youtube"]) {
      const list = json.data[key];
      if (list && list.length > 0) return list;
    }
    return [];
  } catch {
    return [];
  }
}

const BOOKMARKLET = `javascript:(()=>{const u=location.href;const r=u.replace(/^(https?:\\/\\/)(www\\.|m\\.|music\\.)?youtube\\.com/,'$1$2kkyoutube.com');if(r!==u)open(r);})();`;

const LANDING_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>kkyoutube — youtube → cobalt redirector</title>
<style>
  :root { color-scheme: light dark; }
  body { font: 16px/1.5 ui-sans-serif, system-ui, sans-serif; max-width: 38rem; margin: 3rem auto; padding: 0 1rem; }
  h1 { font-size: 1.4rem; margin: 0 0 1rem; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: color-mix(in oklab, currentColor 10%, transparent); padding: 0.1em 0.35em; border-radius: 4px; }
  .bm { display: inline-block; margin-top: .5rem; padding: .4rem .8rem; border: 1px solid currentColor; border-radius: 6px; text-decoration: none; color: inherit; }
  .bm:hover { background: color-mix(in oklab, currentColor 8%, transparent); }
  p { margin: .8rem 0; }
  hr { border: none; border-top: 1px solid color-mix(in oklab, currentColor 15%, transparent); margin: 2rem 0; }
  small { opacity: .7; }
</style>
</head>
<body>
<h1>kkyoutube — youtube → cobalt redirector</h1>
<p>On any YouTube page, replace <code>youtube.com</code> with <code>kkyoutube.com</code> in the address bar. You'll land on a random working <a href="https://cobalt.tools">cobalt</a> frontend with the URL pre-filled, ready to download.</p>
<p>Example: <code>youtube.com/watch?v=abc</code> → <code>kkyoutube.com/watch?v=abc</code></p>
<p>Or drag this to your bookmarks bar and click it on any YouTube tab:</p>
<p><a class="bm" href="${BOOKMARKLET}">kkyoutube</a></p>
<hr>
<p><small>Frontends sourced from <a href="https://cobalt.directory">cobalt.directory</a>, refreshed every few minutes. Random pick per request.</small></p>
</body>
</html>`;
