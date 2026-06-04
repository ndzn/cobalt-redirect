type Frontends = { lastUpdatedUTC: string; data: Record<string, string[]> };

const FRONTENDS_URL = "https://cobalt.directory/api/working?type=frontends";
const FALLBACK_FRONTEND = "https://cobalt.tools";
const CACHE_TTL_SECONDS = 300;

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/favicon.ico") {
      return new Response(null, {
        status: 204,
        headers: { "cache-control": "public, max-age=86400" },
      });
    }
    if (url.pathname === "/robots.txt") {
      return new Response("User-agent: *\nDisallow: /\n", {
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "public, max-age=86400",
        },
      });
    }

    if (url.pathname === "/") {
      const u = url.searchParams.get("u");
      if (u) {
        return redirectToFrontend(u, pickPoolKeyForUrl(u));
      }
      if (url.search === "") {
        return new Response(LANDING_HTML, {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
    }

    const sub =
      url.hostname.startsWith("music.") ? "music" :
      url.hostname.startsWith("m.") ? "m" :
      "www";
    const target = `https://${sub}.youtube.com${url.pathname}${url.search}`;
    return redirectToFrontend(target, pickPoolKey(url));
  },
} satisfies ExportedHandler;

async function redirectToFrontend(target: string, poolKey: string): Promise<Response> {
  const frontend = await pickFrontend(poolKey);
  return Response.redirect(`${frontend}/?u=${encodeURIComponent(target)}`, 302);
}

function pickPoolKey(url: URL): string {
  if (url.pathname.startsWith("/shorts/")) return "youtube-shorts";
  if (url.hostname.startsWith("music.")) return "youtube-music";
  return "youtube";
}

function pickPoolKeyForUrl(u: string): string {
  try {
    const parsed = new URL(u);
    if (parsed.pathname.startsWith("/shorts/")) return "youtube-shorts";
    if (parsed.hostname === "music.youtube.com") return "youtube-music";
    return "youtube";
  } catch {
    return "youtube";
  }
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
<title>kkyoutube - youtube → cobalt redirector</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  html { color-scheme: dark; background: #000; color: #e1e1e1; }
  body { font: 14.5px/1.6 "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace; max-width: 38rem; margin: 0 auto; padding: 3rem 1.25rem; }
  ::selection { color: #000; background: #e1e1e1; }
  h1 { font-size: 24px; font-weight: 500; letter-spacing: -1px; margin: 0 0 1.25rem; }
  p { margin: .9rem 0; }
  a { color: inherit; text-underline-offset: 3px; }
  code { font-family: inherit; background: #282828; padding: 1px 4px; border-radius: 4px; }
  .bm { display: inline-flex; align-items: center; gap: 6px; margin-top: .25rem; padding: 6px 13px; background: #191919; color: #e1e1e1; border-radius: 11px; box-shadow: 0 0 0 1px rgba(255,255,255,0.05) inset; text-decoration: none; font-weight: 500; }
  .bm:hover { background: #242424; }
  hr { border: none; border-top: 1px solid rgba(255,255,255,0.045); margin: 2rem 0; }
  small { display: block; font-size: 12.5px; color: #818181; line-height: 1.4; }
  .notice { background: #191919; border-radius: 11px; padding: 1rem 1.25rem; box-shadow: 0 0 0 1px rgba(255,255,255,0.08) inset; margin: 2rem 0 1rem; }
  .notice .title { display: flex; align-items: center; gap: 8px; font-weight: 500; margin: 0 0 .4rem; }
  .notice .warn { color: #ed2236; font-size: 1.1em; }
  .notice ol { padding-inline-start: 1.5rem; margin: .5rem 0; }
  .notice li { margin: .3rem 0; }
  .notice p:last-child { margin-bottom: 0; }
</style>
</head>
<body>
<h1>kkyoutube - youtube → cobalt redirector</h1>
<p>On any YouTube page, replace <code>youtube.com</code> with <code>kkyoutube.com</code> in the address bar. You'll land on a random working <a href="https://cobalt.tools">cobalt</a> frontend with the URL pre-filled, ready to download.</p>
<p>Example: <code>youtube.com/watch?v=abc</code> → <code>kkyoutube.com/watch?v=abc</code></p>
<p>Or drag this to your bookmarks bar and click it on any YouTube tab:</p>
<p><a class="bm" href="${BOOKMARKLET}">↓ kkyoutube</a></p>
<div class="notice">
<p class="title"><span class="warn">⚠</span> important safety notice</p>
<p>kkyoutube sends you to community-run cobalt instances. they can potentially pose privacy &amp; safety risks.</p>
<p>bad instances can:</p>
<ol>
<li>redirect you away from cobalt and try to scam you.</li>
<li>log all information about your requests, store it forever, and use it to track you.</li>
<li>serve you malicious files (such as malware).</li>
<li>force you to watch ads, or make you pay for downloading.</li>
</ol>
<p>after the redirect, we can't protect you. please be mindful of what instances to use and always trust your gut. if anything feels off, leave the page and use <a href="https://cobalt.tools">cobalt.tools</a> directly instead.</p>
</div>
<hr>
<small>Frontends sourced from <a href="https://cobalt.directory">cobalt.directory</a>, refreshed every few minutes. Random pick per request.</small>
</body>
</html>`;
